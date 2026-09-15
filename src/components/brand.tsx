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
				<rect x="10" y="6.5" width="3" height="5" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
			</svg>
		</span>
	);
}

/** The player app's brand, tagged so an organiser always knows which app is open. */
export function Brand({ className }: { className?: string }) {
	return (
		<Link to="/" className={cn("flex items-center gap-2 font-semibold", className)}>
			<BrandMark />
			<span className="tracking-tight">Bazaar</span>
			<span className="rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
				Admin
			</span>
		</Link>
	);
}
