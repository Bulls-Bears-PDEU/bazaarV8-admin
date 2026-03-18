import {
	CandlestickSeries,
	ColorType,
	CrosshairMode,
	createChart,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { StockOHLC } from "#/types/stock";

const TVChart = ({ candleStickData }: { candleStickData: StockOHLC[] }) => {
	const chartContainerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!chartContainerRef.current) return;

		// Initialize the TV Chart here using the chartContainerRef.current as the container
		// For example, if using TradingView's Lightweight Charts:
		const chart = createChart(chartContainerRef.current, {
			layout: {
				background: {
					type: ColorType.Solid,
					color: "oklch(0.275 0.011 216.9)",
				},
				textColor: "white",
			},
			height: 400,
			grid: {
				vertLines: {
					// make these color lighter "oklch(0.218 0.008 223.9)" not trnasparent, but lighter
					color: "oklch(0.375 0.011 216.9)",
				},
				horzLines: {
					// make these color lighter "oklch(0.218 0.008 223.9)" not trnasparent, but lighter
					color: "oklch(0.375 0.011 216.9)",
				},
			},
			crosshair: {
				mode: CrosshairMode.Normal,
			},
		});
		const candleSeries = chart.addSeries(CandlestickSeries);
		chart.applyOptions({
			rightPriceScale: {
				autoScale: true,
			},
		});
		chart.applyOptions({
			timeScale: {
				secondsVisible: false,
				timeVisible: true,
			},
		});
		candleSeries.setData(
			// @ts-expect-error - We know the data is in the correct format, but TypeScript doesn't
			candleStickData.map((ohlc) => ({
				time: new Date(ohlc.timestamp).getTime() / 1000, // Convert to seconds
				open: Number(ohlc.open_price),
				high: Number(ohlc.high_price),
				low: Number(ohlc.low_price),
				close: Number(ohlc.close_price),
			})),
		);

		// Cleanup function to destroy the chart when the component unmounts
		return () => {
			chart.remove();
		};
	}, [candleStickData]);

	return (
		<div
			ref={chartContainerRef}
			className="w-full h-full rounded-lg overflow-hidden"
		></div>
	);
};

export default TVChart;
