import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { type SubmitEvent, useState } from "react";
import { toast } from "sonner";
import placeholder from "#/assets/placeholder.svg";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { authClient } from "#/lib/auth-client";
import { cn } from "#/lib/utils";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "./ui/input-otp";
import { Spinner } from "./ui/spinner";

export function SignupForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);

	const passwordError =
		password.length > 0 && password.length < 8
			? "Password must be at least 8 characters long."
			: undefined;
	const confirmPasswordError =
		confirmPassword.length > 0 && password !== confirmPassword
			? "Passwords do not match."
			: undefined;
	const isPasswordValid = password.length >= 8 && password === confirmPassword;
	const passwordInputType = showPassword ? "text" : "password";
	const [isLoading, setIsLoading] = useState(false);

	const [showOTPDialog, setShowOTPDialog] = useState(false);
	const [otpValue, setOtpValue] = useState("");
	const [email, setEmail] = useState("");
	const handleVerifyOtp = useMutation({
		mutationFn: async () => {
			const result = await authClient.emailOtp.verifyEmail({
				email,
				otp: otpValue,
			});
			return result;
		},
		onSuccess: () => {
			navigate({ to: "/auth/signin" });
			toast.success("Email verified successfully! You can now log in.");
			setShowOTPDialog(false);
		},
		onError: (error) => {
			toast.error("Invalid OTP. Please try again.");
			console.error("OTP verification error:", error);
		},
	});

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		if (isPasswordValid) {
			const email = event.currentTarget.email.value;
			const username = event.currentTarget.username.value;
			authClient.signUp.email(
				{
					email,
					password,
					name: username,
					// callbackURL: "http://localhost:5173/auth/signin",
				},
				{
					onRequest: () => {
						setIsLoading(true);
					},
					onSuccess: () => {
						toast.success(
							"Signup successful! Please check your email to verify your account.",
						);
						setIsLoading(false);
						setShowOTPDialog(true);
					},
					onError: (error) => {
						toast.error("Signup failed. Please try again.");
						// Handle signup error, e.g., display an error message
						console.error("Signup error:", error);
						setIsLoading(false);
					},
				},
			);
		}

		event.preventDefault();
	}

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card className="overflow-hidden p-0">
				<CardContent className="grid p-0 md:grid-cols-2">
					<form className="p-6 md:p-8" onSubmit={handleSubmit}>
						<FieldGroup>
							<div className="flex flex-col items-center gap-2 text-center">
								<h1 className="text-2xl font-bold">Create your account</h1>
								<p className="text-sm text-balance text-muted-foreground">
									Enter your email below to create your account
								</p>
							</div>
							<Field>
								<FieldLabel htmlFor="username">Name</FieldLabel>
								<Input
									id="username"
									type="text"
									placeholder="John Doe"
									required
								/>
								<FieldDescription>
									Please enter your full name.
								</FieldDescription>
							</Field>
							<Field>
								<FieldLabel htmlFor="email">Email</FieldLabel>
								<Input
									id="email"
									type="email"
									placeholder="m@example.com"
									required
									value={email}
									onChange={(event) => setEmail(event.target.value)}
								/>
								<FieldDescription>
									We&apos;ll use this to contact you. We will not share your
									email with anyone else.
								</FieldDescription>
							</Field>
							<Field
								data-invalid={Boolean(passwordError || confirmPasswordError)}
							>
								<Field className="grid grid-cols-2 gap-2">
									<Field data-invalid={Boolean(passwordError)}>
										<FieldLabel htmlFor="password">Password</FieldLabel>
										<div className="relative">
											<Input
												id="password"
												type={passwordInputType}
												value={password}
												onChange={(event) => setPassword(event.target.value)}
												minLength={8}
												aria-invalid={Boolean(passwordError)}
												className="pr-10"
												required
											/>
											<Button
												aria-label={
													showPassword ? "Hide passwords" : "Show passwords"
												}
												className="absolute top-0 right-0"
												size="icon"
												type="button"
												variant="ghost"
												onClick={() => setShowPassword((value) => !value)}
											>
												{showPassword ? (
													<EyeOff aria-hidden="true" />
												) : (
													<Eye aria-hidden="true" />
												)}
											</Button>
										</div>
										<FieldError
											errors={
												passwordError ? [{ message: passwordError }] : undefined
											}
										/>
									</Field>
									<Field data-invalid={Boolean(confirmPasswordError)}>
										<FieldLabel htmlFor="confirm-password">
											Confirm Password
										</FieldLabel>
										<div className="relative">
											<Input
												id="confirm-password"
												type={passwordInputType}
												value={confirmPassword}
												onChange={(event) =>
													setConfirmPassword(event.target.value)
												}
												minLength={8}
												aria-invalid={Boolean(confirmPasswordError)}
												className="pr-10"
												required
											/>
											<Button
												aria-label={
													showPassword ? "Hide passwords" : "Show passwords"
												}
												className="absolute top-0 right-0"
												size="icon"
												type="button"
												variant="ghost"
												onClick={() => setShowPassword((value) => !value)}
											>
												{showPassword ? (
													<EyeOff aria-hidden="true" />
												) : (
													<Eye aria-hidden="true" />
												)}
											</Button>
										</div>
										<FieldError
											errors={
												confirmPasswordError
													? [{ message: confirmPasswordError }]
													: undefined
											}
										/>
									</Field>
								</Field>
							</Field>
							<Field>
								<Button disabled={!isPasswordValid || isLoading} type="submit">
									{isLoading && <Spinner data-icon="inline-start" />}
									Create Account
								</Button>
							</Field>
							{/* <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
								Or continue with
							</FieldSeparator>
							<Field className="grid grid-cols-3 gap-4">
								<Button variant="outline" type="button">
									<svg
										aria-hidden="true"
										focusable="false"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
									>
										<path
											d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
											fill="currentColor"
										/>
									</svg>
									<span className="sr-only">Sign up with Apple</span>
								</Button>
								<Button variant="outline" type="button">
									<svg
										aria-hidden="true"
										focusable="false"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
									>
										<path
											d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
											fill="currentColor"
										/>
									</svg>
									<span className="sr-only">Sign up with Google</span>
								</Button>
								<Button variant="outline" type="button">
									<svg
										aria-hidden="true"
										focusable="false"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
									>
										<path
											d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z"
											fill="currentColor"
										/>
									</svg>
									<span className="sr-only">Sign up with Meta</span>
								</Button>
							</Field> */}
							<FieldDescription className="text-center">
								Already have an account? <Link to="/auth/signin">Sign in</Link>
							</FieldDescription>
						</FieldGroup>
					</form>
					<div className="relative hidden bg-muted md:block">
						<img
							src={placeholder}
							alt="Signup illustration"
							className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.6]"
						/>
					</div>
				</CardContent>
			</Card>
			<FieldDescription className="px-6 text-center">
				By clicking continue, you agree to our{" "}
				<Link to="/about">Terms of Service</Link> and{" "}
				<Link to="/about">Privacy Policy</Link>.
			</FieldDescription>
			<Dialog open={showOTPDialog}>
				<DialogContent className="mx-auto w-[335px]" showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Verify your login</DialogTitle>
						<DialogDescription>
							Enter the verification code we sent to your email address:{" "}
							<span className="font-medium">{email}</span>.
						</DialogDescription>
					</DialogHeader>
					<Field className="flex flex-col items-center gap-4 py-4">
						<div className="flex items-center justify-between">
							<FieldLabel htmlFor="otp-verification">
								Verification code
							</FieldLabel>
						</div>
						<InputOTP
							maxLength={6}
							id="otp-verification"
							required
							value={otpValue}
							onChange={(value) => setOtpValue(value)}
						>
							<InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
								<InputOTPSlot index={0} />
								<InputOTPSlot index={1} />
								<InputOTPSlot index={2} />
							</InputOTPGroup>
							<InputOTPSeparator className="mx-2" />
							<InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
								<InputOTPSlot index={3} />
								<InputOTPSlot index={4} />
								<InputOTPSlot index={5} />
							</InputOTPGroup>
						</InputOTP>
					</Field>
					<DialogFooter>
						<Field>
							<Button
								type="submit"
								className="w-full"
								onClick={() => handleVerifyOtp.mutate()}
								disabled={otpValue.length !== 6 || handleVerifyOtp.isPending}
							>
								{handleVerifyOtp.isPending && (
									<Spinner data-icon="inline-start" />
								)}
								Verify
							</Button>
						</Field>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
