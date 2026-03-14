import { createFileRoute } from "@tanstack/react-router";
import { SignupForm } from "#/components/signup-form";

export const Route = createFileRoute("/auth/signup")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex h-screen w-full items-center justify-center">
			<SignupForm className="w-[900px]" />
		</div>
	);
}
