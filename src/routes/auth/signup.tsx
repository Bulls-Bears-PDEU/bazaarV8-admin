import { SignUp } from "@clerk/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/signup")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex h-screen w-full items-center justify-center">
			<SignUp />
		</div>
	);
}
