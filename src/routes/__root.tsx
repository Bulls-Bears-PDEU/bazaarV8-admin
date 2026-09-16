import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
	createRootRoute,
	Link,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";

import "../styles.css";
import { Toaster } from "sonner";
import NProgress from "#/components/n-progress";
import { useTheme } from "#/components/theme-provider";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty";
import { Loading } from "#/components/ui/loading";
import { dismissBootSplash } from "#/lib/boot";

export const Route = createRootRoute({
	pendingComponent: () => <Loading fullScreen />,
	component: RootComponent,
	notFoundComponent: () => (
		<Empty className="h-svh">
			<EmptyHeader>
				<EmptyTitle className="text-2xl font-bold">Page not found</EmptyTitle>
				<EmptyDescription>There is nothing at this address.</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button asChild>
					<Link to="/">Back to the control room</Link>
				</Button>
			</EmptyContent>
		</Empty>
	),
});

function GlobalLoadingOverlay() {
	const routerStatus = useRouterState({ select: (state) => state.status });
	return <NProgress isAnimating={routerStatus === "pending"} />;
}

function RootComponent() {
	const { theme } = useTheme();
	// The splash held the page until this first render; it can go now.
	useEffect(dismissBootSplash, []);
	return (
		<>
			<GlobalLoadingOverlay />
			<Outlet />
			<Toaster richColors position="top-center" theme={theme} closeButton />
			<TanStackDevtools
				// Development only; clear of the header, the rail and the tab bar.
				config={{ position: "middle-right" }}
				plugins={[
					{ name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
					{ name: "React Query", render: <ReactQueryDevtoolsPanel /> },
				]}
			/>
		</>
	);
}
