import { Show, SignOutButton, UserButton } from "@clerk/react";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/market")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div>
			{" "}
			You are an admin !
			<UserButton />
		</div>
	)
}
