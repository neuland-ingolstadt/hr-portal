import { createFileRoute } from "@tanstack/react-router";
import {
	type DashboardStats,
	HomeDashboard,
} from "#/components/dashboard/home-dashboard";
import type { PendingApplicationCountResult } from "#/lib/applications";
import { getPendingApplicationCountFn } from "#/lib/applications.functions";
import { hasElevatedAccess } from "#/lib/auth";
import { getDirectoryStatsFn } from "#/lib/members.functions";

const UNAVAILABLE_STATS: DashboardStats = {
	memberCount: null,
	ressortMemberCount: null,
	onboardingMemberCount: null,
	source: "unavailable",
};

const UNAVAILABLE_PENDING: PendingApplicationCountResult = {
	count: null,
	source: "unavailable",
};

export const Route = createFileRoute("/_app/")({
	loader: ({ context }) => {
		const elevated = hasElevatedAccess(context.user.roles);

		return {
			// Do not await — shell + greeting render immediately.
			statsPromise: getDirectoryStatsFn()
				.then(
					(directory): DashboardStats => ({
						memberCount: directory.memberCount,
						ressortMemberCount: directory.ressortMemberCount,
						onboardingMemberCount: directory.onboardingMemberCount,
						source: directory.source,
					}),
				)
				.catch((): DashboardStats => UNAVAILABLE_STATS),
			pendingCountPromise: elevated
				? getPendingApplicationCountFn().catch(
						(): PendingApplicationCountResult => UNAVAILABLE_PENDING,
					)
				: null,
		};
	},
	// Align with server SWR fresh window (5m) so navigations reuse loader data.
	staleTime: 300_000,
	preloadStaleTime: 300_000,
	component: HomePage,
});

function HomePage() {
	const { user } = Route.useRouteContext();
	const { statsPromise, pendingCountPromise } = Route.useLoaderData();

	return (
		<HomeDashboard
			user={user}
			statsPromise={statsPromise}
			pendingCountPromise={pendingCountPromise}
		/>
	);
}
