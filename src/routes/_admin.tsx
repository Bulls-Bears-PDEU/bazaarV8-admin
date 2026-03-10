import { Show, SignOutButton, useUser } from "@clerk/react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppSidebar } from "#/components/app-sidebar";
import { Button } from "#/components/ui/button";
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar";

export const Route = createFileRoute("/_admin")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<Show
			fallback={
				<div>
					<span>You are not an admin</span>
					<SignOutButton>
						<Button variant="outline" className="ml-4">
							Sign Out
						</Button>
					</SignOutButton>
				</div>
			}
			when={{ role: "org:admin" }}
		>
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset>
					<Outlet />
				</SidebarInset>
			</SidebarProvider>
		</Show>
	);
}
