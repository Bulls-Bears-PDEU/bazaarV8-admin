import { formOptions, useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	ArrowDown,
	ArrowDownUp,
	ArrowUp,
	IndianRupee,
	Landmark,
	Pen,
	Plus,
	TrendingDown,
	TrendingUp,
	TrendingUpDown,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	addStockOhlc,
	getAllSectors,
	getStock,
	getStockOhlc,
	getStockPrice,
	updateStock,
} from "#/api/stocks";
import TVChart from "#/components/tv-chart";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
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
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldSet,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import { Spinner } from "#/components/ui/spinner";
import { Switch } from "#/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import type { StockOHLC } from "#/types/stock";

export const Route = createFileRoute("/_admin/stock/$id")({
	component: RouteComponent,
});

function formatCurrency(value?: number | null) {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return "-";
	}

	return value.toLocaleString("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

function formatPercent(value?: number | null) {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return "-";
	}

	return `${value.toFixed(2)}%`;
}

function RouteComponent() {
	const { id } = Route.useParams();
	const queryClient = useQueryClient();
	const stock = useQuery({
		queryKey: ["stock", id],
		queryFn: () => (id ? getStock(id) : Promise.resolve(null)),
	});
	const stockCurrentPrice = useQuery({
		queryKey: ["stock", id, "currentPrice"],
		queryFn: () => (id ? getStockPrice(id, true) : Promise.resolve(null)),
	});
	const stockOhlc = useQuery({
		queryKey: ["stock", id, "ohlc"],
		queryFn: () => (id ? getStockOhlc(id) : Promise.resolve(null)),
	});

	const [sorting, setSorting] = useState<SortingState>([]);
	const columns: ColumnDef<StockOHLC>[] = [
		{
			id: "select",
			header: ({ table }) => (
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && "indeterminate")
					}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					aria-label="Select all"
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label="Select row"
				/>
			),
		},
		{
			header: ({ column }) => (
				<Button variant="ghost" onClick={column.getToggleSortingHandler()}>
					Timestamp
					{column.getIsSorted() === "asc" ? (
						<ArrowUp className="ml-4 h-4 w-4" />
					) : column.getIsSorted() === "desc" ? (
						<ArrowDown className="ml-4 h-4 w-4" />
					) : (
						<ArrowDownUp className="ml-4 h-4 w-4" />
					)}
				</Button>
			),
			accessorKey: "timestamp",
			// display: HH:MM:SS:MS format of the timestamp
			cell: ({ row }) =>
				new Date(row.original.timestamp).toLocaleTimeString("en-US", {
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
					fractionalSecondDigits: 3,
				}),
			enableSorting: true,
			sortDescFirst: true,
		},
		{
			header: "Open Price",
			accessorKey: "open_price",
		},
		{
			header: "High Price",
			accessorKey: "high_price",
		},
		{
			header: "Low Price",
			accessorKey: "low_price",
		},
		{
			header: "Close Price",
			accessorKey: "close_price",
		},
	];

	const table = useReactTable({
		data: stockOhlc.data || [],
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		state: {
			sorting,
		},
		onSortingChange: setSorting,
	});

	const [isAddRecordDialogOpen, setIsAddRecordDialogOpen] = useState(false);

	const addRecordFormOptions = formOptions({
		defaultValues: {
			open_price: 0,
			high_price: 0,
			low_price: 0,
			close_price: 0,
		} as StockOHLC,
	});
	const addRecordForm = useForm({
		...addRecordFormOptions,
		onSubmit: async ({ value }) => {
			try {
				const ohlcData: StockOHLC = {
					...value,
					stock_id: Number(id),
					timestamp: new Date().toISOString(),
				};
				const result = await addStockOhlc(ohlcData);
				console.log("Adding new OHLC record:", ohlcData);
				console.info("Result from API:", result);
				queryClient.invalidateQueries({ queryKey: ["stock", id] });
				toast.success("OHLC record added successfully!");
				setIsAddRecordDialogOpen(false);
			} catch (error) {
				console.error("Error adding OHLC record:", error);
				toast.error("Failed to add OHLC record. Please try again.");
			}
		},
	});

	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const allSectors = useQuery({
		queryKey: ["sectors"],
		queryFn: async () => {
			const sectors = await getAllSectors();
			return sectors;
		},
	});
	const editStockFormOptions = formOptions({
		defaultValues: {
			name: stock.data?.name || "",
			symbol: stock.data?.symbol || "",
			sector: stock.data?.sector || "",
			volatility: stock.data?.volatility || 0,
			isLocked: stock.data?.isLocked || false,
		},
	});
	const editStockForm = useForm({
		...editStockFormOptions,
		onSubmit: async ({ value }) => {
			try {
				const updatedData = {
					name: value.name,
					symbol: value.symbol,
					sector: value.sector,
					volatility: value.volatility,
					isLocked: value.isLocked,
				};
				console.log("Updating stock with data:", updatedData);
				const result = await updateStock(Number(id), updatedData);
				console.info("Result from API:", result);
				queryClient.invalidateQueries({ queryKey: ["stock", id] });
				toast.success("Stock details updated successfully!");
				setIsEditDialogOpen(false);
			} catch (error) {
				console.error("Error updating stock details:", error);
				toast.error("Failed to update stock details. Please try again.");
			}
		},
	});

	const currentPrice = stockCurrentPrice.data?.price ?? null;
	const currentPriceChange = stockCurrentPrice.data?.priceChange ?? null;
	const currentPriceChangePercent =
		currentPrice !== null &&
		currentPriceChange !== null &&
		currentPrice - currentPriceChange !== 0
			? (currentPriceChange / (currentPrice - currentPriceChange)) * 100
			: null;

	if (stock.isLoading) {
		return (
			<div className="p-4">
				<div className="rounded-2xl border bg-card p-6">
					<div className="flex flex-col gap-4">
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-24 w-full" />
						<Skeleton className="h-64 w-full" />
					</div>
				</div>
			</div>
		);
	}
	return (
		<div className="p-4">
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-4">
					<Landmark className="p-4 bg-indigo-900 size-20 rounded-md" />
					<div className="flex items-start flex-col gap-2">
						<h1 className="text-3xl font-bold flex items-center">
							{stock.data?.name}
						</h1>
						<Badge variant="default">{stock.data?.symbol}</Badge>
					</div>
				</div>
				<div className="rounded-xl bg-secondary p-4">
					<div className="text-xs uppercase tracking-wide text-muted-foreground">
						Current Price
					</div>
					{stockCurrentPrice.isLoading ? (
						<Skeleton className="mt-2 h-8 w-40" />
					) : stockCurrentPrice.data?.price ? (
						<div className="mt-2 flex flex-col gap-1">
							<div className="flex items-center gap-1 text-3xl font-semibold leading-none">
								<IndianRupee />
								<span>{formatCurrency(currentPrice)}</span>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<Badge
									variant={
										stockCurrentPrice.data?.indicator === "down"
											? "destructive"
											: "secondary"
									}
								>
									{stockCurrentPrice.data?.indicator === "down" ? (
										<TrendingDown className="size-4" />
									) : stockCurrentPrice.data?.indicator === "up" ? (
										<TrendingUp className="size-4" />
									) : (
										<TrendingUpDown className="size-4" />
									)}
									{formatCurrency(currentPriceChange)}
								</Badge>
								<span className="text-muted-foreground">
									{formatPercent(currentPriceChangePercent)}
								</span>
							</div>
						</div>
					) : (
						<div className="mt-2 text-3xl font-semibold leading-none">
							<IndianRupee />
							<span>-</span>
						</div>
					)}
				</div>
			</div>
			<div className="flex items-stretch gap-4 mb-4">
				<div className="rounded-md bg-secondary p-4 w-full">
					<p>
						<span className="font-semibold">Sector:</span> {stock.data?.sector}
					</p>
					<p>
						<span className="font-semibold">Volatility:</span>{" "}
						{stock.data?.volatility}
					</p>
					<p>
						<span className="font-semibold">Created At:</span>{" "}
						{new Date(stock.data?.created_at || "").toLocaleString()}
					</p>
					<p>
						<span className="font-semibold">Status:</span>{" "}
						{stock.data?.isLocked ? (
							<Badge variant="destructive">Locked</Badge>
						) : (
							<Badge variant="default">Unlocked</Badge>
						)}
					</p>
				</div>
				<div className="self-stretch aspect-square shrink-0">
					<Button
						onClick={() => setIsEditDialogOpen(true)}
						className="h-full w-full"
					>
						<Pen />
					</Button>
				</div>
			</div>
			{stockOhlc.isPending ? (
				<div className="flex h-96 w-full items-center justify-center bg-muted rounded-lg">
					<Spinner />
				</div>
			) : (
				stockOhlc.data && (
					<div className="w-full">
						<TVChart candleStickData={stockOhlc.data} />
						<FieldDescription className="mt-2 ml-2">
							The chart above shows the historical price data for this stock,
							including the open, high, low, and close prices for each time
							period.
						</FieldDescription>
					</div>
				)
			)}

			<div className="mt-8">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-2xl font-bold">Historical Price Data</h2>
					<Button size="lg" onClick={() => setIsAddRecordDialogOpen(true)}>
						Add Record <Plus />
					</Button>
				</div>
				<div className="rounded-md border overflow-x-auto">
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) =>
										header.isPlaceholder ? null : (
											<TableHead key={header.id} className="select-none ">
												<div className="flex items-center justify-between gap-1">
													{flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
												</div>
											</TableHead>
										),
									)}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows.map((row) => (
								<TableRow key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				{/* Implement the dialog for editing stock details here */}
				<DialogContent>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							editStockForm.handleSubmit();
						}}
					>
						<DialogHeader>
							<DialogTitle>Edit Stock Details</DialogTitle>
							<DialogDescription>
								Update the stock information below. Make sure to save your
								changes before closing the dialog.
							</DialogDescription>
						</DialogHeader>
						<FieldGroup className="my-4">
							<FieldSet>
								<FieldGroup>
									<editStockForm.Field name="name">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Name</FieldLabel>
												<Input
													value={state.value}
													onChange={(e) => handleChange(e.target.value)}
													onBlur={handleBlur}
												/>
											</Field>
										)}
									</editStockForm.Field>
									<editStockForm.Field name="symbol">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Symbol</FieldLabel>
												<Input
													value={state.value}
													onChange={(e) => handleChange(e.target.value)}
													onBlur={handleBlur}
												/>
											</Field>
										)}
									</editStockForm.Field>
									<editStockForm.Field name="sector">
										{({ state, handleChange }) => (
											<Field>
												<FieldLabel>Sector</FieldLabel>
												<Select
													value={state.value}
													onValueChange={(value) => handleChange(value)}
												>
													<SelectTrigger className="w-[180px]">
														<SelectValue placeholder="Sector" />
													</SelectTrigger>
													<SelectContent>
														<SelectGroup>
															{allSectors.data?.map((sector) => (
																<SelectItem key={sector} value={sector}>
																	{sector}
																</SelectItem>
															))}
														</SelectGroup>
													</SelectContent>
												</Select>
											</Field>
										)}
									</editStockForm.Field>
									<editStockForm.Field name="volatility">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Volatility</FieldLabel>
												<Input
													type="number"
													step="0.01"
													value={state.value}
													onChange={(e) => handleChange(Number(e.target.value))}
													onBlur={handleBlur}
												/>
											</Field>
										)}
									</editStockForm.Field>
									<editStockForm.Field name="isLocked">
										{({ state, handleChange }) => (
											<Field orientation="horizontal">
												<FieldContent>
													<FieldLabel>Lock</FieldLabel>
													<FieldDescription>
														Locking the stock prevents further edits
													</FieldDescription>
												</FieldContent>
												<Switch
													checked={state.value}
													onCheckedChange={(value) => handleChange(!!value)}
												>
													{state.value ? "Locked" : "Unlocked"}
												</Switch>
											</Field>
										)}
									</editStockForm.Field>
								</FieldGroup>
							</FieldSet>
						</FieldGroup>
						<DialogFooter>
							<FieldGroup>
								<editStockForm.Subscribe
									selector={(state) => [state.canSubmit, state.isSubmitting]}
								>
									{([canSubmit, isSubmitting]) => (
										<Button type="submit" disabled={!canSubmit || isSubmitting}>
											{isSubmitting && <Spinner className="mr-2" />}
											{isSubmitting ? "Saving..." : "Save Changes"}
										</Button>
									)}
								</editStockForm.Subscribe>
								<DialogTrigger asChild>
									<Button type="button" variant="outline" className="w-full">
										Cancel
									</Button>
								</DialogTrigger>
							</FieldGroup>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
			<Dialog
				open={isAddRecordDialogOpen}
				onOpenChange={setIsAddRecordDialogOpen}
			>
				{/* Implement the dialog for adding/editing OHLC records here */}
				<DialogContent>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							addRecordForm.handleSubmit();
						}}
					>
						<DialogHeader>
							<DialogTitle>Add OHLC Record</DialogTitle>
							<DialogDescription>
								This will add a new OHLC record for the stock with the current
								timestamp. Please ensure that the data is accurate before
								submitting.
							</DialogDescription>
						</DialogHeader>
						<FieldGroup className="my-4">
							<FieldSet>
								<FieldGroup>
									<addRecordForm.Field name="open_price">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Open Price</FieldLabel>
												<Input
													type="number"
													step="0.01"
													value={state.value}
													onChange={(e) => handleChange(Number(e.target.value))}
													onBlur={handleBlur}
												/>
											</Field>
										)}
									</addRecordForm.Field>
									<addRecordForm.Field name="high_price">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>High Price</FieldLabel>
												<Input
													type="number"
													step="0.01"
													value={state.value}
													onChange={(e) => handleChange(Number(e.target.value))}
													onBlur={handleBlur}
												/>
											</Field>
										)}
									</addRecordForm.Field>
									<addRecordForm.Field name="low_price">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Low Price</FieldLabel>
												<Input
													type="number"
													step="0.01"
													value={state.value}
													onChange={(e) => handleChange(Number(e.target.value))}
													onBlur={handleBlur}
												/>
											</Field>
										)}
									</addRecordForm.Field>
									<addRecordForm.Field name="close_price">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Close Price</FieldLabel>
												<Input
													type="number"
													step="0.01"
													value={state.value}
													onChange={(e) => handleChange(Number(e.target.value))}
													onBlur={handleBlur}
												/>
											</Field>
										)}
									</addRecordForm.Field>
								</FieldGroup>
							</FieldSet>
						</FieldGroup>
						<DialogFooter>
							<FieldGroup>
								<addRecordForm.Subscribe
									selector={(state) => [state.canSubmit, state.isSubmitting]}
								>
									{([canSubmit, isSubmitting]) => (
										<Button type="submit" disabled={!canSubmit || isSubmitting}>
											{isSubmitting && <Spinner className="mr-2" />}
											{isSubmitting ? "Adding..." : "Add Record"}
										</Button>
									)}
								</addRecordForm.Subscribe>

								<DialogTrigger asChild>
									<Button type="button" variant="outline" className="w-full">
										Cancel
									</Button>
								</DialogTrigger>
							</FieldGroup>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
