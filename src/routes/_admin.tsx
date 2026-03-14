
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppSidebar } from "#/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/_admin")({
	component: RouteComponent,
	beforeLoad: async () => {
		const { data: session } = await authClient.getSession();
		if (!session) {
			throw redirect({ to: "/auth/signin" });
		}
		if (!session.user.role || session.user.role !== "admin") {
			// Display a message or redirect to a "Not Authorized" page
			throw redirect({ to: "/not_authorized" });
		}
		return { user: session?.user };
	},
});

function RouteComponent() {
	
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<Outlet />
			</SidebarInset>
		</SidebarProvider>
	);
}
