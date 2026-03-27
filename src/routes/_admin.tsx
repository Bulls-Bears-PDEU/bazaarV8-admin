
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppSidebar } from "#/components/app-sidebar";
import { SiteHeader } from "#/components/site-header";
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
		<div className="[--header-height:calc(--spacing(14))]">
			<SidebarProvider className="flex flex-col">
				<SiteHeader />
				<div className="flex flex-1 min-w-0">
					<AppSidebar />
					<SidebarInset className="min-w-0 overflow-hidden">
						<Outlet />
					</SidebarInset>
				</div>
			</SidebarProvider>
		</div>
	);
}
