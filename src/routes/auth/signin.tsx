import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "#/components/login-form";

export const Route = createFileRoute("/auth/signin")({
	component: RouteComponent,
});

function RouteComponent() {
	return <LoginForm />;
}
