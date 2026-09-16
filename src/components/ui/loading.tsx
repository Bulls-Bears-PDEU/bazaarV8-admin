import { BrandMark } from "#/components/brand";
import { cn } from "#/lib/utils";

/**
 * The wait between asking for a screen and having it.
 *
 * Deliberately the same mark, halo and bar as the splash in index.html, which
 * holds the page until React first renders: the handover from one to the other
 * should look like nothing happened, rather than like a second loader. Both
 * stand still under prefers-reduced-motion.
 */
export function Loading({
	text,
	fullScreen = false,
	className,
	...props
}: React.ComponentProps<"div"> & { text?: string; fullScreen?: boolean }) {
	return (
		<div
			role="status"
			aria-live="polite"
			className={cn(
				"flex flex-1 flex-col items-center justify-center gap-5",
				fullScreen ? "h-svh w-full" : "min-h-[200px] w-full py-16",
				className,
			)}
			{...props}
		>
			<span className="relative flex items-center justify-center">
				<span
					aria-hidden="true"
					className="boot-halo absolute size-12 rounded-xl bg-primary/25"
				/>
				<BrandMark className="boot-mark relative size-10 rounded-xl" />
			</span>
			<span
				aria-hidden="true"
				className="boot-bar relative h-0.5 w-32 overflow-hidden rounded-full bg-muted"
			>
				<span className="absolute inset-0 rounded-full bg-primary" />
			</span>
			{/* Named for screen readers whether or not the wait is captioned. */}
			<span className={cn("text-sm text-muted-foreground", !text && "sr-only")}>
				{text ?? "Loading"}
			</span>
		</div>
	);
}
