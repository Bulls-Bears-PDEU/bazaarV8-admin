import { TickMarkType, type Time } from "lightweight-charts";
import { useEffect, useState } from "react";

/**
 * lightweight-charts resolves colours by reading getComputedStyle().color and
 * expects rgb()/rgba() back. Browsers return oklch() for oklch input, which is
 * what every theme token is, so the chart would throw "Failed to parse color".
 * A canvas accepts any CSS colour and always reads back sRGB bytes.
 */
let context: CanvasRenderingContext2D | null = null;

export const toRgba = (color: string, alpha = 1) => {
	if (!context) {
		const canvas = document.createElement("canvas");
		canvas.width = 1;
		canvas.height = 1;
		context = canvas.getContext("2d", { willReadFrequently: true });
	}
	if (!context) return `rgba(128, 128, 128, ${alpha})`;
	context.clearRect(0, 0, 1, 1);
	context.fillStyle = "#000";
	context.fillStyle = color;
	context.fillRect(0, 0, 1, 1);
	const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
	return `rgba(${r}, ${g}, ${b}, ${Math.round((a / 255) * alpha * 1000) / 1000})`;
};

export type ChartColors = {
	text: string;
	grid: string;
	gain: string;
	loss: string;
	accent: string;
	accentFill: string;
	accentFade: string;
	gainFill: string;
	gainFade: string;
	lossFill: string;
	lossFade: string;
	crosshair: string;
	muted: string;
	chart: string[];
	// Follows the text size preference.
	fontSize: number;
};

const readColors = (): ChartColors => {
	const style = getComputedStyle(document.documentElement);
	const token = (name: string) => style.getPropertyValue(name).trim() || "gray";
	return {
		text: toRgba(token("--muted-foreground")),
		grid: toRgba(token("--border")),
		gain: toRgba(token("--gain")),
		loss: toRgba(token("--loss")),
		accent: toRgba(token("--primary")),
		accentFill: toRgba(token("--primary"), 0.28),
		accentFade: toRgba(token("--primary"), 0.02),
		gainFill: toRgba(token("--gain"), 0.26),
		gainFade: toRgba(token("--gain"), 0.01),
		lossFill: toRgba(token("--loss"), 0.26),
		lossFade: toRgba(token("--loss"), 0.01),
		crosshair: toRgba(token("--ring")),
		muted: toRgba(token("--muted-foreground"), 0.45),
		chart: ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"].map((name) =>
			toRgba(token(name)),
		),
		fontSize: Math.round(Number.parseFloat(style.fontSize || "16") * 0.75),
	};
};

/**
 * Theme colours for charts, re-read whenever a class on <html> changes: light
 * and dark, and the accessibility preferences (colour-safe, contrast, size).
 */
export const useChartColors = () => {
	const [colors, setColors] = useState(readColors);
	useEffect(() => {
		const observer = new MutationObserver(() => setColors(readColors()));
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});
		return () => observer.disconnect();
	}, []);
	return colors;
};

/**
 * Prices on a chart's own axis and labels: rupees to the paisa, without a ₹ on
 * every one. The legend above the chart carries the currency.
 */
export const chartPriceFormatter = new Intl.NumberFormat("en-IN", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
}).format;

// The charting library only knows UTC: left to itself, its time axis reads
// 5½ hours behind an Indian reader's clock and disagrees with every other time
// on the page. These label each time in the reader's own zone instead, on the
// 24-hour clock so a session's ticks read in order.
const chartDate = (time: Time | number) =>
	typeof time === "number"
		? new Date(time * 1000)
		: typeof time === "string"
			? new Date(time)
			: new Date(time.year, time.month - 1, time.day);

const dateFormat = (options: Intl.DateTimeFormatOptions) =>
	new Intl.DateTimeFormat("en-IN", options).format;
const clock = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } as const;
const tickFormats: Record<TickMarkType, (date: Date) => string> = {
	[TickMarkType.Year]: dateFormat({ year: "numeric" }),
	[TickMarkType.Month]: dateFormat({ month: "short" }),
	[TickMarkType.DayOfMonth]: dateFormat({ day: "numeric", month: "short" }),
	[TickMarkType.Time]: dateFormat(clock),
	// The library fills gaps between minutes with ticks at odd seconds
	// (21:53:20), which read as noise; the crosshair gives the exact second.
	[TickMarkType.TimeWithSeconds]: () => "",
};
const fullTime = dateFormat({
	...clock,
	second: "2-digit",
	day: "numeric",
	month: "short",
});

/** A time-axis tick: a minute reads 14:30, a day 4 Oct, a month Oct. */
export const chartTickFormatter = (time: Time, type: TickMarkType) =>
	tickFormats[type](chartDate(time));

/** One moment in full, for the crosshair's label and the legend: 4 Oct, 14:30:10. */
export const chartTimeFormatter = (time: Time | number) =>
	fullTime(chartDate(time));

/** Seconds since epoch, as the chart wants; null for unusable values. */
export const toChartTime = (value: string | Date) => {
	const ms = new Date(value).getTime();
	return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
};
