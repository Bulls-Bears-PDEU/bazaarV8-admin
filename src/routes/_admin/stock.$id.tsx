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
	Dot,
	IndianRupee,
	Landmark,
	Pen,
	Plus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	addStockOhlc,
	getStock,
	getStockOhlc,
	getStockPrice,
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
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Spinner } from "#/components/ui/spinner";
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

	const handleEditName = () => {
		// Implement the logic to edit the stock name here
		// For example, you could open a modal with a form to edit the name
	};

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

	if (stock.isLoading) {
		return (
			<div className="flex h-screen w-full items-center justify-center">
				<Spinner />
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
				<div className="flex items-center gap-4">
					{stockCurrentPrice.isLoading ? (
						<Spinner />
					) : (
						<div className="text-2xl whitespace-nowrap flex items-center gap-1">
							<IndianRupee />
							{stockCurrentPrice.data?.price}
							<div
								className={
									stockCurrentPrice.data?.indicator === "up"
										? "text-green-500"
										: stockCurrentPrice.data?.indicator === "down"
											? "text-red-500"
											: "text-gray-500"
								}
							>
								<span className="text-sm font-normal">
									( {stockCurrentPrice.data?.priceChange?.toFixed(2)} )
									{/* Show percentage change */}
									{stockCurrentPrice.data?.priceChange
										? ` ${(
												(stockCurrentPrice.data.priceChange /
													(stockCurrentPrice.data.price -
														stockCurrentPrice.data.priceChange)) *
													100
											).toFixed(2)}%`
										: ""}
								</span>
							</div>
							{/* {stockCurrentPrice.data?.indicator === "up" && (
								<ArrowUp className="text-green-500" />
							)}
							{stockCurrentPrice.data?.indicator === "down" && (
								<ArrowDown className="text-red-500" />
							)} */}
						</div>
					)}
				</div>
			</div>
			{/* Square edit icon button */}
			<div className="flex items-stretch gap-4 mb-4">
				<div className="rounded-md bg-muted p-4 w-full">
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
						// variant=
						onClick={handleEditName}
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

			{/* Datatable to list and edit ohlc data */}
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
			<Dialog>
				{/* Implement the dialog for editing stock details here */}
				<DialogContent>
					<h2 className="text-2xl font-bold mb-4">Edit Stock Details</h2>
					{/* Add form fields for editing stock details such as name, symbol, sector, volatility, and lock status */}
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
								<Button type="button" variant="outline" className="w-full">
									Cancel
								</Button>
							</FieldGroup>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
