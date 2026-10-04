import {
	Clock,
	Crosshair,
	Minus,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { chartTimeFormatter } from "#/lib/chart-colors";
import { formatINR, formatPct, trendBadge } from "#/lib/format";
import { cn } from "#/lib/utils";

export type LegendCandle = {
	/** Seconds since epoch, as the chart plots it. */
	time: number;
	open: number;
	high: number;
	low: number;
	close: number;
	/** The close measured from the starting price, from the backend. */
	change_pct: number | null;
};

/**
 * The header above a price chart that reads out one candle: the one under the
 * crosshair, or the latest while nothing is pointed at. Its price and change
 * follow the pointer, the way a trading app's quote does.
 */
export function CandleLegend({
	candle,
	hovering,
	ohlc,
	quote = true,
}: {
	candle: LegendCandle | null;
	hovering: boolean;
	/** Candles and bars show all four prices; a line or area only the close. */
	ohlc: boolean;
	/**
	 * False where the page's own header already shows the price, change and
	 * time and follows the pointer: the legend is then only open, high and low.
	 */
	quote?: boolean;
}) {
	const prices = candle && ohlc && (
		// On a phone: four prices two by two, or three in one row.
		<dl
			className={cn(
				"grid gap-x-6 gap-y-2 sm:flex sm:gap-x-8",
				quote ? "grid-cols-2" : "grid-cols-3",
			)}
		>
			{(
				[
					["Open", candle.open],
					["High", candle.high],
					["Low", candle.low],
					// Without the quote the page's header price is the close already.
					...(quote ? ([["Close", candle.close]] as const) : []),
				] as const
			).map(([label, value]) => (
				<div key={label} className="flex flex-col gap-0.5">
					<dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
						{label}
					</dt>
					<dd className="font-mono text-sm tabular-nums">{formatINR(value)}</dd>
				</div>
			))}
		</dl>
	);

	if (!quote) return prices || null;

	if (!candle) {
		return (
			<p className="flex min-h-9 items-center text-sm text-muted-foreground">
				Point at the chart to read a candle.
			</p>
		);
	}

	const change = candle.change_pct;
	const ChangeIcon =
		change == null || change === 0
			? Minus
			: change > 0
				? TrendingUp
				: TrendingDown;
	const TimeIcon = hovering ? Crosshair : Clock;

	return (
		<div className="flex flex-col gap-3" aria-live="off">
			<div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
					<span className="font-mono text-2xl font-medium tabular-nums leading-none">
						{formatINR(candle.close)}
					</span>
					{/* The player dashboard's ChangeBadge. */}
					<span
						className={cn(
							"inline-flex min-w-[4.75rem] items-center justify-between gap-1 rounded-md px-1.5 py-0.5 font-mono text-xs tabular-nums transition-colors",
							trendBadge(change),
						)}
					>
						<ChangeIcon className="size-3 shrink-0" aria-hidden="true" />
						{formatPct(change)}
					</span>
					<span className="text-xs text-muted-foreground">since start</span>
				</div>
				<span className="flex items-center gap-1.5 font-mono text-xs tabular-nums text-muted-foreground">
					<TimeIcon className="size-3.5 shrink-0" aria-hidden="true" />
					<span className="sr-only">
						{hovering ? "Candle at" : "Latest candle,"}
					</span>
					{chartTimeFormatter(candle.time)}
				</span>
			</div>
			{prices}
		</div>
	);
}
