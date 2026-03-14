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
