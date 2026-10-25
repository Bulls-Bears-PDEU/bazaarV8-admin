import { Link } from "@tanstack/react-router";
import { cn } from "#/lib/utils";

/** The bull and bear mark: public/logo192.png, cut from logo512.png. */
export function BrandMark({ className }: { className?: string }) {
	return (
		<img
			src="/logo192.png"
			alt=""
			draggable={false}
			className={cn("inline-block size-8 shrink-0 object-contain", className)}
		/>
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
