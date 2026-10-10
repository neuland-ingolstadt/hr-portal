import { createServerFn } from "@tanstack/react-start";
import { requireAppAccess } from "#/lib/auth.server";
import {
	fetchMemberIdPublicKey,
	lookupMemberByUuid,
} from "#/lib/member-id/lookup.server";
import type { LookupMemberResult } from "#/lib/member-id/types";
import { tracingMiddleware } from "#/lib/server-fn-tracing";

export const getMemberIdPublicKeyFn = createServerFn({ method: "GET" })
	.middleware([tracingMiddleware])
	.handler(async (): Promise<{ publicKey: string }> => {
		await requireAppAccess();
		const publicKey = await fetchMemberIdPublicKey();
		return { publicKey };
	});

export const lookupScannedMemberFn = createServerFn({ method: "GET" })
	.middleware([tracingMiddleware])
	.validator((data: { sub: string }) => {
		if (!data?.sub || typeof data.sub !== "string" || !data.sub.trim()) {
			throw new Error("invalid_sub");
		}
		return { sub: data.sub.trim() };
	})
	.handler(async ({ data }): Promise<LookupMemberResult> => {
		await requireAppAccess();
		return lookupMemberByUuid(data.sub);
	});
