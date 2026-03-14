import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/market")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div> You are an admin !</div>;
}
