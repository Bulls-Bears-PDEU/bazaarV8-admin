import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldX } from "lucide-react";
import { Brand } from "#/components/brand";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/not_authorized")({
	component: RouteComponent,
});

/** Signed in, but not as an admin: the same calm screen as the player app's waiting room. */
function RouteComponent() {
	const navigate = useNavigate();

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-8 p-6 text-center">
			<Brand />
			<div className="flex max-w-md flex-col items-center gap-3">
				<div className="flex size-12 items-center justify-center rounded-full bg-loss-muted">
					<ShieldX className="size-6 text-loss" />
				</div>
				<h1 className="text-2xl font-semibold tracking-tight">This account is not an organiser</h1>
				<p className="text-sm text-balance text-muted-foreground">
					The admin panel is only for organisers. Ask another organiser to give your account the admin role,
					then sign in again.
				</p>
			</div>
			<Button
				variant="outline"
				onClick={async () => {
					await authClient.signOut();
					navigate({ to: "/auth/signin" });
				}}
			>
				<LogOut data-icon="inline-start" />
				Sign in with another account
			</Button>
		</div>
	);
}
