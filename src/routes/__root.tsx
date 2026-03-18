import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
	createRootRoute,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import "../styles.css";
import { Toaster } from "sonner";
import NProgress from "#/components/n-progress";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty";
export const Route = createRootRoute({
	component: RootComponent,
	notFoundComponent: () => (
		<Empty className="h-screen">
			<EmptyHeader>
				<EmptyTitle className="text-2xl font-bold">Page not found</EmptyTitle>
				<EmptyDescription>
					The page you are looking for does not exist.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	),
});

function GlobalLoadingOverlay() {
	const routerStatus = useRouterState({
		select: (state) => state.status,
	});
	const shouldShow = routerStatus === "pending";

	return <NProgress isAnimating={shouldShow} />;
}

function RootComponent() {
	return (
		<>
			<GlobalLoadingOverlay />
			<Outlet />
			<Toaster richColors />
			<TanStackDevtools
				config={{
					position: "bottom-right",
				}}
				plugins={[
					{
						name: "TanStack Router",
						render: <TanStackRouterDevtoolsPanel />,
					},
					{
						name: "React Query",
						render: <ReactQueryDevtoolsPanel />,
					},
				]}
			/>
		</>
	);
}
