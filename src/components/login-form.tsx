import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, GalleryVerticalEnd } from "lucide-react";
import { type SubmitEvent, useState } from "react";
import { toast } from "sonner";
import placeholder from "#/assets/placeholder.svg";
import { Button } from "#/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { authClient } from "#/lib/auth-client";
import { cn } from "#/lib/utils";
import { Spinner } from "./ui/spinner";
export function LoginForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const navigate = useNavigate();
	const [showPassword, setShowPassword] = useState(false);
	const passwordInputType = showPassword ? "text" : "password";
	const handleSignin = useMutation({
		mutationFn: async (e: SubmitEvent<HTMLFormElement>) => {
			e.preventDefault();
			const result = await authClient.signIn.email({
				email: e.target.email.value,
				password: e.target.password.value,
			});
			return result;
		},
		onSuccess: (data) => {
			if (data.error) {
				toast.error(
					data.error.message ||
						"Login failed. Please check your credentials and try again.",
				);
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
						<form onSubmit={handleSignin.mutate}>
							<div className="flex flex-col gap-6">
								<div className="flex flex-col items-center gap-2 text-center">
									<h1 className="text-2xl font-semibold tracking-tight">
										Login to your account
									</h1>
									<p className="text-balance text-sm text-muted-foreground">
										Enter your email below to log in to your dashboard
									</p>
								</div>
								<FieldGroup>
									<Field>
										<FieldLabel htmlFor="email">Email</FieldLabel>
										<Input
											id="email"
											type="email"
											placeholder="m@example.com"
											required
										/>
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
										<Button
											type="submit"
											className="w-full"
											disabled={handleSignin.isPending}
										>
											{handleSignin.isPending && (
												<Spinner className="mr-2" data-icon="inline-start" />
											)}
											Login
										</Button>
									</Field>
								</FieldGroup>
								<div className="mt-4 text-center text-sm">
									Don't have an account?{" "}
									<Link
										to="/auth/signup"
										className="underline hover:text-primary"
									>
										Sign up
									</Link>
								</div>
								<div className="text-center text-xs text-muted-foreground">
									By logging in, you agree to our{" "}
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
					alt="Bazaar cover"
					className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
				/>
				<div className="absolute bottom-10 left-10 text-white z-10 p-6 mix-blend-difference">
					<blockquote className="space-y-2">
						<p className="text-lg font-medium opacity-80 backdrop-invert-0">
							"This platform provides all the tools we need to monitor internal
							operations."
						</p>
						<footer className="text-sm indent-1">- Bazaar Team</footer>
					</blockquote>
				</div>
			</div>
		</div>
	);
}
