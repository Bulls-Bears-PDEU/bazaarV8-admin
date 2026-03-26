import { useQuery } from "@tanstack/react-query";
import {
	CandlestickSeries,
	ColorType,
	CrosshairMode,
	createChart,
	type Time,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import { getStockOhlc } from "#/api/stocks";
import useSocket from "#/hooks/use-socket";
import type { StockOHLC } from "#/types/stock";

const TVChart = ({ stockId }: { stockId: string }) => {
	const chartContainerRef = useRef<HTMLDivElement>(null);

	const stockOhlc = useQuery({
		queryKey: ["stock", stockId, "ohlc"],
		queryFn: () => (stockId ? getStockOhlc(stockId) : Promise.resolve(null)),
	});
	const socket = useSocket();

	useEffect(() => {
		if (!chartContainerRef.current) return;
		if (!socket) return;
		if (!stockOhlc.isSuccess || !stockOhlc.data) return;
		// Initialize the TV Chart here using the chartContainerRef.current as the container
		// For example, if using TradingView's Lightweight Charts:
		const chart = createChart(chartContainerRef.current, {
			layout: {
				background: {
					type: ColorType.Solid,
					color: "oklch(0.274 0.006 286.033)",
				},
				textColor: "white",
			},
			height: 400,
			grid: {
				vertLines: {
					// make these color lighter "oklch(0.218 0.008 223.9)" not trnasparent, but lighter
					color: "oklch(0.374 0.006 286.033)",
				},
				horzLines: {
					// make these color lighter "oklch(0.218 0.008 223.9)" not trnasparent, but lighter
					color: "oklch(0.374 0.006 286.033)",
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
				secondsVisible: true,
				timeVisible: true,
			},
		});
		candleSeries.setData(
			// @ts-expect-error - We know the data is in the correct format, but TypeScript doesn't
			stockOhlc.data?.map((ohlc) => ({
				time: new Date(ohlc.timestamp).getTime() / 1000, // Convert to seconds
				open: Number(ohlc.open_price),
				high: Number(ohlc.high_price),
				low: Number(ohlc.low_price),
				close: Number(ohlc.close_price),
			})),
		);

		socket.on("stockPriceUpdate", (data: StockOHLC) => {
			console.log("Received stockPriceUpdate:", data);
			if (data.stock_id === Number(stockId)) {
				candleSeries.update({
					time: (new Date(data.timestamp).getTime() / 1000) as unknown as Time, // Convert to seconds
					open: Number(data.open_price),
					high: Number(data.high_price),
					low: Number(data.low_price),
					close: Number(data.close_price),
				});
			}
		});

		// Cleanup function to destroy the chart when the component unmounts
		return () => {
			chart.remove();
			socket.off("stockPriceUpdate");
		};
	}, [stockOhlc.isSuccess, stockOhlc.data, socket, stockId]);

	return (
		<div
			ref={chartContainerRef}
			className="w-full h-full rounded-lg overflow-hidden"
		></div>
	);
};

export default TVChart;
