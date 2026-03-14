import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";

export const Route = createFileRoute("/not_authorized")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center relative overflow-hidden">
			{/* Content */}
			<div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
				{/* Animated error code */}
				<div className="relative mb-8">
					<div className="inline-block relative">
						<div className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent animate-pulse">
							403
						</div>
					</div>
				</div>

				{/* Main heading */}
				<div className="mb-6 space-y-4">
					<h1 className="text-4xl md:text-5xl font-bold text-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
						Access Denied
					</h1>
					<div className="h-1 w-16 mx-auto bg-gradient-to-r from-primary to-accent rounded-full animate-in scale-x-0 origin-center duration-1000 fill-mode-both" />
				</div>

				{/* Description */}
				<p className="text-lg text-muted-foreground mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 fill-mode-both">
					You don't have permission to access this resource. Please contact your
					administrator if you believe this is a mistake.
				</p>

				{/* Additional info box */}
				<div
					className="bg-card border border-border rounded-lg p-6 mb-8 backdrop-blur-sm
            animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both
            hover:border-accent/30 transition-colors duration-300"
				>
					<div className="space-y-3">
						<div className="flex items-start gap-3">
							<div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
							<p className="text-sm text-muted-foreground text-left">
								This page is restricted and requires proper authorization to
								access.
							</p>
						</div>
						<div className="flex items-start gap-3">
							<div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
							<p className="text-sm text-muted-foreground text-left">
								If you think you should have access, please verify your
								permissions.
							</p>
						</div>
					</div>
				</div>

				{/* Action buttons */}
				<div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300 fill-mode-both">
					<Link to="/">
						<Button
							className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:shadow-lg
                hover:shadow-accent/20 transition-all duration-300 transform hover:scale-105"
							size="lg"
						>
							Back to Home
						</Button>
					</Link>
					<Link to="/">
						<Button
							variant="outline"
							className="w-full sm:w-auto border-primary/30 hover:border-primary/60 hover:bg-primary/5
                transition-colors duration-300"
							size="lg"
						>
							Contact Support
						</Button>
					</Link>
				</div>

				{/* Status indicator with animation */}
				<div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
					<div className="w-2 h-2 rounded-full bg-accent/60 animate-pulse" />
					<span>Error Code: 403 Forbidden</span>
				</div>
			</div>
		</div>
	);
}
