import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, GalleryVerticalEnd } from "lucide-react";
import { type SubmitEvent, useState } from "react";
import { toast } from "sonner";
import placeholder from "#/assets/placeholder.svg";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	Field,
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
						console.error("Signup error:", error);
						setIsLoading(false);
					},
				},
			);
		}

		event.preventDefault();
	}

	return (
		<div className={cn("grid min-h-svh lg:grid-cols-2", className)} {...props}>
			<div className="flex flex-col gap-4 p-6 md:p-10">
				<div className="flex justify-center gap-2 md:justify-start">
					<Link to="/" className="flex items-center gap-2 font-medium">
						<div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
							<GalleryVerticalEnd className="size-4" />
						</div>
						Bazaar Admin
					</Link>
				</div>
				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-sm">
						<form onSubmit={handleSubmit}>
							<div className="flex flex-col gap-6">
								<div className="flex flex-col items-center gap-2 text-center">
									<h1 className="text-2xl font-semibold tracking-tight">
										Create an account
									</h1>
									<p className="text-balance text-sm text-muted-foreground">
										Enter your details below to get started
									</p>
								</div>
								<FieldGroup>
									<Field>
										<FieldLabel htmlFor="username">Name</FieldLabel>
										<Input
											id="username"
											type="text"
											placeholder="Jane Doe"
											required
										/>
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
									</Field>
									<Field
										data-invalid={Boolean(
											passwordError || confirmPasswordError,
										)}
									>
										<div className="grid gap-4 md:grid-cols-2">
											<Field data-invalid={Boolean(passwordError)}>
												<FieldLabel htmlFor="password">Password</FieldLabel>
												<div className="relative">
													<Input
														id="password"
														type={passwordInputType}
														value={password}
														onChange={(event) =>
															setPassword(event.target.value)
														}
														minLength={8}
														aria-invalid={Boolean(passwordError)}
														className="pr-10"
														required
													/>
													<Button
														aria-label={
															showPassword ? "Hide password" : "Show password"
														}
														className="absolute top-0 right-0 h-full px-3 text-muted-foreground hover:text-foreground"
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
												<FieldError
													errors={
														passwordError
															? [{ message: passwordError }]
															: undefined
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
															showPassword ? "Hide password" : "Show password"
														}
														className="absolute top-0 right-0 h-full px-3 text-muted-foreground hover:text-foreground"
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
												<FieldError
													errors={
														confirmPasswordError
															? [{ message: confirmPasswordError }]
															: undefined
													}
												/>
											</Field>
										</div>
									</Field>
									<Field>
										<Button
											className="w-full"
											disabled={!isPasswordValid || isLoading}
											type="submit"
										>
											{isLoading && (
												<Spinner className="mr-2" data-icon="inline-start" />
											)}
											Create Account
										</Button>
									</Field>
								</FieldGroup>
								<div className="mt-4 text-center text-sm">
									Already have an account?{" "}
									<Link
										to="/auth/signin"
										className="underline hover:text-primary"
									>
										Sign in
									</Link>
								</div>
								<div className="text-center text-xs text-muted-foreground">
									By clicking continue, you agree to our{" "}
									<a href="/" className="underline hover:text-primary">
										Terms of Service
									</a>{" "}
									and{" "}
									<a href="/" className="underline hover:text-primary">
										Privacy Policy
									</a>
									.
								</div>
							</div>
						</form>
					</div>
				</div>
			</div>
			<div className="relative hidden bg-muted lg:block">
				<img
					src={placeholder}
					alt="Signup visual"
					className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
				/>
				<div className="absolute top-10 right-10 text-white z-10 p-6 mix-blend-difference text-right">
					<blockquote className="space-y-2">
						<p className="text-lg font-medium opacity-80 backdrop-invert-0">
							"Streamlining our operations beautifully, end to end."
						</p>
						<footer className="text-sm">- Administrative Desk</footer>
					</blockquote>
				</div>
			</div>

			<Dialog open={showOTPDialog} onOpenChange={setShowOTPDialog}>
				<DialogContent className="mx-auto w-[335px]">
					<DialogHeader>
						<DialogTitle>Verify your email</DialogTitle>
						<DialogDescription>
							Enter the verification code we sent to your email address:{" "}
							<span className="font-medium text-foreground">{email}</span>.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col items-center gap-4 py-4">
						<InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
							<InputOTPGroup>
								<InputOTPSlot index={0} />
								<InputOTPSlot index={1} />
								<InputOTPSlot index={2} />
							</InputOTPGroup>
							<InputOTPSeparator />
							<InputOTPGroup>
								<InputOTPSlot index={3} />
								<InputOTPSlot index={4} />
								<InputOTPSlot index={5} />
							</InputOTPGroup>
						</InputOTP>
						<Button
							className="w-full mt-4"
							disabled={otpValue.length !== 6 || handleVerifyOtp.isPending}
							onClick={() => handleVerifyOtp.mutate()}
						>
							{handleVerifyOtp.isPending && (
								<Spinner className="mr-2" data-icon="inline-start" />
							)}
							Verify
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
