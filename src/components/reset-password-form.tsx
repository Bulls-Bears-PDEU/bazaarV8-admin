import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	Eye,
	EyeOff,
	GalleryVerticalEnd,
	KeyRound,
	MailCheck,
} from "lucide-react";
import { type SubmitEvent, useState } from "react";
import { toast } from "sonner";
import placeholder from "#/assets/placeholder.svg";
import { Button } from "#/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { authClient } from "#/lib/auth-client";
import { cn } from "#/lib/utils";
import { Spinner } from "./ui/spinner";

export function ResetPasswordForm({
	className,
	...props
}: React.ComponentProps<"div"> & { token?: string }) {
	const navigate = useNavigate();
	const [showPassword, setShowPassword] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const passwordInputType = showPassword ? "text" : "password";

	// Instead of checking tanstack router search params strictly (which needs the route to parse it),
	// we grab from window.location.search to keep the component decoupled from strict type definitions.
	const token = props.token;
	const isSettingNewPassword = !!token;

	const handleRequestReset = useMutation({
		mutationFn: async (e: SubmitEvent<HTMLFormElement>) => {
			e.preventDefault();
			const result = await authClient.requestPasswordReset({
				email: e.target.email.value,
				redirectTo: `${window.location.origin}/auth/resetpassword`,
			});
			return result;
		},
		onSuccess: (data) => {
			if (data?.error) {
				toast.error(
					data.error.message ||
						"Failed to request password reset. Please try again.",
				);
			} else {
				setIsSubmitted(true);
				toast.success("Password reset email sent. Please check your inbox.");
			}
		},
		onError: (error) => {
			toast.error("Failed to request reset. Please try again.");
			console.error("Reset request failed:", error);
		},
	});

	const handleSetNewPassword = useMutation({
		mutationFn: async (e: SubmitEvent<HTMLFormElement>) => {
			e.preventDefault();
			const password = e.target.password.value;
			const confirmPassword = e.target.confirmPassword.value;

			if (password !== confirmPassword) {
				throw new Error("Passwords do not match");
			}

			const result = await authClient.resetPassword({
				newPassword: password,
				token: token,
			});
			return result;
		},
		onSuccess: (data) => {
			if (data?.error) {
				toast.error(
					data.error.message ||
						"Failed to reset your password. The link might be expired.",
				);
			} else {
				toast.success(
					"Password has been reset successfully. You can now log in.",
				);
				navigate({ to: "/auth/signin" });
			}
		},
		onError: (error: any) => {
			toast.error(
				error.message || "Failed to reset password. Please try again.",
			);
			console.error("Set password failed:", error);
		},
	});

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
						{isSettingNewPassword ? (
							// Flow: Setting New Password
							<form onSubmit={handleSetNewPassword.mutate}>
								<div className="flex flex-col gap-6">
									<div className="flex flex-col items-center gap-2 text-center">
										<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
											<KeyRound className="h-6 w-6 text-primary" />
										</div>
										<h1 className="text-2xl font-semibold tracking-tight mt-2">
											Set new password
										</h1>
										<p className="text-balance text-sm text-muted-foreground">
											Please enter your new password below.
										</p>
									</div>
									<FieldGroup>
										<Field>
											<div className="flex items-center justify-between">
												<FieldLabel htmlFor="password">New Password</FieldLabel>
											</div>
											<div className="relative">
												<Input
													id="password"
													type={passwordInputType}
													className="pr-10"
													required
												/>
												<Button
													aria-label={
														showPassword ? "Hide password" : "Show password"
													}
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
											<FieldLabel htmlFor="confirmPassword">
												Confirm Password
											</FieldLabel>
											<Input
												id="confirmPassword"
												type={passwordInputType}
												required
											/>
										</Field>

										<Field>
											<Button
												type="submit"
												className="w-full"
												disabled={handleSetNewPassword.isPending}
											>
												{handleSetNewPassword.isPending && (
													<Spinner className="mr-2" data-icon="inline-start" />
												)}
												Update password
											</Button>
										</Field>
									</FieldGroup>

									<div className="mt-4 text-center text-sm">
										Remembered your password?{" "}
										<Link
											to="/auth/signin"
											className="text-muted-foreground hover:text-primary hover:underline"
										>
											Back to login
										</Link>
									</div>
								</div>
							</form>
						) : isSubmitted ? (
							// Flow: Success Message after requesting reset link
							<div className="flex flex-col items-center justify-center gap-6 text-center">
								<div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mb-2">
									<MailCheck className="h-6 w-6 text-emerald-500" />
								</div>
								<h1 className="text-2xl font-semibold tracking-tight">
									Check your email
								</h1>
								<p className="text-balance text-sm text-muted-foreground">
									We've sent a password reset link to your email address. It may
									take a few minutes to arrive.
								</p>
								<Button
									asChild
									className="w-full mt-4 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
									variant="ghost"
								>
									<Link to="/auth/signin">Return to sign in</Link>
								</Button>
							</div>
						) : (
							// Flow: Requesting Reset Link
							<form onSubmit={handleRequestReset.mutate}>
								<div className="flex flex-col gap-6">
									<div className="flex flex-col items-center gap-2 text-center">
										<h1 className="text-2xl font-semibold tracking-tight">
											Reset password
										</h1>
										<p className="text-balance text-sm text-muted-foreground">
											Enter your email address and we'll send you a link to
											reset your password.
										</p>
									</div>
									<FieldGroup>
										<Field>
											<FieldLabel htmlFor="email">Email address</FieldLabel>
											<Input
												id="email"
												type="email"
												placeholder="m@example.com"
												required
											/>
										</Field>

										<Field>
											<Button
												type="submit"
												className="w-full"
												disabled={handleRequestReset.isPending}
											>
												{handleRequestReset.isPending && (
													<Spinner className="mr-2" data-icon="inline-start" />
												)}
												Send reset link
											</Button>
										</Field>
									</FieldGroup>

									<div className="mt-4 text-center text-sm">
										<Link
											to="/auth/signin"
											className="text-muted-foreground hover:text-foreground hover:underline"
										>
											Back to login
										</Link>
									</div>
								</div>
							</form>
						)}
					</div>
				</div>
			</div>
			<div className="relative hidden bg-muted lg:block">
				<img
					src={placeholder}
					alt="Bazaar cover"
					className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
				/>
				<div className="absolute bottom-10 left-10 text-white z-10 p-6 mix-blend-difference">
					<blockquote className="space-y-2">
						<p className="text-lg font-medium opacity-80 backdrop-invert-0">
							"Secure your account with ease. Our streamlined recovery process
							gets you back to navigating the markets rapidly."
						</p>
						<footer className="text-sm indent-1">- Bazaar Security Team</footer>
					</blockquote>
				</div>
			</div>
		</div>
	);
}
