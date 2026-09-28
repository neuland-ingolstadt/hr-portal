/** Directory cache invalidation registry - avoids cycles between domain modules. */

type Invalidator = () => void;

const invalidators: Invalidator[] = [];

export function onDirectoryInvalidate(fn: Invalidator): void {
	invalidators.push(fn);
}

/** Drop in-memory Authentik directory snapshots after mutations. */
export function invalidateDirectoryCache(): void {
	for (const fn of invalidators) fn();
}
