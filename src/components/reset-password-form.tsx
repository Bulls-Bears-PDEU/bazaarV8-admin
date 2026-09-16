import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, Mail, MailCheck } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import {
	AuthHeading,
	authLinkClass,
	FormAlert,
	MIN_PASSWORD_LENGTH,
	PasswordChecklist,
	PasswordField,
	PasswordStrength,
	SubmitButton,
	TextField,
} from "#/components/auth/auth-fields";
import { AuthLayout } from "#/components/auth-layout";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

/**
 * Two flows on one route: without a token, request a reset email; with one
 * (from the emailed link), set the new password.
 */
export function ResetPasswordForm({ token }: { token?: string }) {
	if (token) return <SetNewPassword token={token} />;
	return <RequestReset />;
}

function RequestReset() {
	const [email, setEmail] = useState("");
	const [sentTo, setSentTo] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const request = useMutation({
		mutationFn: () =>
			authClient.requestPasswordReset({
				email: email.trim(),
				redirectTo: `${window.location.origin}/auth/resetpassword`,
			}),
		onSuccess: (result) => {
			if (result?.error) {
				setError(result.error.message || "Could not send the reset email. Try again.");
				return;
			}
			setSentTo(email.trim());
		},
		onError: () => setError("Could not reach the server. Check your connection and try again."),
	});

	if (sentTo) {
		return (
			<AuthLayout>
				<div className="flex flex-col gap-8">
					<AuthHeading
						icon={MailCheck}
						title="Check your email"
						description={
							<>
								If an account exists for <span className="font-medium text-foreground">{sentTo}</span>, a reset
								link is on its way. It can take a few minutes, so check spam too.
							</>
						}
					/>
					<div className="flex flex-col gap-3">
						<Button asChild size="lg" className="h-11 w-full rounded-xl text-base">
							<Link to="/auth/signin">Back to sign in</Link>
						</Button>
						<Button variant="ghost" size="lg" className="h-11 w-full rounded-xl" onClick={() => setSentTo(null)}>
							Use a different email
						</Button>
					</div>
				</div>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout>
			<form
				className="flex flex-col gap-8"
				onSubmit={(event) => {
					event.preventDefault();
					if (request.isPending) return;
					setError(null);
					request.mutate();
				}}
			>
				<AuthHeading title="Reset your password" description="Enter your account's email and we will send you a link to set a new one." />
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
				</div>
				<div className="flex flex-col gap-5">
					<SubmitButton pending={request.isPending}>{request.isPending ? "Sending link…" : "Send reset link"}</SubmitButton>
					<p className="text-sm text-muted-foreground">
						Remembered it?{" "}
						<Link to="/auth/signin" className={authLinkClass}>
							Back to sign in
						</Link>
					</p>
				</div>
			</form>
		</AuthLayout>
	);
}

function SetNewPassword({ token }: { token: string }) {
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [touched, setTouched] = useState({ password: false, confirm: false });
	const [error, setError] = useState<string | null>(null);
	const passwordRef = useRef<HTMLInputElement>(null);
	const confirmRef = useRef<HTMLInputElement>(null);
	const strengthId = useId();
	const checklistId = useId();

	const tooShort = password.length < MIN_PASSWORD_LENGTH;
	const mismatch = password !== confirmPassword;

	const reset = useMutation({
		mutationFn: () => authClient.resetPassword({ newPassword: password, token }),
		onSuccess: (result) => {
			if (result?.error) {
				setError(result.error.message || "This link has expired or was already used. Request a new one.");
				return;
			}
			toast.success("Password updated. Sign in with your new password.");
			navigate({ to: "/auth/signin" });
		},
		onError: () => setError("Could not reach the server. Check your connection and try again."),
	});

	return (
		<AuthLayout>
			<form
				noValidate
				className="flex flex-col gap-8"
				onSubmit={(event) => {
					event.preventDefault();
					if (reset.isPending) return;
					setSubmitted(true);
					setError(null);
					if (tooShort) return passwordRef.current?.focus();
					if (mismatch) return confirmRef.current?.focus();
					reset.mutate();
				}}
			>
				<AuthHeading icon={KeyRound} title="Set a new password" description="Choose a password you have not used here before." />
				<div className="flex flex-col gap-5">
					<FormAlert message={error} />
					<PasswordField
						ref={passwordRef}
						label="New password"
						name="password"
						autoComplete="new-password"
						required
						minLength={MIN_PASSWORD_LENGTH}
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
						error={(touched.password || submitted) && tooShort ? `Use at least ${MIN_PASSWORD_LENGTH} characters.` : null}
						describedBy={[strengthId]}
						after={<PasswordStrength id={strengthId} password={password} />}
					/>
					<PasswordField
						ref={confirmRef}
						label="Confirm new password"
						name="confirmPassword"
						autoComplete="new-password"
						required
						value={confirmPassword}
						onChange={(event) => setConfirmPassword(event.target.value)}
						onBlur={() => setTouched((prev) => ({ ...prev, confirm: true }))}
						error={
							(touched.confirm || submitted) && confirmPassword && mismatch
								? "The passwords do not match."
								: submitted && !confirmPassword
									? "Type the password again to confirm it."
									: null
						}
						describedBy={[checklistId]}
					/>
					<PasswordChecklist id={checklistId} password={password} confirm={confirmPassword} />
				</div>
				<SubmitButton pending={reset.isPending}>{reset.isPending ? "Updating…" : "Update password"}</SubmitButton>
			</form>
		</AuthLayout>
	);
}
