import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordForm } from "#/components/reset-password-form";

export const Route = createFileRoute("/auth/resetpassword")({
	component: RouteComponent,
	validateSearch: (search: Record<string, string>) => {
		const token = search.token;
		if (token && typeof token === "string") {
			return { token };
		}
		return null;
	},
});

function RouteComponent() {
	const search = Route.useSearch();
	return <ResetPasswordForm token={search?.token} />;
}
