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

export const inrPriceFormatter = new Intl.NumberFormat("en-IN", {
	style: "currency",
	currency: "INR",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
}).format;

/** Seconds since epoch, as the chart wants; null for unusable values. */
export const toChartTime = (value: string | Date) => {
	const ms = new Date(value).getTime();
	return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
};
