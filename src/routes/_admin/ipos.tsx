import { formOptions, useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { type ColumnDef, flexRender, useTable } from "@tanstack/react-table";
import { format } from "date-fns";
import {
	AlarmClock,
	CalendarClock,
	CircleCheck,
	CircleDashed,
	CirclePlay,
	CircleStop,
	CircleX,
	type LucideIcon,
	Pencil,
	Plus,
	Scale,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
	addIpo,
	getAllIposAdmin,
	removeIpoLogo,
	updateIpo,
	updateIpoStatus,
	uploadIpoLogo,
} from "#/api/ipos";
import { getAllSectors, getAllStocks } from "#/api/stocks";
import { usersErrorMessage } from "#/api/users";
import { DateTimePicker } from "#/components/date-time-picker";
import { IpoAllotDialog } from "#/components/ipo-allot-dialog";
import {
	type LogoChange,
	LogoChangePicker,
	LogoPicker,
} from "#/components/logo-picker";
import { PageHeader } from "#/components/page-header";
import { SectorCombobox } from "#/components/sector-combobox";
import { SectionTitle, Stat } from "#/components/stat";
import { StockLogo } from "#/components/stock-logo";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Loading } from "#/components/ui/loading";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Spinner } from "#/components/ui/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { type AdminTableFeatures, adminTableFeatures } from "#/lib/table";
import { cn } from "#/lib/utils";
import type { Ipo, IpoStatus } from "#/types/ipo";

export const Route = createFileRoute("/_admin/ipos")({
	component: RouteComponent,
});

const STATUS: Record<
	Ipo["status"],
	{ label: string; icon: LucideIcon; badge: string; hint: string }
> = {
	dormant: {
		label: "Dormant",
		icon: CircleDashed,
		badge: "border-dashed text-muted-foreground",
		hint: "Drafts players cannot see yet",
	},
	upcoming: {
		label: "Upcoming",
		icon: CalendarClock,
		badge: "border-primary/20 bg-primary/10 text-foreground",
		hint: "Announced, not yet taking bids",
	},
	open: {
		label: "Open",
		icon: CirclePlay,
		badge: "border-gain/30 bg-gain-muted text-gain",
		hint: "Taking subscriptions now",
	},
	closed: {
		label: "Closed",
		icon: CircleStop,
		badge: "bg-muted text-muted-foreground",
		hint: "Bidding over: allot, then list",
	},
	listed: {
		label: "Listed",
		icon: CircleCheck,
		badge: "border-primary/30 text-foreground",
		hint: "Trading on the market",
	},
	withdrawn: {
		label: "Withdrawn",
		icon: CircleX,
		badge: "border-loss/30 bg-loss-muted text-loss",
		hint: "Pulled before listing",
	},
};

// The lifecycle, in the order an organiser works through it.
const SECTIONS: { status: Ipo["status"]; empty: string }[] = [
	{ status: "open", empty: "No IPOs are taking subscriptions." },
	{ status: "upcoming", empty: "Nothing announced yet." },
	{ status: "closed", empty: "No IPOs are waiting to list." },
	{ status: "dormant", empty: "No drafts." },
	{ status: "listed", empty: "No IPOs have listed yet." },
];

const inrPrice = (value: number | string) =>
	Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// The schedule is only shown to players; nothing moves on its own. When a date
// has passed and the IPO is still waiting on the organiser, the row says so.
const overdueStep = (ipo: Ipo, now: number) => {
	const passed = (date: string) => new Date(date).getTime() <= now;
	if (ipo.status === "upcoming" && passed(ipo.open_date))
		return "Opening time passed";
	if (ipo.status === "open" && passed(ipo.close_date))
		return "Closing time passed";
	if (
		ipo.status === "closed" &&
		!ipo.allotment_completed_at &&
		passed(ipo.allotment_date)
	)
		return "Allotment time passed";
	return null;
};

function IpoTable({
	ipos,
	stockIdBySymbol,
	onEdit,
}: {
	ipos: Ipo[];
	stockIdBySymbol: Map<string, number>;
	onEdit: (ipo: Ipo) => void;
}) {
	const queryClient = useQueryClient();
	const [allotting, setAllotting] = useState<Ipo | null>(null);

	const updateStatusMutation = useMutation({
		mutationFn: ({ id, status }: { id: number; status: Ipo["status"] }) =>
			updateIpoStatus(id, status),
		onSuccess: async (_, { status }) => {
			toast.success("IPO status updated successfully.");
			await queryClient.invalidateQueries({ queryKey: ["admin-ipos"] });
			// Listing creates a stock; logos and links read the stock list.
			if (status === "listed")
				await queryClient.invalidateQueries({ queryKey: ["stocks"] });
		},
		onError: (error) => {
			toast.error(usersErrorMessage(error, "Failed to update IPO status."));
		},
	});

	const columns: ColumnDef<AdminTableFeatures, Ipo>[] = [
		{
			accessorKey: "symbol",
			header: "Symbol",
			cell: (info) => {
				const value = info.getValue<string>();
				return (
					<span className="flex items-center gap-2.5 font-mono font-medium">
						<StockLogo symbol={value} logoUrl={info.row.original.logo_url} />
						{value}
					</span>
				);
			},
		},
		{
			accessorKey: "name",
			header: "Company",
			cell: (info) => {
				const value = info.getValue<string>();
				return (
					<div className="max-w-[16rem] truncate" title={value}>
						{value}
					</div>
				);
			},
		},
		{
			accessorKey: "sector",
			header: "Sector",
			cell: (info) => {
				const value = info.getValue<string>();
				return <span className="text-muted-foreground">{value}</span>;
			},
		},
		{
			accessorKey: "min_price",
			header: "Price Range",
			cell: (info) => {
				const row = info.row.original;
				return (
					<span className="font-mono whitespace-nowrap tabular-nums">
						₹{inrPrice(row.min_price)}–{inrPrice(row.max_price)}
					</span>
				);
			},
		},
		{
			accessorKey: "subscription_rate",
			header: "Subscribed",
			cell: (info) => {
				const value = info.getValue<number>();
				return <span className="font-mono tabular-nums">{value}×</span>;
			},
		},
		{
			accessorKey: "open_date",
			header: "Opens",
			cell: (info) => (
				<span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
					{new Date(info.getValue<string>()).toLocaleDateString("en-IN")}
				</span>
			),
		},
		{
			accessorKey: "close_date",
			header: "Closes",
			cell: (info) => (
				<span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
					{new Date(info.getValue<string>()).toLocaleDateString("en-IN")}
				</span>
			),
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: (info) => {
				const {
					label,
					icon: Icon,
					badge,
				} = STATUS[info.getValue<Ipo["status"]>()];
				const { status, allotment_completed_at, allotment_price } =
					info.row.original;
				const overdue = overdueStep(info.row.original, Date.now());
				return (
					<span className="flex items-center gap-1.5">
						<Badge variant="outline" className={badge}>
							<Icon />
							{label}
						</Badge>
						{overdue && (
							<Badge
								variant="outline"
								className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
							>
								<AlarmClock />
								{overdue}
							</Badge>
						)}
						{status === "closed" && allotment_completed_at && (
							<Badge variant="secondary" className="font-mono tabular-nums">
								Allotted ₹{inrPrice(allotment_price ?? 0)}
							</Badge>
						)}
					</span>
				);
			},
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) => {
				// The IPO records the stock it became; the symbol lookup only covers
				// IPOs listed before that was recorded.
				const stockId =
					row.original.listed_stock_id ??
					stockIdBySymbol.get(row.original.symbol.toUpperCase());

				return (
					<div className="flex justify-end gap-2">
						{row.original.status !== "listed" &&
							row.original.status !== "withdrawn" && (
								<Button
									size="sm"
									variant="ghost"
									onClick={() => onEdit(row.original)}
								>
									<Pencil data-icon="inline-start" />
									Edit
								</Button>
							)}
						{row.original.status === "dormant" && (
							<Button
								size="sm"
								variant="secondary"
								onClick={() =>
									updateStatusMutation.mutate({
										id: row.original.id,
										status: "upcoming",
									})
								}
								disabled={updateStatusMutation.isPending}
							>
								{updateStatusMutation.isPending ? (
									<Spinner data-icon="inline-start" />
								) : (
									<CalendarClock data-icon="inline-start" />
								)}
								Release
							</Button>
						)}
						{row.original.status === "upcoming" && (
							<Button
								size="sm"
								variant="secondary"
								onClick={() =>
									updateStatusMutation.mutate({
										id: row.original.id,
										status: "open",
									})
								}
								disabled={updateStatusMutation.isPending}
							>
								{updateStatusMutation.isPending ? (
									<Spinner data-icon="inline-start" />
								) : (
									<CirclePlay data-icon="inline-start" />
								)}
								Open
							</Button>
						)}
						{row.original.status === "open" && (
							<Button
								size="sm"
								variant="secondary"
								onClick={() =>
									updateStatusMutation.mutate({
										id: row.original.id,
										status: "closed",
									})
								}
								disabled={updateStatusMutation.isPending}
							>
								{updateStatusMutation.isPending ? (
									<Spinner data-icon="inline-start" />
								) : (
									<CircleStop data-icon="inline-start" />
								)}
								Close
							</Button>
						)}
						{row.original.status === "closed" &&
							!row.original.allotment_completed_at && (
								<Button
									size="sm"
									variant="secondary"
									onClick={() => setAllotting(row.original)}
								>
									<Scale data-icon="inline-start" />
									Allot
								</Button>
							)}
						{/* Listing turns allotments into shares, so it waits for one. */}
						{row.original.status === "closed" &&
							row.original.allotment_completed_at && (
								<Button
									size="sm"
									variant="secondary"
									onClick={() =>
										updateStatusMutation.mutate({
											id: row.original.id,
											status: "listed",
										})
									}
									disabled={updateStatusMutation.isPending}
								>
									{updateStatusMutation.isPending ? (
										<Spinner data-icon="inline-start" />
									) : (
										<CircleCheck data-icon="inline-start" />
									)}
									List
								</Button>
							)}
						{row.original.status === "listed" &&
							(stockId ? (
								<Button size="sm" variant="outline" asChild>
									<Link to="/stock/$id" params={{ id: String(stockId) }}>
										View Stock
									</Link>
								</Button>
							) : (
								<Button size="sm" variant="outline" disabled>
									Stock Missing
								</Button>
							))}
					</div>
				);
			},
		},
	];

	const table = useTable({
		features: adminTableFeatures,
		data: ipos,
		columns,
	});

	return (
		<div className="overflow-x-auto rounded-lg border">
			<IpoAllotDialog ipo={allotting} onClose={() => setAllotting(null)} />
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id} className="hover:bg-transparent">
							{headerGroup.headers.map((header) => (
								<TableHead key={header.id} className="h-9 text-xs">
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.length ? (
						table.getRowModel().rows.map((row) => (
							<TableRow key={row.id}>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id} className="py-2">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell
								colSpan={columns.length}
								className="h-24 text-center text-muted-foreground"
							>
								No IPOs available.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}

// What each starting status means to players. Closed and listed are reached
// from the table: listing creates the stock and credits allotments.
const CREATE_STATUSES: { value: IpoStatus; label: string; hint: string }[] = [
	{
		value: "dormant",
		label: "Dormant (draft)",
		hint: "Saved for later. Players cannot see it until you release it.",
	},
	{
		value: "upcoming",
		label: "Upcoming",
		hint: "Players see it announced, with its dates, but cannot apply yet.",
	},
	{
		value: "open",
		label: "Open",
		hint: "Players can apply straight away.",
	},
];

const createDefaults = {
	name: "",
	symbol: "",
	sector: "",
	min_price: "",
	max_price: "",
	listing_price: "",
	lot_size: "",
	shares_offered: "",
	subscription_rate: "",
	open_date: "",
	close_date: "",
	allotment_date: "",
	status: "dormant" as IpoStatus,
};

// Blank numbers are left out: the backend applies optional ones' defaults and
// names any required one that is missing.
const optionalNumber = (value: string) =>
	value.trim() === "" ? undefined : Number(value);

// The picker gives the organiser's local time; sent as an instant.
const instant = (value: string) =>
	value ? new Date(value).toISOString() : undefined;

// An IPO's saved values as the form holds them: strings, local times.
const valuesFrom = (ipo: Ipo) => ({
	name: ipo.name,
	symbol: ipo.symbol,
	sector: ipo.sector,
	min_price: String(ipo.min_price),
	max_price: String(ipo.max_price),
	listing_price: Number(ipo.listing_price) > 0 ? String(ipo.listing_price) : "",
	lot_size: String(ipo.lot_size),
	shares_offered: String(ipo.shares_offered),
	subscription_rate:
		Number(ipo.starting_demand) > 0 ? String(ipo.starting_demand) : "",
	open_date: format(new Date(ipo.open_date), "yyyy-MM-dd'T'HH:mm"),
	close_date: format(new Date(ipo.close_date), "yyyy-MM-dd'T'HH:mm"),
	allotment_date: format(new Date(ipo.allotment_date), "yyyy-MM-dd'T'HH:mm"),
	status: ipo.status,
});

// Players' applications are built on these, so they are fixed once it opens.
const termsLockedFor = (ipo: Ipo | null) =>
	ipo !== null && ipo.status !== "dormant" && ipo.status !== "upcoming";

/** Creates an IPO, or edits one when given it. */
function IpoFormDialog({
	sectors,
	ipo,
	open,
	onOpenChange,
}: {
	sectors: string[];
	ipo: Ipo | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl">
				{/* Keyed, so the form starts from the right IPO each time. */}
				<IpoForm
					key={ipo?.id ?? "new"}
					sectors={sectors}
					ipo={ipo}
					onDone={() => onOpenChange(false)}
				/>
			</DialogContent>
		</Dialog>
	);
}

function IpoForm({
	sectors,
	ipo,
	onDone,
}: {
	sectors: string[];
	ipo: Ipo | null;
	onDone: () => void;
}) {
	const queryClient = useQueryClient();
	const editing = ipo !== null;
	const termsLocked = termsLockedFor(ipo);
	// A new IPO needs a logo: it is copied onto the stock when the IPO lists.
	const [logo, setLogo] = useState<File | null>(null);
	const [logoMissing, setLogoMissing] = useState(false);
	// When editing, a logo change waits for Save like the other fields.
	const [logoChange, setLogoChange] = useState<LogoChange>(undefined);

	const form = useForm({
		...formOptions({
			defaultValues: ipo ? valuesFrom(ipo) : createDefaults,
		}),
		onSubmit: async ({ value }) => {
			const details = {
				name: value.name.trim(),
				symbol: value.symbol.trim().toUpperCase(),
				sector: value.sector.trim(),
				min_price: optionalNumber(value.min_price),
				max_price: optionalNumber(value.max_price),
				// Blank means "list at the allotment price", stored as 0.
				listing_price: optionalNumber(value.listing_price) ?? 0,
				lot_size: optionalNumber(value.lot_size),
				shares_offered: optionalNumber(value.shares_offered),
				subscription_rate: optionalNumber(value.subscription_rate) ?? 0,
				open_date: instant(value.open_date),
				close_date: instant(value.close_date),
				allotment_date: instant(value.allotment_date),
			};

			if (ipo) {
				try {
					await updateIpo(ipo.id, details);
				} catch (error) {
					toast.error(usersErrorMessage(error, "Could not save the IPO."));
					return;
				}
				// The details are saved; a failed logo change keeps the dialog open
				// with the change still in it, so saving again retries it.
				let logoSaved = true;
				try {
					if (logoChange) await uploadIpoLogo(ipo.id, logoChange);
					else if (logoChange === null) await removeIpoLogo(ipo.id);
				} catch (error) {
					logoSaved = false;
					toast.error(
						usersErrorMessage(
							error,
							"Details saved, but the logo could not be changed.",
						),
					);
				}
				await queryClient.invalidateQueries({ queryKey: ["admin-ipos"] });
				if (!logoSaved) return;
				toast.success("IPO updated.");
				onDone();
				return;
			}

			if (!logo) {
				setLogoMissing(true);
				return;
			}

			let id: number;
			try {
				const res = await addIpo({ ...details, status: value.status });
				id = res.id;
			} catch (error) {
				toast.error(usersErrorMessage(error, "Could not create the IPO."));
				return;
			}

			// The IPO exists now; a failed logo upload should not lose it.
			try {
				await uploadIpoLogo(id, logo);
			} catch (error) {
				toast.error(
					usersErrorMessage(
						error,
						"IPO created, but the logo could not be uploaded. Try again from its row.",
					),
				);
			}

			await queryClient.invalidateQueries({ queryKey: ["admin-ipos"] });
			toast.success("IPO created.");
			onDone();
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
		>
			<DialogHeader>
				<DialogTitle>
					{editing ? `Edit ${ipo.symbol}` : "Create IPO"}
				</DialogTitle>
				<DialogDescription>
					{editing
						? "Changes reach players straight away. Status is changed from the IPOs table."
						: "A new company players can apply for shares in. You move it through its life from the IPOs page: release, open, close, allot, then list it as a tradable stock."}
				</DialogDescription>
			</DialogHeader>

			<FieldGroup className="my-6">
				<FieldSet>
					<FieldLegend>Company</FieldLegend>
					{ipo ? (
						<Field>
							<FieldLabel>Logo</FieldLabel>
							<LogoChangePicker
								symbol={ipo.symbol}
								currentUrl={ipo.logo_url}
								change={logoChange}
								onChange={setLogoChange}
							/>
							<FieldDescription>
								Shown on the IPO card and carried over to the stock when it
								lists.
							</FieldDescription>
						</Field>
					) : (
						<Field data-invalid={logoMissing || undefined}>
							<FieldLabel>Logo</FieldLabel>
							<form.Subscribe selector={(state) => state.values.symbol}>
								{(symbol) => (
									<LogoPicker
										symbol={symbol}
										file={logo}
										onChange={(file) => {
											setLogo(file);
											if (file) setLogoMissing(false);
										}}
									/>
								)}
							</form.Subscribe>
							<FieldDescription>
								Shown on the IPO card and carried over to the stock when it
								lists.
							</FieldDescription>
							{logoMissing && (
								<FieldError>Choose a logo for the IPO.</FieldError>
							)}
						</Field>
					)}
					<div className="grid gap-4 sm:grid-cols-2">
						<form.Field name="name">
							{({ state, handleChange, handleBlur }) => (
								<Field>
									<FieldLabel htmlFor="ipo-name">Company name</FieldLabel>
									<Input
										id="ipo-name"
										value={state.value}
										onChange={(e) => handleChange(e.target.value)}
										onBlur={handleBlur}
										placeholder="Tata Consultancy Services"
									/>
									<FieldDescription>
										Shown to players, and becomes the stock's name when it
										lists.
									</FieldDescription>
								</Field>
							)}
						</form.Field>
						<form.Field name="symbol">
							{({ state, handleChange, handleBlur }) => (
								<Field>
									<FieldLabel htmlFor="ipo-symbol">Symbol</FieldLabel>
									<Input
										id="ipo-symbol"
										className="font-mono uppercase"
										value={state.value}
										maxLength={10}
										onChange={(e) => handleChange(e.target.value)}
										onBlur={handleBlur}
										placeholder="TCS"
									/>
									<FieldDescription>
										The ticker players trade it under once listed. Up to 10
										letters or digits, not already used by a stock or another
										IPO.
									</FieldDescription>
								</Field>
							)}
						</form.Field>
					</div>
					<form.Field name="sector">
						{({ state, handleChange, handleBlur }) => (
							<Field>
								<FieldLabel htmlFor="ipo-sector">Sector</FieldLabel>
								<SectorCombobox
									id="ipo-sector"
									value={state.value}
									onChange={handleChange}
									onBlur={handleBlur}
									sectors={sectors}
								/>
								<FieldDescription>
									Becomes the listed stock's sector. Pick an existing one so it
									groups with similar stocks, or type a new name and choose "New
									sector".
								</FieldDescription>
							</Field>
						)}
					</form.Field>
				</FieldSet>

				<FieldSet>
					<FieldLegend>Price</FieldLegend>
					{termsLocked && (
						<FieldDescription>
							Fixed now the IPO has opened: players' applications are based on
							these.
						</FieldDescription>
					)}
					<div className="grid gap-4 sm:grid-cols-3">
						<form.Field name="min_price">
							{({ state, handleChange, handleBlur }) => (
								<Field>
									<FieldLabel htmlFor="ipo-min">Lowest bid (₹)</FieldLabel>
									<Input
										id="ipo-min"
										disabled={termsLocked}
										type="number"
										inputMode="decimal"
										step="0.01"
										min="0"
										value={state.value}
										onChange={(e) => handleChange(e.target.value)}
										onBlur={handleBlur}
									/>
									<FieldDescription>
										Bottom of the price band: the least a player can offer per
										share.
									</FieldDescription>
								</Field>
							)}
						</form.Field>
						<form.Field name="max_price">
							{({ state, handleChange, handleBlur }) => (
								<Field>
									<FieldLabel htmlFor="ipo-max">Highest bid (₹)</FieldLabel>
									<Input
										id="ipo-max"
										disabled={termsLocked}
										type="number"
										inputMode="decimal"
										step="0.01"
										min="0"
										value={state.value}
										onChange={(e) => handleChange(e.target.value)}
										onBlur={handleBlur}
									/>
									<FieldDescription>
										Top of the band, and the bid players get by default. It is
										also where the allotment price starts when you run
										allotment.
									</FieldDescription>
								</Field>
							)}
						</form.Field>
						<form.Field name="listing_price">
							{({ state, handleChange, handleBlur }) => (
								<Field>
									<FieldLabel htmlFor="ipo-listing">
										Listing price (₹)
									</FieldLabel>
									<Input
										id="ipo-listing"
										type="number"
										inputMode="decimal"
										step="0.01"
										min="0"
										value={state.value}
										onChange={(e) => handleChange(e.target.value)}
										onBlur={handleBlur}
										placeholder="Same as allotment price"
									/>
									<FieldDescription>
										Optional. The price the stock opens at when you list it.
										Players pay the allotment price, which you choose when you
										run allotment after the IPO closes. List above it and they
										start with a gain; below it, a loss. Leave blank to list at
										the allotment price.
									</FieldDescription>
								</Field>
							)}
						</form.Field>
					</div>
				</FieldSet>

				<FieldSet>
					<FieldLegend>Issue size</FieldLegend>
					{termsLocked && (
						<FieldDescription>
							Fixed now the IPO has opened: players' applications are based on
							lot size and shares offered.
						</FieldDescription>
					)}
					<div className="grid gap-4 sm:grid-cols-3">
						<form.Field name="lot_size">
							{({ state, handleChange, handleBlur }) => (
								<Field>
									<FieldLabel htmlFor="ipo-lot">Lot size (shares)</FieldLabel>
									<Input
										id="ipo-lot"
										disabled={termsLocked}
										type="number"
										inputMode="numeric"
										step="1"
										min="1"
										value={state.value}
										onChange={(e) => handleChange(e.target.value)}
										onBlur={handleBlur}
									/>
									<FieldDescription>
										Players apply in whole lots, so this is the smallest order.
										Their cash for lots × bid is held until allotment.
									</FieldDescription>
								</Field>
							)}
						</form.Field>
						<form.Field name="shares_offered">
							{({ state, handleChange, handleBlur }) => (
								<Field>
									<FieldLabel htmlFor="ipo-shares">Shares offered</FieldLabel>
									<Input
										id="ipo-shares"
										disabled={termsLocked}
										type="number"
										inputMode="numeric"
										step="1"
										min="1"
										value={state.value}
										onChange={(e) => handleChange(e.target.value)}
										onBlur={handleBlur}
									/>
									<FieldDescription>
										Total shares for sale, at least one lot. If players ask for
										more, each gets a share in proportion to what they asked for
										and the rest is refunded.
									</FieldDescription>
								</Field>
							)}
						</form.Field>
						<form.Field name="subscription_rate">
							{({ state, handleChange, handleBlur }) => (
								<Field>
									<FieldLabel htmlFor="ipo-rate">
										Starting demand (×)
									</FieldLabel>
									<Input
										id="ipo-rate"
										type="number"
										inputMode="decimal"
										step="0.01"
										min="0"
										value={state.value}
										onChange={(e) => handleChange(e.target.value)}
										onBlur={handleBlur}
										placeholder="0"
									/>
									<FieldDescription>
										Optional. The "Subscribed ×" figure players see before
										anyone applies. After the first application it shows real
										demand: shares asked for ÷ shares offered.
									</FieldDescription>
								</Field>
							)}
						</form.Field>
					</div>
				</FieldSet>

				<FieldSet>
					<FieldLegend>Schedule</FieldLegend>
					<Alert>
						<CalendarClock />
						<AlertTitle>These dates are for display only</AlertTitle>
						<AlertDescription>
							Players see them as the IPO's timetable, but nothing happens
							automatically when they arrive. You open, close, allot and list
							the IPO yourself from the IPOs table; it will remind you when a
							date has passed.
						</AlertDescription>
					</Alert>
					<div className="grid gap-4 sm:grid-cols-3">
						<form.Field name="open_date">
							{({ state, handleChange, handleBlur }) => (
								<Field>
									<FieldLabel htmlFor="ipo-open">Opens</FieldLabel>
									<DateTimePicker
										id="ipo-open"
										value={state.value}
										onChange={handleChange}
										onBlur={handleBlur}
									/>
									<FieldDescription>
										When applications are due to start.
									</FieldDescription>
								</Field>
							)}
						</form.Field>
						<form.Field name="close_date">
							{({ state, handleChange, handleBlur }) => (
								<Field>
									<FieldLabel htmlFor="ipo-close">Closes</FieldLabel>
									<DateTimePicker
										id="ipo-close"
										value={state.value}
										onChange={handleChange}
										onBlur={handleBlur}
									/>
									<FieldDescription>
										Last chance to apply or withdraw.
									</FieldDescription>
								</Field>
							)}
						</form.Field>
						<form.Field name="allotment_date">
							{({ state, handleChange, handleBlur }) => (
								<Field>
									<FieldLabel htmlFor="ipo-allot">Allotment</FieldLabel>
									<DateTimePicker
										id="ipo-allot"
										value={state.value}
										onChange={handleChange}
										onBlur={handleBlur}
									/>
									<FieldDescription>
										When players find out how many shares they got.
									</FieldDescription>
								</Field>
							)}
						</form.Field>
					</div>
				</FieldSet>

				{!editing && (
					<form.Field name="status">
						{({ state, handleChange }) => (
							<Field>
								<FieldLabel>Start as</FieldLabel>
								<Select
									value={state.value}
									onValueChange={(value) => handleChange(value as IpoStatus)}
								>
									<SelectTrigger className="w-full sm:w-64">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{CREATE_STATUSES.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
								<FieldDescription>
									{
										CREATE_STATUSES.find(
											(option) => option.value === state.value,
										)?.hint
									}
								</FieldDescription>
							</Field>
						)}
					</form.Field>
				)}
			</FieldGroup>

			<DialogFooter>
				<Button type="button" variant="outline" onClick={onDone}>
					Cancel
				</Button>
				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(isSubmitting) => (
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting && <Spinner data-icon="inline-start" />}
							{isSubmitting
								? editing
									? "Saving…"
									: "Creating…"
								: editing
									? "Save changes"
									: "Create IPO"}
						</Button>
					)}
				</form.Subscribe>
			</DialogFooter>
		</form>
	);
}

function RouteComponent() {
	const [formOpen, setFormOpen] = useState(false);
	const [editing, setEditing] = useState<Ipo | null>(null);
	const openForm = (ipo: Ipo | null) => {
		setEditing(ipo);
		setFormOpen(true);
	};

	const iposQuery = useQuery({
		queryKey: ["admin-ipos"],
		queryFn: () => getAllIposAdmin(),
	});

	const stocksQuery = useQuery({
		queryKey: ["stocks"],
		queryFn: () => getAllStocks(),
	});

	const stockIdBySymbol = useMemo(() => {
		const map = new Map<string, number>();
		for (const stock of stocksQuery.data ?? []) {
			map.set(stock.symbol.toUpperCase(), stock.id);
		}
		return map;
	}, [stocksQuery.data]);

	const iposByStatus = useMemo(() => {
		const groups: Record<Ipo["status"], Ipo[]> = {
			dormant: [],
			upcoming: [],
			open: [],
			closed: [],
			listed: [],
			withdrawn: [],
		};
		for (const ipo of iposQuery.data ?? []) groups[ipo.status].push(ipo);
		return groups;
	}, [iposQuery.data]);

	const sectors = useQuery({
		queryKey: ["ipo-sectors"],
		queryFn: async () => {
			const res = await getAllSectors();
			if (Array.isArray(res)) {
				return res.map((item) => String(item));
			}

			// Defensive normalization for unexpected API shapes.
			if (res && typeof res === "object") {
				const values = Object.values(res as Record<string, unknown>);
				const firstArray = values.find((value) => Array.isArray(value));
				if (Array.isArray(firstArray)) {
					return firstArray.map((item) => String(item));
				}
			}

			return [];
		},
	});

	if (iposQuery.isLoading) {
		return <Loading text="Loading IPOs..." />;
	}

	if (iposQuery.isError) {
		return (
			<div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
				Could not load the IPOs.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="IPOs"
				description="Draft, announce, open, close and list new stocks."
				action={
					<Button onClick={() => openForm(null)}>
						<Plus data-icon="inline-start" />
						Add IPO
					</Button>
				}
			/>
			<IpoFormDialog
				sectors={sectors.data ?? []}
				ipo={editing}
				open={formOpen}
				onOpenChange={setFormOpen}
			/>

			<div className="grid grid-cols-2 gap-4 rounded-xl border p-4 sm:grid-cols-3 lg:grid-cols-5">
				{SECTIONS.map(({ status }) => (
					<Stat
						key={status}
						label={STATUS[status].label}
						value={iposByStatus[status].length}
						hint={STATUS[status].hint}
					/>
				))}
			</div>

			{SECTIONS.map(({ status, empty }) => {
				const { label, icon: Icon } = STATUS[status];
				const items = iposByStatus[status];
				return (
					<section key={status} className="flex flex-col gap-3">
						<SectionTitle>
							<span className="flex items-center gap-2">
								<Icon
									className={cn(
										"size-4 text-muted-foreground",
										status === "open" && "text-gain",
									)}
								/>
								{label}
								<span className="font-mono text-xs font-normal text-muted-foreground">
									{items.length}
								</span>
							</span>
						</SectionTitle>
						{items.length > 0 ? (
							<IpoTable
								ipos={items}
								stockIdBySymbol={stockIdBySymbol}
								onEdit={openForm}
							/>
						) : (
							<p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
								{empty}
							</p>
						)}
					</section>
				);
			})}
		</div>
	);
}
