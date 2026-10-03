import { addMinutes, format, isValid, parse, startOfDay } from "date-fns";
import { CalendarClock } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import { Separator } from "#/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { cn } from "#/lib/utils";

// The same local "2026-10-03T15:30" string a datetime-local input uses, so the
// picker drops in wherever one was, and callers convert to an instant as before.
const VALUE_FORMAT = "yyyy-MM-dd'T'HH:mm";

const pad = (value: number) => String(value).padStart(2, "0");

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ["AM", "PM"] as const;

const parseValue = (value: string) => {
	if (!value) return undefined;
	const date = parse(value, VALUE_FORMAT, new Date());
	return isValid(date) ? date : undefined;
};

const atMinute = (day: Date, minuteOfDay: number) =>
	addMinutes(startOfDay(day), minuteOfDay);

const minuteOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();

// The viewer's offset, e.g. "GMT+5:30", so it is plain which clock the times are on.
const zoneLabel = () =>
	new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
		.formatToParts(new Date())
		.find((part) => part.type === "timeZoneName")?.value ?? "";

/** Row height of a wheel, in px; matches h-9 on each row. */
const ROW = 36;

/**
 * One scroll wheel: rows snap to a highlighted band in the middle, and
 * whichever row settles there is the value. Scroll, drag, click a row or use
 * the arrow keys.
 */
function Wheel<T extends string | number>({
	label,
	options,
	value,
	onChange,
	render = String,
}: {
	label: string;
	options: readonly T[];
	value: T;
	onChange: (value: T) => void;
	render?: (option: T) => string;
}) {
	const list = useRef<HTMLDivElement>(null);
	const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
	const placed = useRef(false);
	const idPrefix = useId();
	const index = Math.max(0, options.indexOf(value));

	// Brings the value to the band: at once on opening, smoothly after.
	useLayoutEffect(() => {
		const el = list.current;
		if (!el || Math.round(el.scrollTop / ROW) === index) {
			placed.current = true;
			return;
		}
		el.scrollTo({ top: index * ROW, behavior: placed.current ? "smooth" : "instant" });
		placed.current = true;
	}, [index]);

	useEffect(() => () => clearTimeout(settle.current), []);

	// A wheel laid out while hidden (the phone's other pane) could not scroll,
	// so it lands on the value again whenever it gets a size.
	const indexRef = useRef(index);
	indexRef.current = index;
	useEffect(() => {
		const el = list.current;
		if (!el) return;
		const observer = new ResizeObserver(() => {
			if (el.clientHeight > 0) el.scrollTop = indexRef.current * ROW;
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const pick = (next: number) => {
		const clamped = Math.min(options.length - 1, Math.max(0, next));
		if (clamped !== index) onChange(options[clamped]);
	};

	return (
		<div className="relative h-full min-w-0 flex-1">
			{/* The band the chosen row sits in. */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-1 top-1/2 h-9 -translate-y-1/2 rounded-md bg-muted"
			/>
			<div
				ref={list}
				role="listbox"
				aria-label={label}
				aria-activedescendant={`${idPrefix}-${index}`}
				tabIndex={0}
				onScroll={(event) => {
					const el = event.currentTarget;
					clearTimeout(settle.current);
					// Read once the snap has come to rest.
					settle.current = setTimeout(() => pick(Math.round(el.scrollTop / ROW)), 90);
				}}
				onKeyDown={(event) => {
					const step = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 }[event.key];
					if (step === undefined) return;
					event.preventDefault();
					pick(index + step);
				}}
				className="relative h-full snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-md outline-none [scrollbar-width:none] focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]"
			>
				{/* Spacers let the first and last rows reach the middle. */}
				<div aria-hidden="true" className="h-[calc(50%-18px)]" />
				{options.map((option, i) => (
					// biome-ignore lint/a11y/useKeyWithClickEvents: the listbox takes the keys (arrows, page up/down) and points at the chosen row with aria-activedescendant.
					<div
						key={option}
						id={`${idPrefix}-${i}`}
						role="option"
						tabIndex={-1}
						aria-selected={i === index}
						onClick={() => pick(i)}
						className={cn(
							"flex h-9 cursor-pointer snap-center items-center justify-center text-sm tabular-nums transition-colors select-none",
							i === index
								? "font-medium text-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{render(option)}
					</div>
				))}
				<div aria-hidden="true" className="h-[calc(50%-18px)]" />
			</div>
		</div>
	);
}

/**
 * A date and a time in one field. The popover pairs a month calendar with
 * hour, minute and AM/PM wheels, and the field shows the result back as
 * "Sat 3 Oct 2026, 10:00 AM". Everything is the app's own controls, so it
 * follows the theme instead of each browser's native pickers.
 */
export function DateTimePicker({
	id,
	value,
	onChange,
	onBlur,
	placeholder = "Pick a date and time",
	defaultTime = "10:00",
	disablePast = false,
	disabled,
	className,
	"aria-label": ariaLabel,
	"aria-invalid": ariaInvalid,
}: {
	id?: string;
	/** Local date and time as "yyyy-MM-ddTHH:mm", or "" for none. */
	value: string;
	onChange: (value: string) => void;
	onBlur?: () => void;
	placeholder?: string;
	/** The time used when a day is picked before any time is set. */
	defaultTime?: string;
	/** Greys out days already gone, and flags a time already gone. */
	disablePast?: boolean;
	disabled?: boolean;
	className?: string;
	"aria-label"?: string;
	"aria-invalid"?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const selected = parseValue(value);
	const [month, setMonth] = useState<Date>(selected ?? new Date());
	// Phones show the calendar and the wheels one at a time; wider screens
	// show both side by side and ignore this.
	const [pane, setPane] = useState<"date" | "time">("date");

	const [defaultHours, defaultMinutes] = defaultTime.split(":").map(Number);
	const minute = selected
		? minuteOfDay(selected)
		: defaultHours * 60 + defaultMinutes;
	const hours24 = Math.floor(minute / 60);
	const hour12 = hours24 % 12 || 12;
	const minutes = minute % 60;
	const period = hours24 >= 12 ? "PM" : "AM";

	const now = new Date();
	// A time set before a day goes on today.
	const day = selected ?? now;
	const inPast = Boolean(selected) && disablePast && (selected as Date) < now;

	const emit = (date: Date) => onChange(format(date, VALUE_FORMAT));
	const setTime = (next: { hour12?: number; minutes?: number; period?: string }) => {
		const h12 = next.hour12 ?? hour12;
		const h24 = (h12 % 12) + ((next.period ?? period) === "PM" ? 12 : 0);
		emit(atMinute(day, h24 * 60 + (next.minutes ?? minutes)));
	};

	return (
		<Popover
			// Modal: inside a dialog, the dialog's scroll lock otherwise swallows
			// the wheel over this popover (it is portalled outside the dialog).
			modal
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) {
					setMonth(selected ?? new Date());
					setPane("date");
				}
				else onBlur?.();
			}}
		>
			<PopoverTrigger asChild>
				<Button
					id={id}
					type="button"
					variant="outline"
					disabled={disabled}
					aria-label={ariaLabel}
					aria-invalid={ariaInvalid}
					className={cn(
						"w-full justify-start font-normal tabular-nums",
						!selected && "text-muted-foreground",
						className,
					)}
				>
					<CalendarClock data-icon="inline-start" />
					<span className="truncate">
						{selected
							? format(selected, "EEE d MMM yyyy, h:mm a")
							: placeholder}
					</span>
				</Button>
			</PopoverTrigger>
			{/* Never taller than the room beside the field: on a phone the stacked
			    calendar and wheels can be, so the popover scrolls instead. */}
			<PopoverContent
				align="start"
				collisionPadding={8}
				// Focus stays on the field rather than ringing the first button
				// inside; Tab still moves into the picker.
				onOpenAutoFocus={(event) => event.preventDefault()}
				className="max-h-(--radix-popover-content-available-height) w-auto overflow-y-auto p-0"
			>
				<ToggleGroup
					type="single"
					spacing={0.5}
					value={pane}
					onValueChange={(next) => next && setPane(next as typeof pane)}
					aria-label="Show"
					className="mx-2 mt-2 grid w-auto grid-cols-2 bg-muted p-0.5 sm:hidden"
				>
					<ToggleGroupItem
						value="date"
						className="h-7 rounded-md text-xs text-muted-foreground aria-checked:bg-background aria-checked:text-foreground aria-checked:shadow-sm"
					>
						{selected ? format(selected, "EEE d MMM") : "Date"}
					</ToggleGroupItem>
					<ToggleGroupItem
						value="time"
						className="h-7 rounded-md text-xs text-muted-foreground tabular-nums aria-checked:bg-background aria-checked:text-foreground aria-checked:shadow-sm"
					>
						{format(atMinute(day, minute), "h:mm a")}
					</ToggleGroupItem>
				</ToggleGroup>
				<div className="flex flex-col sm:flex-row">
					<Calendar
						mode="single"
						selected={selected}
						month={month}
						onMonthChange={setMonth}
						className={cn(
							"p-3 [--cell-size:--spacing(9)]",
							pane !== "date" && "hidden sm:block",
						)}
						classNames={{
							// Outlined, not filled: a filled today reads as the selection.
							today:
								"rounded-(--cell-radius) [&>button]:font-semibold [&>button]:ring-1 [&>button]:ring-border [&>button]:ring-inset",
						}}
						disabled={
							disablePast ? { before: startOfDay(new Date()) } : undefined
						}
						onSelect={(next) => {
							if (!next) return;
							let at = atMinute(next, minute);
							// Picking today must not land on a time already gone: the
							// next five-minute mark instead.
							if (disablePast && at < new Date()) {
								at = atMinute(next, Math.ceil((minuteOfDay(new Date()) + 1) / 5) * 5);
							}
							emit(at);
							setPane("time");
						}}
					/>
					<Separator orientation="vertical" className="hidden sm:block" />
					{/* w-69 on phones: the calendar's width, so switching panes
					    does not resize the popover. */}
					<div
						className={cn(
							"flex w-69 flex-col sm:w-48",
							pane !== "time" && "hidden sm:flex",
						)}
					>
						{/* As tall as the calendar beside it, less the row below. */}
						<div className="relative h-44 shrink-0 sm:h-auto sm:flex-1">
							<div className="absolute inset-0 flex gap-0.5 p-2">
								<Wheel
									label="Hour"
									options={HOURS}
									value={hour12}
									onChange={(next) => setTime({ hour12: next })}
								/>
								<Wheel
									label="Minute"
									options={MINUTES}
									value={minutes}
									onChange={(next) => setTime({ minutes: next })}
									render={pad}
								/>
								<Wheel
									label="AM or PM"
									options={PERIODS}
									value={period}
									onChange={(next) => setTime({ period: next })}
								/>
							</div>
						</div>
						<Separator />
						<div className="flex items-center gap-1 p-2">
							<span
								className={cn(
									"min-w-0 flex-1 truncate pl-1 text-xs",
									inPast ? "text-loss" : "text-muted-foreground",
								)}
								title={inPast ? undefined : "Times are in your time zone"}
							>
								{inPast ? "Already passed" : zoneLabel()}
							</span>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onClick={() => {
									const current = new Date();
									current.setSeconds(0, 0);
									setMonth(current);
									emit(current);
								}}
							>
								Now
							</Button>
							<Button type="button" size="sm" onClick={() => setOpen(false)}>
								Done
							</Button>
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
