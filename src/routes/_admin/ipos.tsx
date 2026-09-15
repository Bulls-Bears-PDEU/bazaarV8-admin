import { formOptions, useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { type ColumnDef, flexRender, useTable } from "@tanstack/react-table";
import {
	CalendarClock,
	CircleCheck,
	CircleDashed,
	CirclePlay,
	CircleStop,
	CircleX,
	type LucideIcon,
	Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { addIpo, getAllIposAdmin, updateIpoStatus } from "#/api/ipos";
import { getAllSectors, getAllStocks } from "#/api/stocks";
import { PageHeader } from "#/components/page-header";
import { SectionTitle, Stat } from "#/components/stat";
import { StockLogo } from "#/components/stock-logo";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "#/components/ui/combobox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Loading } from "#/components/ui/loading";
import {
	Select,
	SelectContent,
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
		hint: "Bidding over, waiting to list",
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

function IpoTable({
	ipos,
	stockIdBySymbol,
}: {
	ipos: Ipo[];
	stockIdBySymbol: Map<string, number>;
}) {
	const queryClient = useQueryClient();

	const updateStatusMutation = useMutation({
		mutationFn: ({ id, status }: { id: number; status: Ipo["status"] }) =>
			updateIpoStatus(id, status),
		onSuccess: async () => {
			toast.success("IPO status updated successfully.");
			await queryClient.invalidateQueries({ queryKey: ["admin-ipos"] });
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update IPO status.");
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
						<StockLogo symbol={value} />
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
				const { label, icon: Icon, badge } = STATUS[info.getValue<Ipo["status"]>()];
				return (
					<Badge variant="outline" className={badge}>
						<Icon />
						{label}
					</Badge>
				);
			},
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) => {
				const stockId = stockIdBySymbol.get(row.original.symbol.toUpperCase());

				return (
					<div className="flex justify-end gap-2">
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
						{row.original.status === "closed" && (
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

function RouteComponent() {
	const [isAddOpen, setIsAddOpen] = useState(false);

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

	const openIpos = useMemo(() => {
		return (iposQuery.data ?? []).filter((ipo) => ipo.status === "open");
	}, [iposQuery.data]);

	const upcomingIpos = useMemo(() => {
		return (iposQuery.data ?? []).filter((ipo) => ipo.status === "upcoming");
	}, [iposQuery.data]);

	const dormantIpos = useMemo(() => {
		return (iposQuery.data ?? []).filter((ipo) => ipo.status === "dormant");
	}, [iposQuery.data]);

	const listedIpos = useMemo(() => {
		return (iposQuery.data ?? []).filter((ipo) => ipo.status === "listed");
	}, [iposQuery.data]);

	const closedIpos = useMemo(() => {
		return (iposQuery.data ?? []).filter((ipo) => ipo.status === "closed");
	}, [iposQuery.data]);

	const addIpoFormOptions = formOptions({
		defaultValues: {
			name: "",
			symbol: "",
			sector: "",
			min_price: "",
			max_price: "",
			subscription_rate: "",
			open_date: "",
			close_date: "",
			allotment_date: "",
			lot_size: "1",
			shares_offered: "",
			listing_price: "",
			status: "dormant" as IpoStatus,
		},
	});

	const queryClient = useQueryClient();

	const addIpoForm = useForm({
		...addIpoFormOptions,
		onSubmit: async ({ value }) => {
			try {
				if (
					!value.name.trim() ||
					!value.symbol.trim() ||
					!value.sector.trim() ||
					!value.min_price.trim() ||
					!value.max_price.trim() ||
					!value.subscription_rate.trim() ||
					!value.open_date.trim() ||
					!value.close_date.trim() ||
					!value.allotment_date.trim() ||
					!value.shares_offered.trim() ||
					!value.listing_price.trim() ||
					!value.status
				) {
					toast.error("Please fill in all required fields.");
					return;
				}

				const minPrice = Number.parseFloat(value.min_price);
				const maxPrice = Number.parseFloat(value.max_price);
				const subscriptionRate = Number.parseFloat(value.subscription_rate);
				const lotSize = Number.parseInt(value.lot_size, 10);
				const sharesOffered = Number.parseInt(value.shares_offered, 10);
				const listingPrice = Number.parseFloat(value.listing_price);
				const openDate = new Date(value.open_date);
				const closeDate = new Date(value.close_date);
				const allotmentDate = new Date(value.allotment_date);

				if (
					Number.isNaN(minPrice) ||
					Number.isNaN(maxPrice) ||
					Number.isNaN(subscriptionRate) ||
					Number.isNaN(lotSize) ||
					Number.isNaN(sharesOffered) ||
					Number.isNaN(listingPrice) ||
					Number.isNaN(openDate.getTime()) ||
					Number.isNaN(closeDate.getTime()) ||
					Number.isNaN(allotmentDate.getTime())
				) {
					toast.error("Please provide valid numeric values and dates.");
					return;
				}

				const formData = {
					name: value.name.trim(),
					symbol: value.symbol.trim().toUpperCase(),
					sector: value.sector.trim(),
					min_price: minPrice,
					max_price: maxPrice,
					subscription_rate: subscriptionRate,
					open_date: openDate.toISOString(),
					close_date: closeDate.toISOString(),
					allotment_date: allotmentDate.toISOString(),
					lot_size: lotSize,
					shares_offered: sharesOffered,
					listing_price: listingPrice,
					status: value.status,
					is_open_to_subscription: value.status === "open",
				};

				const res = await addIpo(formData);
				await queryClient.invalidateQueries({ queryKey: ["admin-ipos"] });
				toast.success(res.message || "IPO added successfully.");
				setIsAddOpen(false);
				addIpoForm.reset();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Invalid form data.",
				);
			}
		},
	});

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
	const sectorItems = sectors.data ?? [];
	const iposByStatus: Record<Ipo["status"], Ipo[]> = {
		dormant: dormantIpos,
		upcoming: upcomingIpos,
		open: openIpos,
		closed: closedIpos,
		listed: listedIpos,
		withdrawn: (iposQuery.data ?? []).filter((ipo) => ipo.status === "withdrawn"),
	};

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
				<Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus data-icon="inline-start" />
							Add IPO
						</Button>
					</DialogTrigger>
					<DialogContent className="max-h-[90vh] overflow-y-auto min-w-[60vw]">
						<form
							onSubmit={(e) => {
								e.preventDefault();
								addIpoForm.handleSubmit();
							}}
						>
							<DialogHeader>
								<DialogTitle>Create New IPO</DialogTitle>
								<DialogDescription>
									Add a new IPO listing with all required details.
								</DialogDescription>
							</DialogHeader>
							<FieldGroup className="my-4">
								<div className="grid grid-cols-2 gap-4">
									<addIpoForm.Field name="name">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Company Name *</FieldLabel>
												<Input
													value={state.value}
													onChange={(e) => handleChange(e.target.value)}
													onBlur={handleBlur}
													placeholder="e.g., TCS Limited"
												/>
												<FieldDescription>
													Official company/legal name shown across IPO listings.
												</FieldDescription>
											</Field>
										)}
									</addIpoForm.Field>
									<addIpoForm.Field name="symbol">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Stock Symbol *</FieldLabel>
												<Input
													value={state.value}
													onChange={(e) => handleChange(e.target.value)}
													onBlur={handleBlur}
													placeholder="e.g., TCS"
												/>
												<FieldDescription>
													Exchange ticker symbol (will be stored in uppercase).
												</FieldDescription>
											</Field>
										)}
									</addIpoForm.Field>
									<addIpoForm.Field name="sector">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Sector *</FieldLabel>
												<Combobox
													onValueChange={(value) => {
														handleChange(value ?? "");
													}}
													onInputValueChange={(value) =>
														handleChange(value ?? "")
													}
													value={state.value || undefined}
													inputValue={state.value}
													items={sectorItems}
													itemToStringValue={(sector) => sector}
												>
													<ComboboxInput
														placeholder="Select a sector"
														onBlur={handleBlur}
													/>
													<ComboboxContent>
														<ComboboxEmpty>No items found.</ComboboxEmpty>
														<ComboboxList>
															{(sector) => (
																<ComboboxItem key={sector} value={sector}>
																	{sector}
																</ComboboxItem>
															)}
														</ComboboxList>
													</ComboboxContent>
												</Combobox>
												<FieldDescription>
													Business sector used for IPO categorization and
													filtering.
												</FieldDescription>
											</Field>
										)}
									</addIpoForm.Field>
									<addIpoForm.Field name="min_price">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Min Price (₹) *</FieldLabel>
												<Input
													type="number"
													step="0.01"
													value={state.value}
													onChange={(e) => handleChange(e.target.value)}
													onBlur={handleBlur}
												/>
												<FieldDescription>
													Lower bound of the IPO application price band.
												</FieldDescription>
											</Field>
										)}
									</addIpoForm.Field>
									<addIpoForm.Field name="max_price">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Max Price (₹) *</FieldLabel>
												<Input
													type="number"
													step="0.01"
													value={state.value}
													onChange={(e) => handleChange(e.target.value)}
													onBlur={handleBlur}
												/>
												<FieldDescription>
													Upper bound of the IPO application price band.
												</FieldDescription>
											</Field>
										)}
									</addIpoForm.Field>
									<addIpoForm.Field name="listing_price">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Listing Price (₹) *</FieldLabel>
												<Input
													type="number"
													step="0.01"
													value={state.value}
													onChange={(e) => handleChange(e.target.value)}
													onBlur={handleBlur}
												/>
												<FieldDescription>
													Expected or finalized exchange listing price per
													share.
												</FieldDescription>
											</Field>
										)}
									</addIpoForm.Field>
									<addIpoForm.Field name="subscription_rate">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Subscription Rate (x) *</FieldLabel>
												<Input
													type="number"
													step="0.01"
													value={state.value}
													onChange={(e) => handleChange(e.target.value)}
													onBlur={handleBlur}
												/>
												<FieldDescription>
													Demand multiple (for example, 3.5x means 3.5 times
													subscribed).
												</FieldDescription>
											</Field>
										)}
									</addIpoForm.Field>
									<addIpoForm.Field name="lot_size">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Lot Size *</FieldLabel>
												<Input
													type="number"
													value={state.value}
													onChange={(e) => handleChange(e.target.value)}
													onBlur={handleBlur}
												/>
												<FieldDescription>
													Minimum number of shares per application lot.
												</FieldDescription>
											</Field>
										)}
									</addIpoForm.Field>
									<addIpoForm.Field name="shares_offered">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Shares Offered *</FieldLabel>
												<Input
													type="number"
													value={state.value}
													onChange={(e) => handleChange(e.target.value)}
													onBlur={handleBlur}
												/>
												<FieldDescription>
													Total number of shares available in this IPO issue.
												</FieldDescription>
											</Field>
										)}
									</addIpoForm.Field>
								</div>
								<div className="grid grid-cols-3 gap-4">
									<addIpoForm.Field name="open_date">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Open Date *</FieldLabel>
												<Input
													type="datetime-local"
													value={state.value}
													onChange={(e) => handleChange(e.target.value)}
													onBlur={handleBlur}
												/>
												<FieldDescription>
													Date and time when subscriptions begin.
												</FieldDescription>
											</Field>
										)}
									</addIpoForm.Field>
									<addIpoForm.Field name="close_date">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Close Date *</FieldLabel>
												<Input
													type="datetime-local"
													value={state.value}
													onChange={(e) => handleChange(e.target.value)}
													onBlur={handleBlur}
												/>
												<FieldDescription>
													Date and time when subscriptions stop.
												</FieldDescription>
											</Field>
										)}
									</addIpoForm.Field>
									<addIpoForm.Field name="allotment_date">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Allotment Date *</FieldLabel>
												<Input
													type="datetime-local"
													value={state.value}
													onChange={(e) => handleChange(e.target.value)}
													onBlur={handleBlur}
												/>
												<FieldDescription>
													Expected date for share allotment results.
												</FieldDescription>
											</Field>
										)}
									</addIpoForm.Field>
								</div>
								<div className="grid grid-cols-1 gap-4">
									<addIpoForm.Field name="status">
										{({ state, handleChange }) => (
											<Field>
												<FieldLabel>Status *</FieldLabel>
												<Select
													value={state.value}
													onValueChange={(value) =>
														handleChange(value as IpoStatus)
													}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select a status" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="dormant">Dormant</SelectItem>
														<SelectItem value="upcoming">Upcoming</SelectItem>
														<SelectItem value="open">Open</SelectItem>
														<SelectItem value="closed">Closed</SelectItem>
														<SelectItem value="listed">Listed</SelectItem>
														<SelectItem value="withdrawn">Withdrawn</SelectItem>
													</SelectContent>
												</Select>
												<FieldDescription>
													IPO lifecycle status. Dormant IPOs are stored but not
													visible to users.
												</FieldDescription>
											</Field>
										)}
									</addIpoForm.Field>
								</div>
							</FieldGroup>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsAddOpen(false)}
								>
									Cancel
								</Button>
								<addIpoForm.Subscribe
									selector={(state) => [state.canSubmit, state.isSubmitting]}
								>
									{([canSubmit, isSubmitting]) => (
										<Button type="submit" disabled={!canSubmit || isSubmitting}>
											{isSubmitting && <Spinner className="h-4 w-4" />}
											{isSubmitting ? "Creating..." : "Create IPO"}
										</Button>
									)}
								</addIpoForm.Subscribe>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
				}
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
							<IpoTable ipos={items} stockIdBySymbol={stockIdBySymbol} />
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
