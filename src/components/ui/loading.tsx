import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "#/lib/utils";

export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
	text?: string;
	fullScreen?: boolean;
}

export function Loading({
	text = "Loading...",
	fullScreen = false,
	className,
	...props
}: LoadingProps) {
	return (
		<div
			className={cn(
				"flex flex-col flex-1 items-center justify-center gap-4",
				fullScreen ? "h-screen w-full" : "h-full min-h-[200px] w-full py-16",
				className,
			)}
			{...props}
		>
			<div className="relative flex items-center justify-center">
				{/* Outer glow ring */}
				<div className="absolute inset-0 rounded-full blur-xl bg-primary/20 animate-pulse" />

				{/* 3 layered spinning rings for a more dynamic look */}
				<div className="relative flex items-center justify-center h-14 w-14 rounded-full border border-primary/20 bg-background/50 shadow-sm backdrop-blur-sm">
					<div className="absolute inset-2 rounded-full border border-t-primary/80 border-r-transparent border-b-transparent border-l-transparent animate-spin duration-700" />
					<div className="absolute inset-3 rounded-full border border-r-primary/60 border-t-transparent border-b-transparent border-l-transparent animate-spin duration-1000 direction-reverse" />
					<Loader2 className="relative h-5 w-5 animate-spin text-primary duration-1000" />
				</div>
			</div>

			{text && (
				<p className="text-sm font-medium text-muted-foreground animate-pulse tracking-wide">
					{text}
				</p>
			)}
		</div>
	);
}
