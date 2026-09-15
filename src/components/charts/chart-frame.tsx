import {
	ChevronsLeft,
	ChevronsRight,
	ImageDown,
	type LucideIcon,
	Maximize,
	Minimize,
	RotateCcw,
	Table2,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import {
	type KeyboardEvent,
	type ReactNode,
	type RefObject,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { Button } from "#/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";

type LogicalRange = { from: number; to: number };

/** The parts of a TradingView chart the controls drive; time and price charts both fit. */
export type ControllableChart = {
	timeScale(): {
		getVisibleLogicalRange(): LogicalRange | null;
		setVisibleLogicalRange(range: LogicalRange): void;
		fitContent(): void;
	};
	takeScreenshot(addTopLayer?: boolean, includeCrosshair?: boolean): HTMLCanvasElement;
};

export type ChartTable = {
	caption: string;
	columns: string[];
	/** Newest first. */
	rows: { key: string | number; cells: ReactNode[] }[];
};

const zoom = (chart: ControllableChart, factor: number) => {
	const scale = chart.timeScale();
	const range = scale.getVisibleLogicalRange();
	if (!range) return;
	const center = (range.from + range.to) / 2;
	// Never narrower than a handful of bars.
	const half = Math.max(((range.to - range.from) / 2) * factor, 3);
	scale.setVisibleLogicalRange({ from: center - half, to: center + half });
};

const pan = (chart: ControllableChart, direction: -1 | 1) => {
	const scale = chart.timeScale();
	const range = scale.getVisibleLogicalRange();
	if (!range) return;
	const step = (range.to - range.from) * 0.2 * direction;
	scale.setVisibleLogicalRange({ from: range.from + step, to: range.to + step });
};

function ControlButton({
	icon: Icon,
	label,
	shortcut,
	onClick,
	pressed,
}: {
	icon: LucideIcon;
	label: string;
	shortcut?: string;
	onClick: () => void;
	pressed?: boolean;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onClick={onClick}
					aria-label={label}
					aria-keyshortcuts={shortcut}
					aria-pressed={pressed}
					className={cn(pressed && "bg-muted text-foreground")}
				>
					<Icon />
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				{label}
				{shortcut && <kbd className="ml-1.5 font-mono opacity-70">{shortcut}</kbd>}
			</TooltipContent>
		</Tooltip>
	);
}

/**
 * Everything around a TradingView chart: a toolbar of labelled controls, a
 * legend, keyboard control of the chart itself, fullscreen, a PNG download and
 * the same data as a table for anyone who cannot use the picture.
 *
 * The chart is created by the caller inside `containerRef`.
 */
export function ChartFrame({
	label,
	chartRef,
	containerRef,
	filename,
	toolbar,
	legend,
	table,
	onViewportChange,
	className,
	chartClassName,
}: {
	label: string;
	chartRef: RefObject<ControllableChart | null>;
	containerRef: RefObject<HTMLDivElement | null>;
	filename: string;
	/** Chart-specific controls (type, range), shown before the shared ones. */
	toolbar?: ReactNode;
	legend?: ReactNode;
	table: () => ChartTable;
	/** Called when a shared control moves the view, e.g. to clear a range selection. */
	onViewportChange?: () => void;
	className?: string;
	chartClassName?: string;
}) {
	const frameRef = useRef<HTMLDivElement>(null);
	const hintId = useId();
	const [showTable, setShowTable] = useState(false);
	const [fullscreen, setFullscreen] = useState(false);

	useEffect(() => {
		const onChange = () => setFullscreen(document.fullscreenElement === frameRef.current);
		document.addEventListener("fullscreenchange", onChange);
		return () => document.removeEventListener("fullscreenchange", onChange);
	}, []);

	const withChart = (action: (chart: ControllableChart) => void) => () => {
		if (!chartRef.current) return;
		action(chartRef.current);
		onViewportChange?.();
	};

	const actions = {
		zoomIn: withChart((chart) => zoom(chart, 0.7)),
		zoomOut: withChart((chart) => zoom(chart, 1.4)),
		panLeft: withChart((chart) => pan(chart, -1)),
		panRight: withChart((chart) => pan(chart, 1)),
		reset: withChart((chart) => chart.timeScale().fitContent()),
		toggleTable: () => setShowTable((shown) => !shown),
		download: () => {
			chartRef.current?.takeScreenshot(true, false).toBlob((blob) => {
				if (!blob) return;
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = `${filename}.png`;
				link.click();
				URL.revokeObjectURL(url);
			});
		},
		toggleFullscreen: () => {
			if (document.fullscreenElement) void document.exitFullscreen();
			else void frameRef.current?.requestFullscreen?.();
		},
	};

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		const handler: Record<string, (() => void) | undefined> = {
			ArrowLeft: actions.panLeft,
			ArrowRight: actions.panRight,
			"+": actions.zoomIn,
			"=": actions.zoomIn,
			"-": actions.zoomOut,
			"0": actions.reset,
			Home: actions.reset,
			f: actions.toggleFullscreen,
			t: actions.toggleTable,
		};
		const run = handler[event.key];
		if (!run) return;
		event.preventDefault();
		run();
	};

	const data = showTable ? table() : null;

	return (
		<div
			ref={frameRef}
			className={cn("flex flex-col gap-2", fullscreen && "h-full bg-background p-4 md:p-6", className)}
		>
			<div role="toolbar" aria-label={`${label} controls`} className="flex flex-wrap items-center gap-1">
				{toolbar}
				<div className="ml-auto flex flex-wrap items-center gap-0.5">
					<ControlButton icon={ZoomOut} label="Zoom out" shortcut="-" onClick={actions.zoomOut} />
					<ControlButton icon={ZoomIn} label="Zoom in" shortcut="+" onClick={actions.zoomIn} />
					<ControlButton icon={ChevronsLeft} label="Scroll back" shortcut="←" onClick={actions.panLeft} />
					<ControlButton icon={ChevronsRight} label="Scroll forward" shortcut="→" onClick={actions.panRight} />
					<ControlButton icon={RotateCcw} label="Show everything" shortcut="0" onClick={actions.reset} />
					<span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
					<ControlButton
						icon={Table2}
						label={showTable ? "Hide data table" : "Show data table"}
						shortcut="T"
						onClick={actions.toggleTable}
						pressed={showTable}
					/>
					<ControlButton icon={ImageDown} label="Save as image" onClick={actions.download} />
					<ControlButton
						icon={fullscreen ? Minimize : Maximize}
						label={fullscreen ? "Exit full screen" : "Full screen"}
						shortcut="F"
						onClick={actions.toggleFullscreen}
					/>
				</div>
			</div>
			{legend}
			{/* Focusable so the keyboard can drive the chart, like the buttons above. */}
			{/* biome-ignore lint/a11y/useSemanticElements: a canvas chart, not a form group */}
			<div
				ref={containerRef}
				// biome-ignore lint/a11y/noNoninteractiveTabindex: the chart responds to keys
				tabIndex={0}
				role="group"
				aria-roledescription="chart"
				aria-label={label}
				aria-describedby={hintId}
				onKeyDown={onKeyDown}
				// The chart zooms on the wheel itself.
				onWheel={onViewportChange}
				className={cn(
					"relative w-full rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
					fullscreen ? "min-h-0 flex-1" : "h-64",
					!fullscreen && chartClassName,
				)}
			/>
			<p id={hintId} className="sr-only">
				Arrow keys scroll, plus and minus or the mouse wheel zoom, 0 shows everything, T shows the data as a table, F goes
				full screen.
			</p>
			{data && (
				<div className="max-h-72 overflow-auto rounded-md border">
					<table className="w-full text-xs">
						<caption className="sr-only">{data.caption}</caption>
						<thead className="sticky top-0 bg-muted text-muted-foreground">
							<tr>
								{data.columns.map((column, index) => (
									<th key={column} scope="col" className={cn("px-3 py-2 font-medium", index === 0 ? "text-left" : "text-right")}>
										{column}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y font-mono tabular-nums">
							{data.rows.map((row) => (
								<tr key={row.key}>
									{row.cells.map((cell, index) => (
										<td
											// biome-ignore lint/suspicious/noArrayIndexKey: cells are positional
											key={index}
											className={cn("px-3 py-1.5", index === 0 ? "text-left text-muted-foreground" : "text-right")}
										>
											{cell}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

/** A labelled, icon-only toggle group for chart types and ranges. */
export function ChartToggle<T extends string>({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: T | null;
	options: { value: T; label: string; icon?: LucideIcon; text?: string }[];
	onChange: (value: T) => void;
}) {
	return (
		<fieldset className="m-0 flex min-w-0 items-center rounded-lg border-0 bg-muted p-0.5">
			<legend className="sr-only">{label}</legend>
			{options.map((option) => {
				const active = option.value === value;
				const Icon = option.icon;
				const button = (
					<button
						key={option.value}
						type="button"
						aria-pressed={active}
						aria-label={option.label}
						onClick={() => onChange(option.value)}
						className={cn(
							"flex h-7 min-w-7 items-center justify-center gap-1 rounded-md px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
							active && "bg-background text-foreground shadow-sm",
						)}
					>
						{Icon ? <Icon className="size-4" /> : option.text}
					</button>
				);
				return Icon ? (
					<Tooltip key={option.value}>
						<TooltipTrigger asChild>{button}</TooltipTrigger>
						<TooltipContent>{option.label}</TooltipContent>
					</Tooltip>
				) : (
					button
				);
			})}
		</fieldset>
	);
}

/** A chart type remembered per chart, per browser. */
export function useStoredChoice<T extends string>(key: string, allowed: readonly T[], fallback: T) {
	const [value, setValue] = useState<T>(() => {
		try {
			const stored = localStorage.getItem(`bazaar:chart:${key}`) as T | null;
			return stored && allowed.includes(stored) ? stored : fallback;
		} catch {
			return fallback;
		}
	});
	const update = (next: T) => {
		setValue(next);
		try {
			localStorage.setItem(`bazaar:chart:${key}`, next);
		} catch {
			// Remembered for this visit only.
		}
	};
	return [value, update] as const;
}
