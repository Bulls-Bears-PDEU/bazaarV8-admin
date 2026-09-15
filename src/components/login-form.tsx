import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { type SubmitEvent, useState } from "react";
import { toast } from "sonner";
import { AuthLayout } from "#/components/auth-layout";
import { Button } from "#/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { authClient } from "#/lib/auth-client";
import { Spinner } from "./ui/spinner";

export function LoginForm() {
	const navigate = useNavigate();
	const [showPassword, setShowPassword] = useState(false);
	const passwordInputType = showPassword ? "text" : "password";
	const handleSignin = useMutation({
		mutationFn: async (e: SubmitEvent<HTMLFormElement>) => {
			e.preventDefault();
			return authClient.signIn.email({
				email: e.target.email.value,
				password: e.target.password.value,
			});
		},
		onSuccess: (data) => {
			// Showing the error used to be followed by navigating anyway.
			if (data.error) {
				toast.error(data.error.message || "Login failed. Please check your credentials and try again.");
				return;
			}
			if (data.data?.redirect) {
				navigate({ to: data.data.redirect as unknown as string });
			} else {
				navigate({ to: "/market" });
			}
		},
		onError: (error) => {
			toast.error("Login failed. Please check your credentials and try again.");
			console.error("Login failed:", error);
		},
	});
	return (
		<AuthLayout>
			<form onSubmit={handleSignin.mutate}>
				<div className="flex flex-col gap-6">
					<div className="flex flex-col items-center gap-2 text-center">
						<h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
						<p className="text-sm text-balance text-muted-foreground">
							Sign in with an organiser account to run the market.
						</p>
					</div>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="email">Email</FieldLabel>
							<Input id="email" type="email" autoComplete="email" placeholder="you@example.com" required />
						</Field>
						<Field>
							<div className="flex items-center justify-between">
								<FieldLabel htmlFor="password">Password</FieldLabel>
								<Link
									to="/auth/resetpassword"
									className="text-sm text-muted-foreground hover:text-foreground hover:underline"
								>
									Forgot your password?
								</Link>
							</div>
							<div className="relative">
								<Input
									id="password"
									type={passwordInputType}
									autoComplete="current-password"
									className="pr-10"
									required
								/>
								<Button
									aria-label={showPassword ? "Hide password" : "Show password"}
									className="absolute top-0 right-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
									type="button"
									variant="ghost"
									onClick={() => setShowPassword((value) => !value)}
								>
									{showPassword ? (
										<EyeOff className="h-4 w-4" aria-hidden="true" />
									) : (
										<Eye className="h-4 w-4" aria-hidden="true" />
									)}
								</Button>
							</div>
						</Field>
						<Field>
							<Button type="submit" className="w-full" disabled={handleSignin.isPending}>
								{handleSignin.isPending && <Spinner className="mr-2" data-icon="inline-start" />}
								Sign in
							</Button>
						</Field>
					</FieldGroup>
					<div className="text-center text-sm">
						Need an organiser account?{" "}
						<Link to="/auth/signup" className="underline hover:text-primary">
							Create one
						</Link>
					</div>
				</div>
			</form>
		</AuthLayout>
	);
}
