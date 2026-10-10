/**
 * Client-safe tracing middleware for createServerFn.
 *
 * This module must stay statically importable from the client bundle (it is
 * referenced by every `*.functions.ts` via `.middleware([tracingMiddleware])`),
 * so it has no server-only imports. The OpenTelemetry implementation lives in
 * `#/lib/tracing.server` and is loaded dynamically inside `server()` - which
 * only ever executes on the server.
 */

import { createMiddleware } from "@tanstack/react-start";

export const tracingMiddleware = createMiddleware({
	type: "function",
}).server(async ({ next, method, serverFnMeta }) => {
	const { runTracedServerFn } = await import("#/lib/tracing.server");
	return runTracedServerFn({
		next,
		method,
		serverFnId: serverFnMeta.id,
		serverFnName: serverFnMeta.name,
	});
});
