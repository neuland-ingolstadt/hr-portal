/** Shared createServerFn input validators (trim + throw codes). */

export function requireNonEmptyStringField<K extends string>(
	data: Record<string, unknown> | null | undefined,
	field: K,
	errorCode = "invalid_id",
): { [P in K]: string } {
	const raw = data?.[field];
	if (typeof raw !== "string" || !raw.trim()) {
		throw new Error(errorCode);
	}
	return { [field]: raw.trim() } as { [P in K]: string };
}
