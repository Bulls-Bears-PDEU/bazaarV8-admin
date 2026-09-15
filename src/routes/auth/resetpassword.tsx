import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordForm } from "#/components/reset-password-form";

export const Route = createFileRoute("/auth/resetpassword")({
	component: RouteComponent,
	// The token is only there when arriving from the reset email.
	validateSearch: (search: Record<string, unknown>): { token?: string } =>
		typeof search.token === "string" && search.token ? { token: search.token } : {},
});

function RouteComponent() {
	const search = Route.useSearch();
	return <ResetPasswordForm token={search.token} />;
}
