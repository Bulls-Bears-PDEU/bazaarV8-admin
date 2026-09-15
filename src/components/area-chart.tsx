import {
	AreaSeries,
	BaselineSeries,
	ColorType,
	createChart,
	type IChartApi,
	type ISeriesApi,
	LineSeries,
	LineStyle,
	type MouseEventParams,
	type UTCTimestamp,
} from "lightweight-charts";
import { ChartArea, ChartLine, ChartSpline } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChartFrame, ChartToggle, useStoredChoice } from "#/components/charts/chart-frame";
import { toChartTime, useChartColors } from "#/lib/chart-colors";
import { formatPct, formatTime, trendText } from "#/lib/format";
import { cn } from "#/lib/utils";

const CHART_TYPES = ["baseline", "area", "line"] as const;
type ChartType = (typeof CHART_TYPES)[number];

type Point = { time: UTCTimestamp; value: number };

/** A point as the backend sends it: the value and how far it is from the start, in percent. */
export type ChartPoint = { timestamp: string; value: number; change_pct: number };

/**
 * A value over time on a TradingView chart: the market index and net worth.
 *
 * `baseline` (index 100, starting capital) is where the line started; the
 * baseline type colours the line by which side of it the value is on.
 * `live` extends the line past the fetched points as the market ticks, so the
 * end of the line is always the figure shown above the chart. Every percentage
 * shown comes from the backend with its point.
 */
export function AreaChart({
	points,
	baseline,
	live,
	storageKey,
	formatValue,
	className,
	label,
}: {
	points: ChartPoint[];
	baseline: number;
	live?: { value: number; change_pct: number } | null;
	/** Remembers the chosen chart type under this name. */
	storageKey: string;
	formatValue: (value: number) => string;
	className?: string;
	label: string;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<IChartApi | null>(null);
	const seriesRef = useRef<ISeriesApi<"Area" | "Line" | "Baseline"> | null>(null);
	const dataRef = useRef<Point[]>([]);
	// The backend's change_pct for each plotted time.
	const changeRef = useRef(new Map<number, number>());
	const colors = useChartColors();
	const formatRef = useRef(formatValue);
	formatRef.current = formatValue;
	const [type, setType] = useStoredChoice<ChartType>(storageKey, CHART_TYPES, "baseline");
	const [hovered, setHovered] = useState<Point | null>(null);

	useEffect(() => {
		if (!containerRef.current) return;
		const chart = createChart(containerRef.current, {
			autoSize: true,
			localization: { priceFormatter: (v: number) => formatRef.current(v) },
			timeScale: { timeVisible: true, borderVisible: false, rightOffset: 2 },
			rightPriceScale: { borderVisible: false },
			handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
			handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
		});
		chartRef.current = chart;
		const onMove = (param: MouseEventParams) => {
			const series = seriesRef.current;
			const point = series ? param.seriesData.get(series) : undefined;
			if (!point || !("value" in point) || param.time === undefined) return setHovered(null);
			setHovered({ time: param.time as UTCTimestamp, value: Number(point.value) });
		};
		chart.subscribeCrosshairMove(onMove);
		return () => {
			chart.unsubscribeCrosshairMove(onMove);
			chart.remove();
			chartRef.current = null;
			seriesRef.current = null;
		};
	}, []);

	useEffect(() => {
		const chart = chartRef.current;
		if (!chart) return;
		if (seriesRef.current) chart.removeSeries(seriesRef.current);
		const definition = { baseline: BaselineSeries, area: AreaSeries, line: LineSeries }[type];
		const series = chart.addSeries(definition as typeof LineSeries, { priceLineVisible: false }) as ISeriesApi<
			"Area" | "Line" | "Baseline"
		>;
		seriesRef.current = series;
		series.setData(dataRef.current);
		series.createPriceLine({
			price: baseline,
			lineStyle: LineStyle.Dashed,
			lineWidth: 1,
			axisLabelVisible: false,
		});
		// The price line is recreated with the series; colours are applied below.
	}, [type, baseline]);

	useEffect(() => {
		chartRef.current?.applyOptions({
			layout: {
				background: { type: ColorType.Solid, color: "transparent" },
				textColor: colors.text,
				fontFamily: "DM Mono, monospace",
				fontSize: colors.fontSize,
				attributionLogo: false,
			},
			grid: { vertLines: { visible: false }, horzLines: { color: colors.grid } },
			crosshair: {
				vertLine: { color: colors.crosshair, labelBackgroundColor: colors.accent },
				horzLine: { color: colors.crosshair, labelBackgroundColor: colors.accent },
			},
		});
		const series = seriesRef.current;
		if (!series) return;
		const options = {
			baseline: {
				baseValue: { type: "price" as const, price: baseline },
				topLineColor: colors.gain,
				topFillColor1: colors.gainFill,
				topFillColor2: colors.gainFade,
				bottomLineColor: colors.loss,
				bottomFillColor1: colors.lossFade,
				bottomFillColor2: colors.lossFill,
				lineWidth: 2 as const,
			},
			area: { lineColor: colors.accent, topColor: colors.accentFill, bottomColor: colors.accentFade, lineWidth: 2 as const },
			line: { color: colors.accent, lineWidth: 2 as const },
		}[type];
		series.applyOptions(options);
		for (const line of series.priceLines()) line.applyOptions({ color: colors.text });
	}, [colors, type, baseline]);

	useEffect(() => {
		const series = seriesRef.current;
		if (!series) return;
		const byTime = new Map<number, number>();
		changeRef.current = new Map();
		for (const point of points) {
			const time = toChartTime(point.timestamp);
			if (time === null) continue;
			byTime.set(time, point.value);
			changeRef.current.set(time, point.change_pct);
		}
		dataRef.current = [...byTime]
			.sort(([a], [b]) => a - b)
			.map(([time, value]) => ({ time: time as UTCTimestamp, value }));
		series.setData(dataRef.current);
		chartRef.current?.timeScale().fitContent();
	}, [points]);

	// Declared after the data effect so a refetch lands first and the live
	// value is re-applied on top of it. Never steps back in time: the client
	// clock can trail the server's candle timestamps.
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-apply after new points or a new series
	useEffect(() => {
		const series = seriesRef.current;
		const data = dataRef.current;
		if (!series || live == null || !Number.isFinite(live.value) || !data.length) return;
		const last = data[data.length - 1];
		const time = Math.max(Math.floor(Date.now() / 1000), last.time) as UTCTimestamp;
		const point = { time, value: live.value };
		changeRef.current.set(time, live.change_pct);
		if (time === last.time) data[data.length - 1] = point;
		else data.push(point);
		series.update(point);
	}, [live?.value, live?.change_pct, points, type]);

	const lastPoint = dataRef.current[dataRef.current.length - 1];
	const shownValue = hovered?.value ?? live?.value ?? lastPoint?.value;
	const shownTime = hovered?.time;
	const vsBaseline = hovered
		? (changeRef.current.get(hovered.time) ?? null)
		: (live?.change_pct ?? (lastPoint ? (changeRef.current.get(lastPoint.time) ?? null) : null));

	return (
		<ChartFrame
			label={label}
			filename={label.toLowerCase().replace(/\s+/g, "-")}
			chartRef={chartRef}
			containerRef={containerRef}
			chartClassName={cn("h-64", className)}
			toolbar={
				<ChartToggle
					label="Chart type"
					value={type}
					onChange={setType}
					options={[
						{ value: "baseline", label: "Above or below the start", icon: ChartSpline },
						{ value: "area", label: "Area", icon: ChartArea },
						{ value: "line", label: "Line", icon: ChartLine },
					]}
				/>
			}
			legend={
				<div className="flex min-h-5 flex-wrap items-center gap-x-3 font-mono text-xs tabular-nums">
					<span className="text-muted-foreground">
						{shownTime ? formatTime(new Date(shownTime * 1000)) : "Now"}
					</span>
					<span>{shownValue == null ? "—" : formatValue(shownValue)}</span>
					<span className={trendText(vsBaseline)}>{formatPct(vsBaseline)} since start</span>
				</div>
			}
			table={() => ({
				caption: `${label}, newest first`,
				columns: ["Time", "Value", "Since start"],
				rows: dataRef.current
					.slice(-100)
					.reverse()
					.map((point) => {
						const pct = changeRef.current.get(point.time) ?? null;
						return {
							key: point.time,
							cells: [
								formatTime(new Date(point.time * 1000)),
								formatValue(point.value),
								<span key="pct" className={trendText(pct)}>
									{formatPct(pct)}
								</span>,
							],
						};
					}),
			})}
		/>
	);
}
