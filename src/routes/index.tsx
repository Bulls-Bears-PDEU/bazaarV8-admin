import { Show, SignInButton, SignOutButton } from "@clerk/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty";

export const Route = createFileRoute("/")({
	component: RouteComponent,
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
				<Show when="signed-out">
					<SignInButton>
						<Button variant="default">
							<LogIn />
							Log In
						</Button>
					</SignInButton>
				</Show>
				<Show when="signed-in">
					<Button variant="outline">
						<Link to="/market">Go to dashboard</Link>
					</Button>
					<SignOutButton>
						<Button variant="destructive">
							<LogOut />
							Log out
						</Button>
					</SignOutButton>
				</Show>
			</EmptyContent>
		</Empty>
	);
}
