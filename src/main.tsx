import { ClerkProvider } from "@clerk/react";
import { shadcn } from "@clerk/ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "./components/theme-provider";
import { TooltipProvider } from "./components/ui/tooltip";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollRestoration: true,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const queryClient = new QueryClient();

const rootElement = document.getElementById("app")!;

if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<React.StrictMode>
			<QueryClientProvider client={queryClient}>
				<ThemeProvider>
					<ClerkProvider
						appearance={{
							theme: shadcn,
						}}
						publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
						signInUrl="/auth/signin"
						signUpUrl="/auth/signup"
					>
						<TooltipProvider>
							<RouterProvider router={router} />
						</TooltipProvider>
					</ClerkProvider>
				</ThemeProvider>
			</QueryClientProvider>
		</React.StrictMode>,
	);
}
