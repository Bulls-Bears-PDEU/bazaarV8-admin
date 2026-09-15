import {
	AreaSeries,
	ColorType,
	CrosshairMode,
	createChart,
	type IChartApi,
	LineStyle,
	type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import { useChartColors } from "#/lib/chart-colors";
import type { IndexHistory } from "#/types/market";

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
	// Theme tokens, re-read on light/dark and the accessibility settings.
	const colors = useChartColors();

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const line = isUp ? colors.gain : colors.loss;

		const chart = createChart(container, {
			layout: {
				background: { type: ColorType.Solid, color: "rgba(0, 0, 0, 0)" },
				textColor: colors.text,
				fontFamily: "DM Mono, monospace",
				fontSize: colors.fontSize,
				attributionLogo: false,
			},
			height: 240,
			width: container.clientWidth,
			grid: {
				vertLines: { visible: false },
				horzLines: { color: colors.grid, style: LineStyle.Dotted },
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
				vertLine: { color: colors.crosshair, width: 1, style: LineStyle.Dotted },
				horzLine: { color: colors.crosshair, labelBackgroundColor: line },
			},
			handleScale: false,
			handleScroll: false,
		});
		chartRef.current = chart;

		const series = chart.addSeries(AreaSeries, {
			lineColor: line,
			lineWidth: 2,
			topColor: isUp ? colors.gainFill : colors.lossFill,
			bottomColor: "rgba(0, 0, 0, 0)",
			priceLineVisible: false,
			priceFormat: { type: "price", precision: 2, minMove: 0.01 },
		});
		series.setData(toSeriesData(history));

		// The baseline the index is rebased to, so gains and losses read at a glance.
		series.createPriceLine({
			price: 100,
			color: colors.text,
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
	}, [history, isUp, colors]);

	return <div ref={containerRef} className="w-full" />;
}
