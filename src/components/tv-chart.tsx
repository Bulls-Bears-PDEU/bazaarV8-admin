import { useQuery } from "@tanstack/react-query";
import {
	AreaSeries,
	BarSeries,
	CandlestickSeries,
	ColorType,
	CrosshairMode,
	createChart,
	type IChartApi,
	type ISeriesApi,
	LineSeries,
	type MouseEventParams,
	type SeriesType,
	type UTCTimestamp,
} from "lightweight-charts";
import {
	ChartArea,
	ChartCandlestick,
	ChartLine,
	ChartNoAxesColumn,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getStockOhlc } from "#/api/stocks";
import {
	ChartFrame,
	ChartToggle,
	useStoredChoice,
} from "#/components/charts/chart-frame";
import { ChartSkeleton } from "#/components/charts/chart-skeleton";
import useSocket from "#/hooks/use-socket";
import {
	inrPriceFormatter,
	toChartTime,
	useChartColors,
} from "#/lib/chart-colors";
import type { StockOHLC } from "#/types/stock";

type Bar = {
	time: UTCTimestamp;
	open: number;
	high: number;
	low: number;
	close: number;
};

const CHART_TYPES = ["candles", "bars", "line", "area"] as const;
type ChartType = (typeof CHART_TYPES)[number];

const TYPE_OPTIONS = [
	{ value: "candles", label: "Candles", icon: ChartCandlestick },
	{ value: "bars", label: "OHLC bars", icon: ChartNoAxesColumn },
	{ value: "line", label: "Line", icon: ChartLine },
	{ value: "area", label: "Area", icon: ChartArea },
] satisfies { value: ChartType; label: string; icon: typeof ChartLine }[];

// Candles close every 10 seconds.
const RANGES = [
	{ value: "5m", label: "Last 5 minutes", text: "5m", bars: 30 },
	{ value: "15m", label: "Last 15 minutes", text: "15m", bars: 90 },
	{ value: "1h", label: "Last hour", text: "1h", bars: 360 },
	{ value: "all", label: "All history", text: "All", bars: null },
] as const;
type Range = (typeof RANGES)[number]["value"];

const isOhlc = (type: ChartType) => type === "candles" || type === "bars";

const toSeriesData = (bars: Bar[], type: ChartType) =>
	isOhlc(type)
		? bars
		: bars.map((bar) => ({ time: bar.time, value: bar.close }));

const formatTime = (seconds: number) =>
	new Date(seconds * 1000).toLocaleTimeString("en-IN", { hour12: false });

/**
 * One stock's price, styled like the player app's chart: history from the API,
 * then each stockPriceUpdate from the socket updating the last bar. Mount it
 * with key={stockId} so switching stocks starts a fresh chart.
 */
const TVChart = ({ stockId, symbol }: { stockId: string; symbol: string }) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<IChartApi | null>(null);
	const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
	const barsRef = useRef<Bar[]>([]);
	const viewportSetRef = useRef(false);
	const colors = useChartColors();
	const socket = useSocket();
	const [type, setType] = useStoredChoice<ChartType>(
		"admin-stock-type",
		CHART_TYPES,
		"candles",
	);
	// A whole session of 10 second candles is far too thin to read at once.
	const [range, setRange] = useState<Range | null>("15m");
	const [hovered, setHovered] = useState<Bar | null>(null);
	const [latest, setLatest] = useState<Bar | null>(null);

	const history = useQuery({
		queryKey: ["stock", stockId, "ohlc"],
		queryFn: () => getStockOhlc(stockId),
		enabled: Boolean(stockId),
	});

	// Create once.
	useEffect(() => {
		if (!containerRef.current) return;
		const chart = createChart(containerRef.current, {
			autoSize: true,
			crosshair: { mode: CrosshairMode.Magnet },
			localization: { priceFormatter: inrPriceFormatter },
			timeScale: {
				timeVisible: true,
				secondsVisible: true,
				borderVisible: false,
				rightOffset: 4,
			},
			rightPriceScale: { borderVisible: false },
			// Over the chart the wheel zooms and a sideways swipe scrolls; drag to pan.
			handleScroll: {
				mouseWheel: true,
				pressedMouseMove: true,
				horzTouchDrag: true,
				vertTouchDrag: false,
			},
			handleScale: {
				mouseWheel: true,
				pinch: true,
				axisPressedMouseMove: true,
			},
		});
		chartRef.current = chart;
		const onMove = (param: MouseEventParams) => {
			const series = seriesRef.current;
			const point = series ? param.seriesData.get(series) : undefined;
			if (!point || param.time === undefined) return setHovered(null);
			setHovered(
				barsRef.current.find((bar) => bar.time === param.time) ?? null,
			);
		};
		chart.subscribeCrosshairMove(onMove);
		return () => {
			chart.unsubscribeCrosshairMove(onMove);
			chart.remove();
			chartRef.current = null;
			seriesRef.current = null;
		};
	}, []);

	// The series for the chosen type, rebuilt from the bars already loaded.
	useEffect(() => {
		const chart = chartRef.current;
		if (!chart) return;
		if (seriesRef.current) chart.removeSeries(seriesRef.current);
		const definition = {
			candles: CandlestickSeries,
			bars: BarSeries,
			line: LineSeries,
			area: AreaSeries,
		}[type];
		const series = chart.addSeries(
			definition as typeof LineSeries,
		) as ISeriesApi<SeriesType>;
		seriesRef.current = series;
		series.setData(toSeriesData(barsRef.current, type));
	}, [type]);

	// Theme, and the colours that depend on the type.
	useEffect(() => {
		chartRef.current?.applyOptions({
			layout: {
				background: { type: ColorType.Solid, color: "transparent" },
				textColor: colors.text,
				fontFamily: "DM Mono, monospace",
				fontSize: colors.fontSize,
				// TradingView's logo and link, which its licence asks for.
				attributionLogo: true,
			},
			grid: {
				vertLines: { color: colors.grid },
				horzLines: { color: colors.grid },
			},
			crosshair: {
				vertLine: {
					color: colors.crosshair,
					labelBackgroundColor: colors.accent,
				},
				horzLine: {
					color: colors.crosshair,
					labelBackgroundColor: colors.accent,
				},
			},
		});
		seriesRef.current?.applyOptions(
			{
				candles: {
					upColor: colors.gain,
					downColor: colors.loss,
					borderUpColor: colors.gain,
					borderDownColor: colors.loss,
					wickUpColor: colors.gain,
					wickDownColor: colors.loss,
				},
				bars: { upColor: colors.gain, downColor: colors.loss, thinBars: false },
				line: { color: colors.accent, lineWidth: 2 as const },
				area: {
					lineColor: colors.accent,
					topColor: colors.accentFill,
					bottomColor: colors.accentFade,
					lineWidth: 2 as const,
				},
			}[type],
		);
	}, [colors, type]);

	const applyRange = (value: Range) => {
		setRange(value);
		const scale = chartRef.current?.timeScale();
		const count = RANGES.find((r) => r.value === value)?.bars ?? null;
		const total = barsRef.current.length;
		if (!scale) return;
		if (count === null || total <= count) scale.fitContent();
		else scale.setVisibleLogicalRange({ from: total - count, to: total + 3 });
	};

	// History. Bars must be strictly ascending by time. The view is set on the
	// first load only, so a refetch never throws away the reader's zoom.
	// biome-ignore lint/correctness/useExhaustiveDependencies: not on type changes
	useEffect(() => {
		if (!seriesRef.current || !history.data) return;
		const byTime = new Map<number, Bar>();
		for (const candle of history.data) {
			const time = toChartTime(candle.timestamp);
			if (time === null) continue;
			byTime.set(time, {
				time: time as UTCTimestamp,
				open: Number(candle.open_price),
				high: Number(candle.high_price),
				low: Number(candle.low_price),
				close: Number(candle.close_price),
			});
		}
		barsRef.current = [...byTime.values()].sort((a, b) => a.time - b.time);
		seriesRef.current.setData(toSeriesData(barsRef.current, type));
		setLatest(barsRef.current[barsRef.current.length - 1] ?? null);
		if (!viewportSetRef.current) {
			viewportSetRef.current = true;
			applyRange("15m");
		}
	}, [history.data]);

	// Live candles. Only this handler is removed on cleanup: other components
	// listen for the same event on the shared socket.
	useEffect(() => {
		if (!socket || !history.data) return;
		const onUpdate = (data: StockOHLC) => {
			const series = seriesRef.current;
			if (!series || data.stock_id !== Number(stockId)) return;
			const time = toChartTime(data.timestamp);
			const bars = barsRef.current;
			const last = bars[bars.length - 1];
			// Never step back in time; a reseeded engine could briefly send an older candle.
			if (time === null || (last && time < last.time)) return;
			const bar: Bar = {
				time: time as UTCTimestamp,
				open: Number(data.open_price),
				high: Number(data.high_price),
				low: Number(data.low_price),
				close: Number(data.close_price),
			};
			if (last && last.time === time) bars[bars.length - 1] = bar;
			else bars.push(bar);
			series.update(isOhlc(type) ? bar : { time: bar.time, value: bar.close });
			setLatest(bar);
		};
		socket.on("stockPriceUpdate", onUpdate);
		return () => {
			socket.off("stockPriceUpdate", onUpdate);
		};
	}, [socket, history.data, stockId, type]);

	const shown = hovered ?? latest;
	const bars = barsRef.current;

	return (
		<div className="relative">
			<ChartFrame
				label={`${symbol} price chart`}
				filename={`${symbol}-price`}
				chartRef={chartRef}
				containerRef={containerRef}
				chartClassName="h-72 md:h-[400px]"
				// Over the chart's own box, so a wait never leaves an empty frame.
				overlay={
					history.isPending ? (
						<ChartSkeleton className="size-full" />
					) : history.isError ? (
						<div className="flex size-full items-center justify-center rounded-md border bg-card/60 text-sm text-muted-foreground">
							Could not load the price history.
						</div>
					) : history.data?.length === 0 ? (
						<div className="flex size-full items-center justify-center rounded-md border border-dashed bg-card/60 text-sm text-muted-foreground">
							No price history yet. Candles appear once trading starts.
						</div>
					) : null
				}
				onViewportChange={() => setRange(null)}
				toolbar={
					<>
						<ChartToggle
							label="Chart type"
							value={type}
							options={TYPE_OPTIONS}
							onChange={setType}
						/>
						<ChartToggle
							label="Time range"
							value={range}
							options={[...RANGES]}
							onChange={applyRange}
						/>
					</>
				}
				legend={
					<div
						className="flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tabular-nums"
						aria-live="off"
					>
						{shown ? (
							<>
								<span className="text-muted-foreground">
									{formatTime(shown.time)}
								</span>
								{(["open", "high", "low", "close"] as const).map((key) => (
									<span key={key}>
										<span className="text-muted-foreground">
											{key[0].toUpperCase()}
										</span>{" "}
										{inrPriceFormatter(shown[key])}
									</span>
								))}
							</>
						) : (
							<span className="text-muted-foreground">
								Point at the chart to read a candle.
							</span>
						)}
					</div>
				}
				table={() => ({
					caption: `${symbol} candles, newest first`,
					columns: ["Time", "Open", "High", "Low", "Close"],
					rows: bars
						.slice(-100)
						.reverse()
						.map((bar) => ({
							key: bar.time,
							cells: [
								formatTime(bar.time),
								inrPriceFormatter(bar.open),
								inrPriceFormatter(bar.high),
								inrPriceFormatter(bar.low),
								inrPriceFormatter(bar.close),
							],
						})),
				})}
			/>
		</div>
	);
};

export default TVChart;
