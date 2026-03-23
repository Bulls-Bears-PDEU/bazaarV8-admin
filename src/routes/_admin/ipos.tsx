import { formOptions, useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { CheckCircle2, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { addIpo, getAllIposAdmin, updateIpoStatus } from "#/api/ipos";
import { getAllSectors, getAllStocks } from "#/api/stocks";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
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
import type { Ipo, IpoStatus } from "#/types/ipo";

export const Route = createFileRoute("/_admin/ipos")({
	component: RouteComponent,
});

const statusColors: Record<Ipo["status"], string> = {
	dormant: "bg-slate-100 text-slate-800",
	upcoming: "bg-yellow-100 text-yellow-800",
	open: "bg-green-100 text-green-800",
	closed: "bg-red-100 text-red-800",
	listed: "bg-blue-100 text-blue-800",
	withdrawn: "bg-gray-100 text-gray-800",
};

const statusIcons: Record<Ipo["status"], React.ReactNode> = {
	dormant: <Plus className="h-4 w-4" />,
	upcoming: <TrendingUp className="h-4 w-4" />,
	open: <CheckCircle2 className="h-4 w-4" />,
	closed: <TrendingDown className="h-4 w-4" />,
	listed: <CheckCircle2 className="h-4 w-4" />,
	withdrawn: <TrendingDown className="h-4 w-4" />,
};

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

	const columns: ColumnDef<Ipo>[] = [
		{
			accessorKey: "symbol",
			header: "Symbol",
			cell: (info) => {
				const value = info.getValue<string>();
				return <span className="font-bold">{value}</span>;
			},
		},
		{
			accessorKey: "name",
			header: "Company Name",
			cell: (info) => {
				const value = info.getValue<string>();
				return (
					<div className="max-w-[280px] truncate" title={value}>
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
				return <Badge variant="outline">{value}</Badge>;
			},
		},
		{
			accessorKey: "min_price",
			header: "Price Range",
			cell: (info) => {
				const row = info.row.original;
				return (
					<div className="text-sm">
						₹{row.min_price} - ₹{row.max_price}
					</div>
				);
			},
		},
		{
			accessorKey: "subscription_rate",
			header: "Subscription Rate",
			cell: (info) => {
				const value = info.getValue<number>();
				return <div className="text-sm font-medium">{value}x</div>;
			},
		},
		{
			accessorKey: "open_date",
			header: "Open Date",
			cell: (info) => new Date(info.getValue<string>()).toLocaleDateString(),
		},
		{
			accessorKey: "close_date",
			header: "Close Date",
			cell: (info) => new Date(info.getValue<string>()).toLocaleDateString(),
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: (info) => {
				const status = info.getValue<Ipo["status"]>();
				return (
					<Badge className={statusColors[status]}>
						{statusIcons[status]}
						<span className="ml-1 capitalize">{status}</span>
					</Badge>
				);
			},
		},
		{
			id: "actions",
			header: "Actions",
			cell: ({ row }) => {
				const stockId = stockIdBySymbol.get(row.original.symbol.toUpperCase());

				return (
					<div className="flex gap-2">
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
									<Spinner className="h-3 w-3" />
								) : (
									<TrendingUp className="h-3 w-3" />
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
									<Spinner className="h-3 w-3" />
								) : (
									<TrendingUp className="h-3 w-3" />
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
									<Spinner className="h-3 w-3" />
								) : (
									<TrendingDown className="h-3 w-3" />
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
									<Spinner className="h-3 w-3" />
								) : (
									<CheckCircle2 className="h-3 w-3" />
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

	const table = useReactTable({
		data: ipos,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead key={header.id}>
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
									<TableCell key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={10} className="h-24 text-center">
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

	if (iposQuery.isLoading) {
		return <div className="p-4">Loading IPOs...</div>;
	}

	if (iposQuery.isError) {
		return <div className="p-4">Failed to load IPOs.</div>;
	}

	return (
		<div className="w-full p-4">
			<div className="mb-4 flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">IPO Admin Dashboard</h1>
					<p className="text-sm text-muted-foreground">
						Manage Initial Public Offerings across all lifecycle stages.
					</p>
				</div>
				<Dialog open={isAddOpen} onOpenChange={setIsAddOpen} modal={false}>
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
			</div>

			<div className="mb-6 grid gap-4 md:grid-cols-5">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Plus className="h-5 w-5 text-slate-600" />
							Dormant IPOs
						</CardTitle>
						<CardDescription>Stored in DB, hidden from users</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">{dormantIpos.length}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<TrendingUp className="h-5 w-5 text-green-600" />
							Open IPOs
						</CardTitle>
						<CardDescription>Currently accepting subscriptions</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">{openIpos.length}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Plus className="h-5 w-5 text-yellow-600" />
							Upcoming IPOs
						</CardTitle>
						<CardDescription>Scheduled to open soon</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">{upcomingIpos.length}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<TrendingDown className="h-5 w-5 text-red-600" />
							Closed IPOs
						</CardTitle>
						<CardDescription>Subscription period ended</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">{closedIpos.length}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CheckCircle2 className="h-5 w-5 text-blue-600" />
							Listed IPOs
						</CardTitle>
						<CardDescription>Successfully listed on exchange</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">{listedIpos.length}</div>
					</CardContent>
				</Card>
			</div>

			<div className="space-y-6">
				{/* Dormant IPOs Section */}
				<div>
					<div className="mb-4 flex items-center gap-2">
						<Plus className="h-5 w-5 text-slate-600" />
						<h2 className="text-xl font-semibold">Dormant IPOs</h2>
						<Badge variant="outline">{dormantIpos.length}</Badge>
					</div>
					{dormantIpos.length > 0 ? (
						<IpoTable ipos={dormantIpos} stockIdBySymbol={stockIdBySymbol} />
					) : (
						<Card>
							<CardContent className="flex h-32 items-center justify-center text-muted-foreground">
								No dormant IPO drafts found.
							</CardContent>
						</Card>
					)}
				</div>

				{/* Open IPOs Section */}
				<div>
					<div className="mb-4 flex items-center gap-2">
						<TrendingUp className="h-5 w-5 text-green-600" />
						<h2 className="text-xl font-semibold">Open IPOs</h2>
						<Badge>{openIpos.length}</Badge>
					</div>
					{openIpos.length > 0 ? (
						<IpoTable ipos={openIpos} stockIdBySymbol={stockIdBySymbol} />
					) : (
						<Card>
							<CardContent className="flex h-32 items-center justify-center text-muted-foreground">
								No open IPOs at the moment.
							</CardContent>
						</Card>
					)}
				</div>

				{/* Upcoming IPOs Section */}
				<div>
					<div className="mb-4 flex items-center gap-2">
						<Plus className="h-5 w-5 text-yellow-600" />
						<h2 className="text-xl font-semibold">Upcoming IPOs</h2>
						<Badge variant="outline">{upcomingIpos.length}</Badge>
					</div>
					{upcomingIpos.length > 0 ? (
						<IpoTable ipos={upcomingIpos} stockIdBySymbol={stockIdBySymbol} />
					) : (
						<Card>
							<CardContent className="flex h-32 items-center justify-center text-muted-foreground">
								No upcoming IPOs scheduled.
							</CardContent>
						</Card>
					)}
				</div>

				{/* Closed IPOs Section */}
				<div>
					<div className="mb-4 flex items-center gap-2">
						<TrendingDown className="h-5 w-5 text-red-600" />
						<h2 className="text-xl font-semibold">Closed IPOs</h2>
						<Badge variant="secondary">{closedIpos.length}</Badge>
					</div>
					{closedIpos.length > 0 ? (
						<IpoTable ipos={closedIpos} stockIdBySymbol={stockIdBySymbol} />
					) : (
						<Card>
							<CardContent className="flex h-32 items-center justify-center text-muted-foreground">
								No closed IPOs yet.
							</CardContent>
						</Card>
					)}
				</div>

				{/* Listed IPOs Section */}
				<div>
					<div className="mb-4 flex items-center gap-2">
						<CheckCircle2 className="h-5 w-5 text-blue-600" />
						<h2 className="text-xl font-semibold">Listed IPOs</h2>
						<Badge variant="secondary">{listedIpos.length}</Badge>
					</div>
					{listedIpos.length > 0 ? (
						<IpoTable ipos={listedIpos} stockIdBySymbol={stockIdBySymbol} />
					) : (
						<Card>
							<CardContent className="flex h-32 items-center justify-center text-muted-foreground">
								No listed IPOs yet.
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}
