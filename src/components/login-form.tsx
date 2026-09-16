import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AuthHeading, authLinkClass, FormAlert, PasswordField, SubmitButton, TextField } from "#/components/auth/auth-fields";
import { AuthLayout } from "#/components/auth-layout";
import { authClient } from "#/lib/auth-client";

const FALLBACK_ERROR = "That email and password do not match an account. Check both and try again.";

export function LoginForm() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const passwordRef = useRef<HTMLInputElement>(null);

	const fail = (message: string) => {
		setError(message);
		toast.error(message);
		// Keep the email; the password is usually what was wrong.
		passwordRef.current?.select();
	};

	const signIn = useMutation({
		mutationFn: () => authClient.signIn.email({ email: email.trim(), password }),
		onSuccess: (result) => {
			if (result.error) {
				fail(result.error.message || FALLBACK_ERROR);
				return;
			}
			navigate({ to: result.data?.redirect ? (result.data.redirect as unknown as string) : "/market" });
		},
		onError: (err) => {
			console.error("Sign in failed:", err);
			fail("Could not reach the server. Check your connection and try again.");
		},
	});

	return (
		<AuthLayout>
			<form
				noValidate={false}
				onSubmit={(event) => {
					event.preventDefault();
					if (signIn.isPending) return;
					setError(null);
					signIn.mutate();
				}}
				className="flex flex-col gap-8"
			>
				<AuthHeading title="Welcome back" description="Sign in with an organiser account to run the market." />

				<div className="flex flex-col gap-5">
					<FormAlert message={error} />
					<TextField
						label="Email"
						icon={Mail}
						name="email"
						type="email"
						autoComplete="email"
						inputMode="email"
						placeholder="you@example.com"
						required
						value={email}
						onChange={(event) => setEmail(event.target.value)}
					/>
					<PasswordField
						ref={passwordRef}
						label="Password"
						name="password"
						autoComplete="current-password"
						required
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						labelAside={
							<Link to="/auth/resetpassword" className={`text-sm ${authLinkClass}`}>
								Forgot password?
							</Link>
						}
					/>
				</div>

				<div className="flex flex-col gap-5">
					<SubmitButton pending={signIn.isPending}>{signIn.isPending ? "Signing in…" : "Sign in"}</SubmitButton>
					<p className="text-sm text-muted-foreground">
						Need an organiser account?{" "}
						<Link to="/auth/signup" className={authLinkClass}>
							Create one
						</Link>
					</p>
				</div>
			</form>
		</AuthLayout>
	);
}
