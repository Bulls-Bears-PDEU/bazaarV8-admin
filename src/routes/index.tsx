import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty";
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
		<Empty className="h-screen">
			<EmptyHeader>
				<EmptyTitle className="text-2xl font-bold">
					Welcome to Bazaar Admin
				</EmptyTitle>
			</EmptyHeader>
			<EmptyContent>
				<Link to="/auth/signin">
					<Button variant="default">
						<LogIn />
						Log In
					</Button>
				</Link>
			</EmptyContent>
		</Empty>
	);
}
