import {
	AreaSeries,
	ColorType,
	CrosshairMode,
	createChart,
	type IChartApi,
	LineStyle,
	type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import type { IndexHistory } from "#/types/market";

/** The theme provider toggles this class on <html>. */
function isDarkNow() {
	if (typeof document === "undefined") return false;
	return document.documentElement.classList.contains("dark");
}

// Lightweight Charts parses colours itself and does not understand oklch, so
// the chart keeps its own hex palette. These mirror the --gain / --loss /
// --border / --muted-foreground tokens in styles.css; update them together.
const PALETTE = {
	light: {
		gain: "#009456",
		loss: "#df1c21",
		gainArea: "rgba(0, 148, 86, 0.14)",
		lossArea: "rgba(223, 28, 33, 0.14)",
		grid: "#e3e7e8",
		text: "#67787c",
	},
	dark: {
		gain: "#30c77d",
		loss: "#ff6467",
		gainArea: "rgba(48, 199, 125, 0.18)",
		lossArea: "rgba(255, 100, 103, 0.18)",
		grid: "rgba(255, 255, 255, 0.12)",
		text: "#9ca8ab",
	},
};

/**
 * Lightweight Charts needs strictly ascending, unique timestamps. Simulated
 * candles can repeat a second after a pause or a reseed, so later points win.
 */
function toSeriesData(history: IndexHistory) {
	const byTime = new Map<number, number>();
	for (const point of history.points) {
		byTime.set(
			Math.floor(new Date(point.timestamp).getTime() / 1000),
			point.value,
		);
	}
	return [...byTime.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([time, value]) => ({ time: time as UTCTimestamp, value }));
}

export function IndexChart({
	history,
	isUp,
}: {
	history: IndexHistory;
	isUp: boolean;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<IChartApi | null>(null);
	const [isDark, setIsDark] = useState(isDarkNow);

	// Colours come from CSS variables, so the chart is rebuilt when the theme
	// flips. Watching the class the theme provider sets keeps this component free
	// of any React context, and therefore of the provider's React copy.
	useEffect(() => {
		const observer = new MutationObserver(() => {
			setIsDark((current) => {
				const next = isDarkNow();
				return next === current ? current : next;
			});
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const palette = isDark ? PALETTE.dark : PALETTE.light;
		const line = isUp ? palette.gain : palette.loss;

		const chart = createChart(container, {
			layout: {
				background: { type: ColorType.Solid, color: "rgba(0, 0, 0, 0)" },
				textColor: palette.text,
				fontFamily: "DM Mono, monospace",
				fontSize: 11,
				attributionLogo: false,
			},
			height: 240,
			width: container.clientWidth,
			grid: {
				vertLines: { visible: false },
				horzLines: { color: palette.grid, style: LineStyle.Dotted },
			},
			rightPriceScale: {
				borderVisible: false,
				scaleMargins: { top: 0.15, bottom: 0.05 },
			},
			timeScale: {
				borderVisible: false,
				timeVisible: true,
				secondsVisible: true,
			},
			crosshair: {
				mode: CrosshairMode.Magnet,
				vertLine: { color: palette.text, width: 1, style: LineStyle.Dotted },
				horzLine: { color: palette.text, labelBackgroundColor: line },
			},
			handleScale: false,
			handleScroll: false,
		});
		chartRef.current = chart;

		const series = chart.addSeries(AreaSeries, {
			lineColor: line,
			lineWidth: 2,
			topColor: isUp ? palette.gainArea : palette.lossArea,
			bottomColor: "rgba(0, 0, 0, 0)",
			priceLineVisible: false,
			priceFormat: { type: "price", precision: 2, minMove: 0.01 },
		});
		series.setData(toSeriesData(history));

		// The baseline the index is rebased to, so gains and losses read at a glance.
		series.createPriceLine({
			price: 100,
			color: palette.text,
			lineWidth: 1,
			lineStyle: LineStyle.Dashed,
			axisLabelVisible: true,
			title: "",
		});

		chart.timeScale().fitContent();

		const resize = new ResizeObserver(([entry]) => {
			chart.applyOptions({ width: entry.contentRect.width });
		});
		resize.observe(container);

		return () => {
			resize.disconnect();
			chart.remove();
			chartRef.current = null;
		};
	}, [history, isUp, isDark]);

	return <div ref={containerRef} className="w-full" />;
}
