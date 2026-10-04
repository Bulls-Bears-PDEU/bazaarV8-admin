import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Lock, Plus, Search, Send, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { getAllStocks } from "#/api/stocks";
import { StockLogo } from "#/components/stock-logo";
import { DateTimePicker } from "#/components/date-time-picker";
import { Button } from "#/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "#/components/ui/sheet";
import { Spinner } from "#/components/ui/spinner";
import { Textarea } from "#/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { formatCountdown, formatDateTime, formatDuration, formatINR, plural } from "#/lib/format";
import { cn } from "#/lib/utils";
import { NEWS_LIMITS, type News, type NewsPayload } from "#/types/news";

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

const DURATION_PRESETS = [1, 10, 30, 60, 120, 300, 600, 900, 1800, 2700, 3600, 5400, 7200];
const SCHEDULE_PRESETS = [5, 15, 30, 60];
const MAX_SEARCH_RESULTS = 8;
// The row follows the story's default duration.
const DEFAULT = "default";

type Direction = "up" | "down";

type ImpactRow = {
	stockId: number;
	direction: Direction;
	// Kept as typed so a half-written "2." does not jump about.
	magnitude: string;
	duration: string;
};

type FormState = {
	title: string;
	content: string;
	releaseMode: "now" | "schedule";
	// A datetime-local value, in the admin's own time zone.
	releaseAt: string;
	defaultDuration: number;
	impacts: ImpactRow[];
};

const pad = (value: number) => String(value).padStart(2, "0");

const toLocalInput = (date: Date) =>
	`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const minutesFromNow = (minutes: number) => toLocalInput(new Date(Date.now() + minutes * 60_000));

const initialForm = (news: News | null): FormState => {
	if (!news) {
		return {
			title: "",
			content: "",
			releaseMode: "now",
			releaseAt: minutesFromNow(15),
			defaultDuration: NEWS_LIMITS.defaultDurationSeconds,
			impacts: [],
		};
	}
	return {
		title: news.title,
		content: news.content,
		releaseMode: "schedule",
		releaseAt: toLocalInput(new Date(news.release_at)),
		defaultDuration: news.default_duration_seconds,
		impacts: news.impacts.map((impact) => ({
			stockId: impact.stock_id,
			direction: impact.impact_pct < 0 ? "down" : "up",
			magnitude: String(Math.abs(impact.impact_pct)),
			duration: impact.duration_seconds === null ? DEFAULT : String(impact.duration_seconds),
		})),
	};
};

const durationOptions = (current: number | null) => {
	const values = new Set(DURATION_PRESETS);
	if (current !== null) values.add(current);
	return [...values].sort((a, b) => a - b);
};

const durationLabel = (seconds: number) => (seconds === 1 ? "Instant" : formatDuration(seconds));

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

/**
 * Writes or edits a story: the headline and body, when it goes out, and which
 * stocks it moves, by how much and over how long. A released story has already
 * moved prices, so only its wording can change.
 */
export function NewsEditor({
	open,
	onOpenChange,
	news,
	saving,
	onSave,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	// The story being edited, or null for a new one.
	news: News | null;
	saving: boolean;
	onSave: (payload: NewsPayload) => void;
}) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-2xl">
				{/* Keyed so the form starts fresh for every story. */}
				{open && (
					<EditorBody key={news?.id ?? "new"} news={news} saving={saving} onSave={onSave} onCancel={() => onOpenChange(false)} />
				)}
			</SheetContent>
		</Sheet>
	);
}

function EditorBody({
	news,
	saving,
	onSave,
	onCancel,
}: {
	news: News | null;
	saving: boolean;
	onSave: (payload: NewsPayload) => void;
	onCancel: () => void;
}) {
	const [form, setForm] = useState<FormState>(() => initialForm(news));
	const [error, setError] = useState<string | null>(null);
	const locked = news?.first_released_at != null;

	const stocksQuery = useQuery({ queryKey: ["stocks"], queryFn: () => getAllStocks() });
	const stocks = stocksQuery.data ?? [];
	const stockById = useMemo(() => new Map(stocks.map((stock) => [stock.id, stock])), [stocks]);

	const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

	const buildPayload = (): NewsPayload => {
		const title = form.title.trim();
		const content = form.content.trim();
		if (!title) throw new Error("Give the story a headline.");
		if (!content) throw new Error("Write the story's body.");
		if (locked) return { title, content };

		const impacts = form.impacts.map((row) => {
			const symbol = stockById.get(row.stockId)?.symbol ?? `Stock ${row.stockId}`;
			const magnitude = Number(row.magnitude);
			if (!Number.isFinite(magnitude) || magnitude <= 0 || magnitude > NEWS_LIMITS.maxImpactPct) {
				throw new Error(`${symbol}: enter an impact between 0 and ${NEWS_LIMITS.maxImpactPct}%.`);
			}
			return {
				stock_id: row.stockId,
				impact_pct: row.direction === "down" ? -magnitude : magnitude,
				duration_seconds: row.duration === DEFAULT ? null : Number(row.duration),
			};
		});

		const base = { title, content, default_duration_seconds: form.defaultDuration, impacts };
		if (form.releaseMode === "now") return { ...base, release_now: true };

		const releaseAt = new Date(form.releaseAt);
		if (Number.isNaN(releaseAt.getTime())) throw new Error("Pick when the story goes out.");
		return { ...base, release_at: releaseAt.toISOString() };
	};

	const submit = (event: React.FormEvent) => {
		event.preventDefault();
		try {
			setError(null);
			onSave(buildPayload());
		} catch (err) {
			setError(err instanceof Error ? err.message : "Check the form.");
		}
	};

	const submitLabel = locked
		? "Save changes"
		: form.releaseMode === "now"
			? "Release now"
			: news
				? "Save schedule"
				: "Schedule story";

	return (
		<form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
			<SheetHeader className="border-b">
				<SheetTitle>{news ? "Edit story" : "Write a story"}</SheetTitle>
				<SheetDescription>
					{locked
						? "This story has already moved prices, so only its wording can change."
						: "Players see the headline and body. The price impact stays hidden from them."}
				</SheetDescription>
			</SheetHeader>

			<div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-4">
				<Section title="Story">
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="news-title">Headline</FieldLabel>
							<Input
								id="news-title"
								value={form.title}
								maxLength={621}
								placeholder="Reliance wins ₹40,000 crore green hydrogen contract"
								onChange={(e) => update({ title: e.target.value })}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="news-content">Body</FieldLabel>
							<Textarea
								id="news-content"
								rows={8}
								value={form.content}
								placeholder="What happened, who said what, and why it matters."
								onChange={(e) => update({ content: e.target.value })}
							/>
							<FieldDescription>
								Markdown works: **bold**, _italic_, ## headings, - lists and [links](https://…). A blank line starts a
								new paragraph.
							</FieldDescription>
						</Field>
					</FieldGroup>
				</Section>

				{locked && news ? (
					<Section title="Release">
						<p className="text-sm text-muted-foreground">
							Went out {formatDateTime(news.first_released_at)}
							{!news.isReleased && ". It is hidden from players right now."}
						</p>
					</Section>
				) : (
					<ReleaseSection form={form} update={update} />
				)}

				<ImpactSection
					form={form}
					setForm={setForm}
					locked={locked}
					news={news}
					stocks={stocks}
					stocksLoading={stocksQuery.isPending}
				/>
			</div>

			<SheetFooter className="flex-row flex-wrap items-center justify-end border-t">
				{error && (
					<p role="alert" className="mr-auto text-sm text-destructive">
						{error}
					</p>
				)}
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" disabled={saving}>
					{saving ? (
						<Spinner data-icon="inline-start" />
					) : (
						!locked && form.releaseMode === "now" && <Send data-icon="inline-start" />
					)}
					{submitLabel}
				</Button>
			</SheetFooter>
		</form>
	);
}

function Section({
	title,
	description,
	action,
	children,
}: {
	title: string;
	description?: React.ReactNode;
	action?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3">
			<div className="flex flex-wrap items-end justify-between gap-2">
				<div className="flex flex-col gap-0.5">
					<h3 className="text-sm font-semibold tracking-tight">{title}</h3>
					{description && <p className="text-xs text-pretty text-muted-foreground">{description}</p>}
				</div>
				{action}
			</div>
			{children}
		</section>
	);
}

// ---------------------------------------------------------------------------
// Release
// ---------------------------------------------------------------------------

function ReleaseSection({ form, update }: { form: FormState; update: (patch: Partial<FormState>) => void }) {
	const releaseAt = new Date(form.releaseAt);
	const valid = !Number.isNaN(releaseAt.getTime());

	return (
		<Section title="Release">
			<ToggleGroup
				type="single"
				variant="outline"
				value={form.releaseMode}
				onValueChange={(value) => value && update({ releaseMode: value as FormState["releaseMode"] })}
				className="w-full sm:w-auto"
			>
				<ToggleGroupItem value="now" className="flex-1 px-4 sm:flex-none">
					As soon as I save
				</ToggleGroupItem>
				<ToggleGroupItem value="schedule" className="flex-1 px-4 sm:flex-none">
					At a set time
				</ToggleGroupItem>
			</ToggleGroup>

			{form.releaseMode === "schedule" && (
				<div className="flex flex-col gap-2">
					<div className="flex flex-wrap items-center gap-2">
						<DateTimePicker
							aria-label="Release time"
							className="w-auto"
							value={form.releaseAt}
							onChange={(releaseAt) => update({ releaseAt })}
							disablePast
						/>
						{SCHEDULE_PRESETS.map((minutes) => (
							<Button
								key={minutes}
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => update({ releaseAt: minutesFromNow(minutes) })}
							>
								+{formatDuration(minutes * 60)}
							</Button>
						))}
					</div>
					<p className="text-xs text-muted-foreground">
						{valid
							? `Goes out ${formatDateTime(releaseAt)} (${formatCountdown(releaseAt)}), then its impact starts.`
							: "Pick a date and time."}
					</p>
				</div>
			)}
		</Section>
	);
}

// ---------------------------------------------------------------------------
// Price impact
// ---------------------------------------------------------------------------

type StockOption = Awaited<ReturnType<typeof getAllStocks>>[number];

function ImpactSection({
	form,
	setForm,
	locked,
	news,
	stocks,
	stocksLoading,
}: {
	form: FormState;
	setForm: React.Dispatch<React.SetStateAction<FormState>>;
	locked: boolean;
	news: News | null;
	stocks: StockOption[];
	stocksLoading: boolean;
}) {
	const description = (
		<>
			Each stock moves by its percentage on top of the market, front-loaded: about two thirds lands in the first quarter
			of its duration and all of it by the end.
		</>
	);

	if (locked && news) {
		return (
			<Section title="Price impact" description="Already priced in. Impacts cannot change after release.">
				{news.impacts.length === 0 ? (
					<p className="text-sm text-muted-foreground">This story did not move any stock.</p>
				) : (
					<ul className="divide-y rounded-lg border">
						{news.impacts.map((impact) => (
							<li key={impact.stock_id} className="flex items-center gap-3 px-3 py-2 text-sm">
								<StockLogo symbol={impact.symbol} />
								<span className="w-24 font-mono font-medium">{impact.symbol}</span>
								<span className="min-w-0 flex-1 truncate text-muted-foreground">{impact.name}</span>
								<ImpactChip pct={impact.impact_pct} />
								<span className="w-16 text-right font-mono text-xs text-muted-foreground">
									{durationLabel(impact.duration_seconds ?? news.default_duration_seconds)}
								</span>
								<Lock className="size-3.5 text-muted-foreground" aria-hidden="true" />
							</li>
						))}
					</ul>
				)}
			</Section>
		);
	}

	const addStocks = (ids: number[]) =>
		setForm((prev) => {
			const present = new Set(prev.impacts.map((row) => row.stockId));
			const added = ids
				.filter((id) => !present.has(id))
				.map((stockId): ImpactRow => ({ stockId, direction: "up", magnitude: "2", duration: DEFAULT }));
			return { ...prev, impacts: [...prev.impacts, ...added] };
		});

	const updateRow = (stockId: number, patch: Partial<ImpactRow>) =>
		setForm((prev) => ({
			...prev,
			impacts: prev.impacts.map((row) => (row.stockId === stockId ? { ...row, ...patch } : row)),
		}));

	const removeRow = (stockId: number) =>
		setForm((prev) => ({ ...prev, impacts: prev.impacts.filter((row) => row.stockId !== stockId) }));

	const stockById = new Map(stocks.map((stock) => [stock.id, stock]));

	return (
		<Section title="Price impact" description={description}>
			<div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-muted/50 px-3 py-2">
				<span className="text-sm">Default time to full effect</span>
				<Select
					value={String(form.defaultDuration)}
					onValueChange={(value) => setForm((prev) => ({ ...prev, defaultDuration: Number(value) }))}
				>
					<SelectTrigger size="sm" className="w-32 bg-background" aria-label="Default time to full effect">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{durationOptions(form.defaultDuration).map((seconds) => (
								<SelectItem key={seconds} value={String(seconds)}>
									{durationLabel(seconds)}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
				<span className="text-xs text-muted-foreground">Used by every stock set to “Default”.</span>
			</div>

			<StockPicker
				stocks={stocks}
				loading={stocksLoading}
				excluded={new Set(form.impacts.map((row) => row.stockId))}
				onAdd={addStocks}
			/>

			{form.impacts.length === 0 ? (
				<div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
					No stocks yet. Without any, the story is flavour text and moves nothing.
				</div>
			) : (
				<>
					<BulkBar
						count={form.impacts.length}
						defaultDuration={form.defaultDuration}
						onApply={(patch) =>
							setForm((prev) => ({ ...prev, impacts: prev.impacts.map((row) => ({ ...row, ...patch })) }))
						}
						onClear={() => setForm((prev) => ({ ...prev, impacts: [] }))}
					/>
					<ul className="divide-y rounded-lg border">
						{form.impacts.map((row) => {
							const stock = stockById.get(row.stockId);
							return (
								<ImpactRowEditor
									key={row.stockId}
									row={row}
									stock={stock}
									defaultDuration={form.defaultDuration}
									onChange={(patch) => updateRow(row.stockId, patch)}
									onRemove={() => removeRow(row.stockId)}
								/>
							);
						})}
					</ul>
				</>
			)}
		</Section>
	);
}

function ImpactChip({ pct }: { pct: number }) {
	return (
		<span
			className={cn(
				"inline-flex w-20 items-center justify-end gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-xs tabular-nums",
				pct > 0 ? "bg-gain-muted text-gain" : "bg-loss-muted text-loss",
			)}
		>
			{pct > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
			{Math.abs(pct)}%
		</span>
	);
}

function DirectionToggle({ value, onChange, label }: { value: Direction; onChange: (value: Direction) => void; label: string }) {
	return (
		<fieldset aria-label={label} className="m-0 flex h-8 shrink-0 overflow-hidden rounded-lg border p-0">
			<button
				type="button"
				aria-pressed={value === "up"}
				aria-label="Up"
				onClick={() => onChange("up")}
				className={cn(
					"flex h-full w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted",
					value === "up" && "bg-gain-muted text-gain hover:bg-gain-muted",
				)}
			>
				<ArrowUp className="size-4" />
			</button>
			<button
				type="button"
				aria-pressed={value === "down"}
				aria-label="Down"
				onClick={() => onChange("down")}
				className={cn(
					"flex h-full w-8 items-center justify-center border-l text-muted-foreground transition-colors hover:bg-muted",
					value === "down" && "bg-loss-muted text-loss hover:bg-loss-muted",
				)}
			>
				<ArrowDown className="size-4" />
			</button>
		</fieldset>
	);
}

function PercentInput({
	value,
	onChange,
	label,
	direction,
}: {
	value: string;
	onChange: (value: string) => void;
	label: string;
	direction?: Direction;
}) {
	return (
		<InputGroup className="w-24 shrink-0 bg-background">
			<InputGroupInput
				type="number"
				inputMode="decimal"
				min={0}
				max={NEWS_LIMITS.maxImpactPct}
				// Any value: a step would make the browser reject whole numbers such as 20.
				step="any"
				aria-label={label}
				value={value}
				onChange={(e) => onChange(e.target.value.replace("-", ""))}
				className={cn(
					"text-right font-mono tabular-nums",
					direction === "up" && "text-gain",
					direction === "down" && "text-loss",
				)}
			/>
			<InputGroupAddon align="inline-end">%</InputGroupAddon>
		</InputGroup>
	);
}

function DurationSelect({
	value,
	onChange,
	defaultDuration,
	label,
	allowDefault = true,
}: {
	value: string;
	onChange: (value: string) => void;
	defaultDuration: number;
	label: string;
	allowDefault?: boolean;
}) {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger className="w-36 shrink-0 bg-background" aria-label={label}>
				<SelectValue placeholder="Duration" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{allowDefault && <SelectItem value={DEFAULT}>Default ({durationLabel(defaultDuration)})</SelectItem>}
					{durationOptions(value === DEFAULT || value === "" ? null : Number(value)).map((seconds) => (
						<SelectItem key={seconds} value={String(seconds)}>
							{durationLabel(seconds)}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}

function ImpactRowEditor({
	row,
	stock,
	defaultDuration,
	onChange,
	onRemove,
}: {
	row: ImpactRow;
	stock: StockOption | undefined;
	defaultDuration: number;
	onChange: (patch: Partial<ImpactRow>) => void;
	onRemove: () => void;
}) {
	const symbol = stock?.symbol ?? `#${row.stockId}`;
	return (
		<li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
			<div className="flex min-w-0 flex-1 basis-48 items-center gap-2.5">
				<StockLogo symbol={symbol} />
				<div className="flex min-w-0 flex-col">
					<span className="font-mono text-sm font-medium">{symbol}</span>
					<span className="truncate text-xs text-muted-foreground">
						{stock ? `${stock.name} · ${formatINR(stock.last_price == null ? null : Number(stock.last_price))}` : "Unknown stock"}
					</span>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<DirectionToggle
					value={row.direction}
					onChange={(direction) => onChange({ direction })}
					label={`${symbol} direction`}
				/>
				<PercentInput
					value={row.magnitude}
					onChange={(magnitude) => onChange({ magnitude })}
					label={`${symbol} impact`}
					direction={row.direction}
				/>
				<DurationSelect
					value={row.duration}
					onChange={(duration) => onChange({ duration })}
					defaultDuration={defaultDuration}
					label={`${symbol} time to full effect`}
				/>
				<Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label={`Remove ${symbol}`}>
					<X />
				</Button>
			</div>
		</li>
	);
}

/** Sets every row at once, for stories that hit a whole sector alike. */
function BulkBar({
	count,
	defaultDuration,
	onApply,
	onClear,
}: {
	count: number;
	defaultDuration: number;
	onApply: (patch: Partial<ImpactRow>) => void;
	onClear: () => void;
}) {
	const [direction, setDirection] = useState<Direction>("up");
	const [magnitude, setMagnitude] = useState("2");
	const [duration, setDuration] = useState(DEFAULT);

	return (
		<div className="flex flex-wrap items-center gap-2 text-sm">
			<span className="mr-1 text-muted-foreground">{plural(count, "stock")}</span>
			{count > 1 && (
				<>
					<span className="text-muted-foreground">·</span>
					<span className="text-muted-foreground">Set all to</span>
					<DirectionToggle value={direction} onChange={setDirection} label="Direction for all" />
					<PercentInput value={magnitude} onChange={setMagnitude} label="Impact for all" direction={direction} />
					<DurationSelect
						value={duration}
						onChange={setDuration}
						defaultDuration={defaultDuration}
						label="Time to full effect for all"
					/>
					<Button
						type="button"
						variant="secondary"
						onClick={() => onApply({ direction, magnitude, duration })}
					>
						Apply
					</Button>
				</>
			)}
			<Button type="button" variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={onClear}>
				<Trash2 data-icon="inline-start" />
				Clear
			</Button>
		</div>
	);
}

/** Search by symbol, name or sector, or add a whole sector in one go. */
function StockPicker({
	stocks,
	loading,
	excluded,
	onAdd,
}: {
	stocks: StockOption[];
	loading: boolean;
	excluded: Set<number>;
	onAdd: (ids: number[]) => void;
}) {
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(0);

	const results = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return [];
		const available = stocks.filter((stock) => !excluded.has(stock.id));
		const bySymbol = available.filter((s) => s.symbol.toLowerCase().startsWith(q));
		const byName = available.filter(
			(s) => !s.symbol.toLowerCase().startsWith(q) && (s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q)),
		);
		return [...bySymbol, ...byName].slice(0, MAX_SEARCH_RESULTS);
	}, [stocks, excluded, query]);

	const sectors = useMemo(() => {
		const counts = new Map<string, number>();
		for (const stock of stocks) counts.set(stock.sector, (counts.get(stock.sector) ?? 0) + 1);
		return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
	}, [stocks]);

	const add = (stockId: number) => {
		onAdd([stockId]);
		setQuery("");
		setActive(0);
	};

	const onKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setActive((i) => Math.min(i + 1, results.length - 1));
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			setActive((i) => Math.max(i - 1, 0));
		} else if (event.key === "Enter") {
			// Never submits the form from here.
			event.preventDefault();
			if (results[active]) add(results[active].id);
		}
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap gap-2">
				<InputGroup className="min-w-0 flex-1 basis-60">
					<InputGroupAddon>
						<Search />
					</InputGroupAddon>
					<InputGroupInput
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							setActive(0);
						}}
						onKeyDown={onKeyDown}
						placeholder={loading ? "Loading stocks…" : "Add a stock: symbol, company or sector"}
						aria-label="Add a stock"
						aria-controls="news-stock-results"
						disabled={loading}
					/>
				</InputGroup>
				<Select
					value=""
					onValueChange={(sector) =>
						onAdd(stocks.filter((stock) => stock.sector === sector).map((stock) => stock.id))
					}
				>
					<SelectTrigger className="w-44" aria-label="Add a whole sector" disabled={loading}>
						<Plus className="size-4" />
						<SelectValue placeholder="Add a sector" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{sectors.map(([sector, count]) => (
								<SelectItem key={sector} value={sector}>
									{sector} ({count})
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>

			{query.trim() && (
				<ul id="news-stock-results" className="overflow-hidden rounded-lg border p-1" aria-label="Matching stocks">
					{results.length === 0 && (
						<li className="px-3 py-3 text-center text-sm text-muted-foreground">
							No stocks match “{query}”{excluded.size > 0 && ", or they are already added"}.
						</li>
					)}
					{results.map((stock, index) => (
						<li key={stock.id}>
							<button
								type="button"
								onClick={() => add(stock.id)}
								onMouseMove={() => setActive(index)}
								aria-current={index === active ? "true" : undefined}
								className={cn(
									"flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm",
									index === active && "bg-accent text-accent-foreground",
								)}
							>
								<StockLogo symbol={stock.symbol} size="xs" />
								<span className="w-24 shrink-0 font-mono font-medium">{stock.symbol}</span>
								<span className="min-w-0 flex-1 truncate text-muted-foreground">{stock.name}</span>
								<span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{stock.sector}</span>
								<Plus className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
