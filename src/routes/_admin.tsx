import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AdminShell } from "#/components/admin-shell";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/_admin")({
	component: RouteComponent,
	beforeLoad: async () => {
		const { data: session } = await authClient.getSession();
		if (!session) {
			throw redirect({ to: "/auth/signin" });
		}
		if (!session.user.role || session.user.role !== "admin") {
			throw redirect({ to: "/not_authorized" });
		}
		return { user: session?.user };
	},
});

function RouteComponent() {
	return (
		<AdminShell>
			<Outlet />
		</AdminShell>
	);
}
