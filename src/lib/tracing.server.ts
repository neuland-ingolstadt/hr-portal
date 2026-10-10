/**
 * Manual OpenTelemetry tracing (server-only, Bun-safe).
 *
 * Manual instrumentation only: @opentelemetry/api + @opentelemetry/sdk-trace-base
 * (BasicTracerProvider + BatchSpanProcessor) + @opentelemetry/exporter-trace-otlp-http.
 * No sdk-node / auto-instrumentation (they patch Node's http module and are
 * unreliable on Bun).
 *
 * GDPR: span names are server-function ids / HTTP method + fixed service labels
 * only. No user identifiers (email, UUID, names, tokens), no header capture, no
 * paths/query strings. The only inbound header read is `traceparent` (random
 * trace/span ids for W3C TraceContext continuation). Error messages are never
 * recorded - they may contain identifiers; only the error class name is kept.
 *
 * Tracing is disabled when OTEL_EXPORTER_OTLP_TRACES_ENDPOINT is unset
 * (local dev unaffected). All helpers are safe to call when disabled.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import {
	type Context,
	context,
	isValidSpanId,
	isValidTraceId,
	type Span,
	type SpanContext,
	SpanKind,
	SpanStatusCode,
	TraceFlags,
	trace,
} from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
	BasicTracerProvider,
	BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-base";

export const TRACING_SERVICE_NAME = "hr-portal";
const TRACER_NAME = "hr-portal";

/**
 * Production endpoint (Alloy OTLP/HTTP receiver). Set this value as
 * OTEL_EXPORTER_OTLP_TRACES_ENDPOINT in the deployment; no code default is
 * applied so local dev stays untraced when the env var is unset.
 */
export const DEFAULT_OTLP_TRACES_ENDPOINT =
	"http://alloy.monitoring.svc.cluster.local:4318/v1/traces";

function resolveEndpoint(): string | null {
	const raw = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim();
	return raw ? raw : null;
}

/** False in local dev (env var unset) - every helper below becomes a no-op. */
export function isTracingEnabled(): boolean {
	return resolveEndpoint() !== null;
}

let providerInitialized = false;

/**
 * Lazy-singleton tracer provider setup. Safe to call repeatedly; no-op when
 * the endpoint env var is unset. Returns whether tracing is active.
 */
export function ensureTracingInitialized(): boolean {
	if (providerInitialized) return true;
	const endpoint = resolveEndpoint();
	if (!endpoint) return false;

	const exporter = new OTLPTraceExporter({ url: endpoint });
	const provider = new BasicTracerProvider({
		resource: resourceFromAttributes({
			"service.name": TRACING_SERVICE_NAME,
		}),
		spanProcessors: [new BatchSpanProcessor(exporter)],
	});
	// Registers the tracer provider only (leaves the default context manager /
	// propagator globals untouched - propagation is handled explicitly below).
	trace.setGlobalTracerProvider(provider);
	providerInitialized = true;
	return true;
}

/**
 * AsyncLocalStorage-carried OTel context. The bare @opentelemetry/api ships a
 * no-op context manager (the async-hooks one lives in sdk-node, which we must
 * not use on Bun), so active-span tracking across `await` boundaries is kept
 * here instead. node:async_hooks is fully supported by Bun.
 */
const spanContextStorage = new AsyncLocalStorage<Context>();

function activeTracingContext(): Context {
	return spanContextStorage.getStore() ?? context.active();
}

function runWithSpanContext<T>(span: Span, fn: () => T): T {
	return spanContextStorage.run(
		trace.setSpan(activeTracingContext(), span),
		fn,
	);
}

// --- W3C TraceContext (traceparent only, no baggage/tracestate) ---------------

const TRACEPARENT_RE =
	/^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})(?:-.*)?$/i;

function parseTraceparent(header: string): SpanContext | null {
	const match = TRACEPARENT_RE.exec(header.trim());
	if (!match) return null;
	const [, , traceId, spanId, flags] = match;
	if (!traceId || !spanId || !flags) return null;
	if (!isValidTraceId(traceId) || !isValidSpanId(spanId)) return null;
	return {
		traceId: traceId.toLowerCase(),
		spanId: spanId.toLowerCase(),
		traceFlags:
			Number.parseInt(flags, 16) & 1 ? TraceFlags.SAMPLED : TraceFlags.NONE,
		isRemote: true,
	};
}

function formatTraceparent(spanContext: SpanContext): string {
	const traceFlags = (spanContext.traceFlags ?? TraceFlags.NONE) & 1;
	return `00-${spanContext.traceId}-${spanContext.spanId}-0${traceFlags}`;
}

/** Remote parent from the inbound `traceparent` header (Traefik continuation). */
async function incomingParentContext(): Promise<Context> {
	let header: string | undefined;
	try {
		// Imported lazily: `@tanstack/react-start/server` is server-only and
		// this module is dynamically imported from isomorphic middleware code.
		const { getRequestHeader } = await import("@tanstack/react-start/server");
		header = getRequestHeader("traceparent") ?? undefined;
	} catch {
		header = undefined;
	}
	if (!header) return context.active();
	const spanContext = parseTraceparent(header);
	if (!spanContext) return context.active();
	return trace.setSpanContext(context.active(), spanContext);
}

/** Outbound `traceparent` header for the given span (empty when invalid). */
function traceHeadersFor(span: Span): Record<string, string> {
	const spanContext = span.spanContext();
	if (!isValidTraceId(spanContext.traceId)) return {};
	return { traceparent: formatTraceparent(spanContext) };
}

function errorTypeName(error: unknown): string {
	return error instanceof Error ? error.name || "Error" : typeof error;
}

// --- Server-function middleware ------------------------------------------------

/**
 * Server-phase of `tracingMiddleware` (see `#/lib/server-fn-tracing`).
 * Starts one SERVER span per server function (span name = function id only),
 * continues an inbound traceparent, and carries the span for outbound helpers.
 */
export async function runTracedServerFn<T>(options: {
	next: () => Promise<T>;
	method: string;
	serverFnId: string;
	serverFnName: string;
}): Promise<T> {
	if (!isTracingEnabled() || !ensureTracingInitialized()) {
		return options.next();
	}
	const tracer = trace.getTracer(TRACER_NAME);
	const span = tracer.startSpan(
		options.serverFnId || options.serverFnName,
		{
			kind: SpanKind.SERVER,
			attributes: {
				"http.request.method": options.method,
				// Code identifier only (the span name is the opaque function id).
				"server.function.name": options.serverFnName,
			},
		},
		await incomingParentContext(),
	);
	try {
		return await runWithSpanContext(span, () => options.next());
	} catch (error) {
		// Message omitted on purpose (may contain user identifiers).
		span.setStatus({ code: SpanStatusCode.ERROR });
		span.setAttribute("error.type", errorTypeName(error));
		throw error;
	} finally {
		span.end();
	}
}

// --- Outbound spans ------------------------------------------------------------

export type TracedOutboundService = "authentik" | "easyverein" | "azure-email";

export type OutboundSpanScope = {
	/** Null when tracing is disabled - helpers must tolerate it. */
	span: Span | null;
	/** Headers to merge into the outbound request (empty when disabled). */
	traceHeaders: Record<string, string>;
};

/**
 * Runs `fn` inside a CLIENT span named `<METHOD> <service>` (method + fixed
 * service label only - never paths with IDs or query strings). The span is
 * ended and errors are flagged (type only, no message) automatically.
 */
export async function withOutboundSpan<T>(
	service: TracedOutboundService,
	method: string,
	fn: (scope: OutboundSpanScope) => Promise<T>,
): Promise<T> {
	if (!isTracingEnabled() || !ensureTracingInitialized()) {
		return fn({ span: null, traceHeaders: {} });
	}
	const tracer = trace.getTracer(TRACER_NAME);
	const parent = activeTracingContext();
	const span = tracer.startSpan(
		`${method.toUpperCase()} ${service}`,
		{
			kind: SpanKind.CLIENT,
			attributes: {
				"peer.service": service,
				"http.request.method": method.toUpperCase(),
			},
		},
		parent,
	);
	try {
		return await runWithSpanContext(span, () =>
			fn({ span, traceHeaders: traceHeadersFor(span) }),
		);
	} catch (error) {
		// Message omitted on purpose (fetch errors embed request paths/IDs).
		span.setStatus({ code: SpanStatusCode.ERROR });
		span.setAttribute("error.type", errorTypeName(error));
		throw error;
	} finally {
		span.end();
	}
}

/**
 * Merge outbound trace headers into existing fetch `init.headers`
 * (object / Headers / tuple all preserved).
 */
export function mergeTracingHeaders(
	base: HeadersInit | undefined,
	extra: Record<string, string>,
): HeadersInit | undefined {
	if (Object.keys(extra).length === 0) return base;
	if (!base) return extra;
	if (base instanceof Headers) {
		const merged = new Headers(base);
		for (const [key, value] of Object.entries(extra)) {
			merged.set(key, value);
		}
		return merged;
	}
	if (Array.isArray(base)) {
		return [...base, ...Object.entries(extra)];
	}
	return { ...base, ...extra };
}
