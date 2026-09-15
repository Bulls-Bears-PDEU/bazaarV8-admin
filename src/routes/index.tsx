import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { Brand } from "#/components/brand";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (session?.data?.user) {
			throw redirect({ to: "/market" });
		}
	},
});

function RouteComponent() {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-8 p-6 text-center">
			<Brand />
			<div className="flex max-w-md flex-col items-center gap-3">
				<h1 className="text-2xl font-semibold tracking-tight">The Bazaar control room</h1>
				<p className="text-sm text-balance text-muted-foreground">
					Sign in with an organiser account to steer the market, release news and manage players.
				</p>
			</div>
			<Button asChild>
				<Link to="/auth/signin">
					<LogIn data-icon="inline-start" />
					Sign in
				</Link>
			</Button>
		</div>
	);
}
