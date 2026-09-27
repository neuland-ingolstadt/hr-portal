import { createFileRoute } from "@tanstack/react-router";
import {
	type DashboardStats,
	HomeDashboard,
} from "#/components/dashboard/home-dashboard";
import { getDirectoryStatsFn } from "#/lib/members.functions";

const UNAVAILABLE_STATS: DashboardStats = {
	memberCount: null,
	groupCount: null,
	source: "unavailable",
};

export const Route = createFileRoute("/_app/")({
	loader: () => ({
		// Do not await — shell + greeting render immediately.
		statsPromise: getDirectoryStatsFn()
			.then(
				(directory): DashboardStats => ({
					memberCount: directory.memberCount,
					groupCount: directory.groupCount,
					source: directory.source,
				}),
			)
			.catch((): DashboardStats => UNAVAILABLE_STATS),
	}),
	staleTime: 30_000,
	preloadStaleTime: 30_000,
	component: HomePage,
});

function HomePage() {
	const { user } = Route.useRouteContext();
	const { statsPromise } = Route.useLoaderData();

	return <HomeDashboard user={user} statsPromise={statsPromise} />;
}
