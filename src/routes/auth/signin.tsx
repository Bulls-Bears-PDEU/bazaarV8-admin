import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "#/components/login-form";

export const Route = createFileRoute("/auth/signin")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex h-screen w-full items-center justify-center">
			<LoginForm className="w-[700px]" />
		</div>
	);
}
