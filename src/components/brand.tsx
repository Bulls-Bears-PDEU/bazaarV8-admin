import { Link } from "@tanstack/react-router";
import { cn } from "#/lib/utils";

/** Candlestick mark: two bodies, one up and one down. */
export function BrandMark({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				"inline-flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground",
				className,
			)}
		>
			<svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
				<path d="M4.5 2v12M11.5 2v12" stroke="currentColor" strokeWidth="1.2" />
				<rect x="3" y="4" width="3" height="6" rx="0.5" fill="currentColor" />
				<rect
					x="10"
					y="6.5"
					width="3"
					height="5"
					rx="0.5"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.2"
				/>
			</svg>
		</span>
	);
}

/** The player app's brand, tagged so an organiser always knows which app is open. */
export function Brand({
	className,
	collapsed = false,
}: {
	className?: string;
	collapsed?: boolean;
}) {
	return (
		<Link
			to="/"
			className={cn("flex items-center gap-2 font-semibold", className)}
		>
			<BrandMark />
			{/* Collapsed, only the mark shows; the name stays for screen readers. */}
			<span className={cn("tracking-tight", collapsed && "sr-only")}>
				Bazaar
			</span>
			<span
				className={cn(
					"rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide text-muted-foreground uppercase",
					collapsed && "sr-only",
				)}
			>
				Admin
			</span>
		</Link>
	);
}
