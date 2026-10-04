import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Mail, UserRound } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { authClient } from "#/lib/auth-client";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "./ui/input-otp";
import { Spinner } from "./ui/spinner";

export function SignupForm({ className }: { className?: string }) {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	// Errors wait until a field has been left or the form sent, not the first keystroke.
	const [touched, setTouched] = useState({ password: false, confirm: false });
	const [submitted, setSubmitted] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const passwordRef = useRef<HTMLInputElement>(null);
	const confirmRef = useRef<HTMLInputElement>(null);
	const strengthId = useId();
	const checklistId = useId();

	const tooShort = password.length < MIN_PASSWORD_LENGTH;
	const mismatch = password !== confirmPassword;
	const passwordError =
		(touched.password || submitted) && tooShort ? `Use at least ${MIN_PASSWORD_LENGTH} characters.` : null;
	const confirmError =
		(touched.confirm || submitted) && confirmPassword && mismatch
			? "The passwords do not match."
			: submitted && !confirmPassword
				? "Type the password again to confirm it."
				: null;

	const [showOTPDialog, setShowOTPDialog] = useState(false);
	const [otpValue, setOtpValue] = useState("");
	const [otpError, setOtpError] = useState<string | null>(null);
	const verifyOtp = useMutation({
		mutationFn: () => authClient.emailOtp.verifyEmail({ email: email.trim(), otp: otpValue }),
		onSuccess: (result) => {
			if (result.error) {
				setOtpError(result.error.message || "That code is not right. Check the email and try again.");
				return;
			}
			setShowOTPDialog(false);
			toast.success("Email verified. Sign in to continue.");
			navigate({ to: "/auth/signin" });
		},
		onError: () => setOtpError("Could not check the code. Check your connection and try again."),
	});

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending) return;
		setSubmitted(true);
		setFormError(null);
		if (!event.currentTarget.checkValidity() || tooShort || mismatch) {
			// Send focus to the first thing to fix.
			if (!name.trim() || !email.trim()) event.currentTarget.reportValidity();
			else if (tooShort) passwordRef.current?.focus();
			else confirmRef.current?.focus();
			return;
		}
		authClient.signUp.email(
			{ email: email.trim(), password, name: name.trim() },
			{
				onRequest: () => setPending(true),
				onSuccess: () => {
					setPending(false);
					setOtpValue("");
					setOtpError(null);
					setShowOTPDialog(true);
				},
				onError: (context) => {
					setPending(false);
					const message = context.error.message || "Could not create the account. Try again.";
					setFormError(message);
					toast.error(message);
				},
			},
		);
	}

	return (
		<AuthLayout className={className}>
			<form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
				<AuthHeading
					title="Create an organiser account"
					description="An existing admin grants organiser access once your email is verified."
				/>

				<div className="flex flex-col gap-5">
					<FormAlert message={formError} />
					<TextField
						label="Name"
						icon={UserRound}
						name="username"
						autoComplete="name"
						placeholder="Jane Doe"
						required
						value={name}
						onChange={(event) => setName(event.target.value)}
						error={submitted && !name.trim() ? "Enter your name." : null}
					/>
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
						description="We send a 6-digit code here to confirm it is yours."
						error={submitted && !email.trim() ? "Enter your email address." : null}
					/>
					<PasswordField
						ref={passwordRef}
						label="Password"
						name="password"
						autoComplete="new-password"
						required
						minLength={MIN_PASSWORD_LENGTH}
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
						error={passwordError}
						describedBy={[strengthId]}
						after={<PasswordStrength id={strengthId} password={password} />}
					/>
					<PasswordField
						ref={confirmRef}
						label="Confirm password"
						name="confirm-password"
						autoComplete="new-password"
						required
						value={confirmPassword}
						onChange={(event) => setConfirmPassword(event.target.value)}
						onBlur={() => setTouched((prev) => ({ ...prev, confirm: true }))}
						error={confirmError}
						describedBy={[checklistId]}
					/>
					<PasswordChecklist id={checklistId} password={password} confirm={confirmPassword} />
				</div>

				<div className="flex flex-col gap-5">
					<SubmitButton pending={pending}>{pending ? "Creating account…" : "Create account"}</SubmitButton>
					<p className="text-sm text-muted-foreground">
						Already have an account?{" "}
						<Link to="/auth/signin" className={authLinkClass}>
							Sign in
						</Link>
					</p>
				</div>
			</form>

			<Dialog open={showOTPDialog} onOpenChange={setShowOTPDialog}>
				<DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Verify your email</DialogTitle>
						<DialogDescription>
							Enter the 6-digit code we sent to <span className="font-medium text-foreground">{email}</span>.
						</DialogDescription>
					</DialogHeader>
					<form
						className="flex flex-col items-center gap-5 pt-2"
						onSubmit={(event) => {
							event.preventDefault();
							if (otpValue.length === 6 && !verifyOtp.isPending) {
								setOtpError(null);
								verifyOtp.mutate();
							}
						}}
					>
						<InputOTP
							maxLength={6}
							value={otpValue}
							onChange={(value) => {
								setOtpValue(value);
								setOtpError(null);
							}}
							aria-label="Verification code"
							aria-invalid={otpError ? true : undefined}
							autoFocus
						>
							<InputOTPGroup>
								<InputOTPSlot index={0} className="size-11 text-lg" />
								<InputOTPSlot index={1} className="size-11 text-lg" />
								<InputOTPSlot index={2} className="size-11 text-lg" />
							</InputOTPGroup>
							<InputOTPSeparator />
							<InputOTPGroup>
								<InputOTPSlot index={3} className="size-11 text-lg" />
								<InputOTPSlot index={4} className="size-11 text-lg" />
								<InputOTPSlot index={5} className="size-11 text-lg" />
							</InputOTPGroup>
						</InputOTP>
						<div className="w-full">
							<FormAlert message={otpError} />
						</div>
						<Button type="submit" size="lg" className="h-11 w-full rounded-xl text-base" disabled={otpValue.length !== 6}>
							{verifyOtp.isPending && <Spinner data-icon="inline-start" />}
							{verifyOtp.isPending ? "Verifying…" : "Verify email"}
						</Button>
					</form>
				</DialogContent>
			</Dialog>
		</AuthLayout>
	);
}
