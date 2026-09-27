import { createServerFn } from "@tanstack/react-start";
import type { AuditEventsResult } from "#/lib/audit";
import { listAuditEvents } from "#/lib/audit.server";
import { requireElevatedAccess } from "#/lib/auth.server";

export const listAuditEventsFn = createServerFn({ method: "GET" })
	.validator((data?: { limit?: number }) => {
		const limit =
			typeof data?.limit === "number" && Number.isFinite(data.limit)
				? data.limit
				: 100;
		return { limit };
	})
	.handler(async ({ data }): Promise<AuditEventsResult> => {
		await requireElevatedAccess();
		return listAuditEvents(data.limit);
	});
