import { cn } from "#/lib/utils";

/**
 * The placeholder a chart leaves while its history loads.
 *
 * A plain rectangle the size of a chart reads as a broken chart rather than a
 * loading one, so this draws the shape of one — gridlines, a line and a few
 * candles — faint enough to be obviously not data. data-slot="skeleton" gives
 * it the same sweep as every other placeholder, which stops under
 * prefers-reduced-motion.
 */
export function ChartSkeleton({
	className,
	label = "Loading the chart",
}: {
	className?: string;
	label?: string;
}) {
	return (
		<div
			data-slot="skeleton"
			role="status"
			aria-label={label}
			className={cn("rounded-md border bg-muted/30", className)}
		>
			<svg
				viewBox="0 0 300 120"
				preserveAspectRatio="none"
				aria-hidden="true"
				className="size-full text-muted-foreground"
			>
				<title>{label}</title>
				{/* Gridlines, at the heights a price axis would pick. */}
				{[24, 48, 72, 96].map((y) => (
					<line
						key={y}
						x1="0"
						y1={y}
						x2="300"
						y2={y}
						stroke="currentColor"
						strokeOpacity="0.12"
						strokeWidth="0.5"
					/>
				))}
				{/* A plausible path, fixed rather than random so it never flickers. */}
				<path
					d="M0 88 L20 82 L40 90 L60 74 L80 78 L100 62 L120 68 L140 52 L160 58 L180 44 L200 50 L220 36 L240 42 L260 30 L280 34 L300 24"
					fill="none"
					stroke="currentColor"
					strokeOpacity="0.28"
					strokeWidth="1.5"
					vectorEffect="non-scaling-stroke"
				/>
				<path
					d="M0 88 L20 82 L40 90 L60 74 L80 78 L100 62 L120 68 L140 52 L160 58 L180 44 L200 50 L220 36 L240 42 L260 30 L280 34 L300 24 L300 120 L0 120 Z"
					fill="currentColor"
					fillOpacity="0.06"
				/>
				{/* A few candles, so a candlestick chart looks like it is on its way. */}
				{[
					[20, 78, 90],
					[80, 70, 86],
					[140, 46, 64],
					[200, 42, 58],
					[260, 24, 40],
				].map(([x, top, bottom]) => (
					<rect
						key={x}
						x={x - 3}
						y={top}
						width="6"
						height={bottom - top}
						rx="1"
						fill="currentColor"
						fillOpacity="0.14"
					/>
				))}
			</svg>
		</div>
	);
}
