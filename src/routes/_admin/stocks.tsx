import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	type ColumnDef,
	flexRender,
	type Row,
	type SortingState,
	useTable,
} from "@tanstack/react-table";
import {
	ArrowDown,
	ArrowDownUp,
	ArrowUp,
	Lock,
	MoreVertical,
	Plus,
	Trash2,
} from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	addStock,
	getAllSectors,
	getAllStockPrices,
	getAllStocks,
} from "#/api/stocks";
import { PageHeader } from "#/components/page-header";
import { StockLogo } from "#/components/stock-logo";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { ButtonGroup } from "#/components/ui/button-group";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
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
import useSocket from "#/hooks/use-socket";
import { type AdminTableFeatures, adminTableFeatures } from "#/lib/table";
import { cn } from "#/lib/utils";
import type { Stock, StockOHLC } from "#/types/stock";

export const Route = createFileRoute("/_admin/stocks")({
	component: RouteComponent,
});

type StockRow = Stock & {
	price: number;
	indicator?: "up" | "down" | "neutral";
};

const MemoizedRow = memo(
	({ row }: { row: Row<AdminTableFeatures, StockRow> }) => {
		return (
			<TableRow data-state={row.getIsSelected() ? "selected" : undefined}>
				{row.getVisibleCells().map((cell) => (
					<TableCell key={cell.id} className="py-2">
						{flexRender(cell.column.columnDef.cell, cell.getContext())}
					</TableCell>
				))}
			</TableRow>
		);
	},
	(prev, next) => {
		return (
			prev.row.original === next.row.original &&
			prev.row.getIsSelected() === next.row.getIsSelected()
		);
	},
);

function RouteComponent() {
	const queryClient = useQueryClient();
	const socket = useSocket();

	useEffect(() => {
		if (!socket) return;

		const handlePriceUpdate = (data: StockOHLC) => {
			queryClient.setQueryData(
				["stocks"],
				(oldData: StockRow[] | undefined) => {
					if (!oldData) return oldData;
					return oldData.map((stock) => {
						if (stock.id === data.stock_id) {
							const newPrice = data.close_price;
							const oldPrice = stock.price;
							let indicator = stock.indicator;

							if (newPrice > oldPrice) indicator = "up";
							else if (newPrice < oldPrice) indicator = "down";
							// if equal, keep the previous indicator entirely to retain momentum coloring

							return { ...stock, price: newPrice, indicator };
						}
						return stock;
					});
				},
			);
		};

		socket.on("stockPriceUpdate", handlePriceUpdate);

		return () => {
			socket.off("stockPriceUpdate", handlePriceUpdate);
		};
	}, [socket, queryClient]);

	const columns = useMemo<ColumnDef<AdminTableFeatures, StockRow>[]>(
		() => [
			{
				id: "select",
				header: ({ table }) => (
					<Checkbox
						checked={
							table.getIsAllPageRowsSelected() ||
							(table.getIsSomePageRowsSelected() && "indeterminate")
						}
						onCheckedChange={(value) =>
							table.toggleAllPageRowsSelected(!!value)
						}
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
				accessorKey: "id",
				header: "ID",
				cell: (info) => (
					<span className="font-mono text-xs text-muted-foreground">
						{info.getValue() as number}
					</span>
				),
			},
			{
				accessorKey: "symbol",
				header: "Symbol",
				cell: ({ row }) => (
					<Link
						to="/stock/$id"
						params={{ id: String(row.original.id) }}
						className="flex items-center gap-2.5 font-mono font-medium hover:underline"
					>
						<StockLogo symbol={row.original.symbol} />
						{row.original.symbol}
						{row.original.locked && (
							<Lock
								className="size-3 text-muted-foreground"
								aria-label="Trading halted"
							/>
						)}
					</Link>
				),
			},
			{
				accessorKey: "name",
				header: "Name",
			},
			{
				accessorKey: "price",
				header: ({ column }) => (
					<button
						type="button"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="inline-flex items-center gap-1 hover:text-foreground"
					>
						Price
						{column.getIsSorted() === "asc" ? (
							<ArrowUp className="size-3" />
						) : column.getIsSorted() === "desc" ? (
							<ArrowDown className="size-3" />
						) : (
							<ArrowDownUp className="size-3 opacity-50" />
						)}
					</button>
				),
				cell: ({ row }) => {
					const price = row.original.price;
					const indicator = row.original.indicator;
					return (
						<div
							className={cn(
								"flex items-center gap-1.5 font-mono tabular-nums",
								indicator === "up" && "text-gain",
								indicator === "down" && "text-loss",
							)}
						>
							<span>
								₹
								{Number(price).toLocaleString("en-IN", {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								})}
							</span>
							{indicator === "up" && <ArrowUp className="size-3.5" />}
							{indicator === "down" && <ArrowDown className="size-3.5" />}
							{!indicator && <span className="inline-block size-3.5" />}
						</div>
					);
				},
				enableSorting: true,
			},
			{
				accessorKey: "volatility",
				header: "Volatility",
				cell: (info) => (
					<span className="font-mono tabular-nums">
						{Number(info.getValue()).toFixed(2)}
					</span>
				),
			},
			{
				accessorKey: "sector",
				header: "Sector",
				cell: (info) => (
					<span className="text-muted-foreground">
						{info.getValue() as string}
					</span>
				),
			},
			{
				accessorKey: "created_at",
				header: "Created",
				cell: (info) => (
					<span className="font-mono text-xs text-muted-foreground">
						{new Date(info.getValue() as string).toLocaleString("en-IN")}
					</span>
				),
			},
			{
				accessorKey: "locked",
				header: "Trading",
				cell: (info) =>
					info.getValue() ? (
						<Badge
							variant="outline"
							className="border-loss/30 bg-loss-muted text-loss"
						>
							Halted
						</Badge>
					) : (
						<Badge
							variant="outline"
							className="border-gain/30 bg-gain-muted text-gain"
						>
							Open
						</Badge>
					),
			},
			{
				accessorKey: "actions",
				header: "",
				cell: (info) => (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={`Actions for ${info.row.original.symbol}`}
							>
								<MoreVertical />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<Link
								to="/stock/$id"
								params={{ id: String(info.row.original.id) }}
							>
								<DropdownMenuItem>Edit</DropdownMenuItem>
							</Link>
							<DropdownMenuItem disabled>Delete</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				),
				enableSorting: false,
				enableColumnFilter: false,
			},
		],
		[],
	);

	const stocks = useQuery({
		queryKey: ["stocks"],
		queryFn: async () => {
			const time = Date.now();
			const stocks = await getAllStocks();
			console.log("Fetched stocks:", stocks);
			const prices = await getAllStockPrices();
			console.log("Fetched prices:", prices);
			for (const stock of stocks) {
				stock.price = prices[stock.id];
			}
			console.log(
				"Total time to fetch stocks and prices:",
				Date.now() - time,
				"ms",
			);
			return stocks;
		},
	});
	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState({});
	const table = useTable({
		features: adminTableFeatures,
		columns,
		data: stocks.data || [],
		getRowId: (row) => String(row.id),
		onSortingChange: setSorting,
		onRowSelectionChange: setRowSelection,
		state: {
			sorting,
			rowSelection,
		},
	});

	const addStockForm = useForm({
		defaultValues: {
			name: "",
			symbol: "",
			sector: "",
			volatility: 0,
			initPrice: 0,
		},
		onSubmit: async ({ value }) => {
			// Call API to add stock
			try {
				const stockData: Omit<
					Stock,
					"id" | "created_at" | "locked" | "name_tsv"
				> = {
					name: value.name,
					symbol: value.symbol,
					sector: value.sector,
					volatility: value.volatility,
				};
				const newStock = await addStock(stockData, value.initPrice);
				console.log("Added new stock:", newStock);
				toast.success("Stock added successfully!");
				stocks.refetch();
			} catch (error) {
				console.error("Error adding stock:", error);
				toast.error("Failed to add stock.");
			}
		},
	});

	const allSectors = useQuery({
		queryKey: ["sectors"],
		queryFn: async () => {
			const res = await getAllSectors();
			return res;
		},
	});

	if (stocks.isLoading) {
		return <Loading text="Loading stocks..." />;
	}

	if (stocks.isError) {
		return (
			<div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
				Could not load the stocks.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<PageHeader
				title="Stocks"
				description={`${stocks.data?.length ?? 0} listed. Prices update live.`}
				action={
				<Dialog>
					<DialogTrigger asChild>
						<Button>
							<Plus data-icon="inline-start" />
							Add stock
						</Button>
					</DialogTrigger>
					<DialogContent>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								addStockForm.handleSubmit();
							}}
						>
							<DialogHeader>
								<DialogTitle>Add Stock</DialogTitle>
								<DialogDescription>
									This will add a new stock to the database. Please ensure that
									the data is accurate before submitting.
								</DialogDescription>
							</DialogHeader>
							<FieldGroup className="my-4">
								<FieldSet>
									<FieldGroup>
										<addStockForm.Field name="name">
											{({ state, handleChange, handleBlur }) => (
												<Field>
													<FieldLabel>Stock Name</FieldLabel>
													<Input
														type="text"
														value={state.value}
														onChange={(e) => handleChange(e.target.value)}
														onBlur={handleBlur}
													/>
												</Field>
											)}
										</addStockForm.Field>
										<addStockForm.Field name="symbol">
											{({ state, handleChange, handleBlur }) => (
												<Field>
													<FieldLabel>Stock Symbol</FieldLabel>
													<Input
														type="text"
														value={state.value}
														onChange={(e) => handleChange(e.target.value)}
														onBlur={handleBlur}
													/>
												</Field>
											)}
										</addStockForm.Field>
										<addStockForm.Field name="sector">
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
										</addStockForm.Field>
										<addStockForm.Field name="volatility">
											{({ state, handleChange, handleBlur }) => (
												<Field>
													<FieldLabel>Volatility</FieldLabel>
													<Input
														type="number"
														value={state.value}
														onChange={(e) =>
															handleChange(Number(e.target.value))
														}
														onBlur={handleBlur}
													/>
												</Field>
											)}
										</addStockForm.Field>
										<addStockForm.Field name="initPrice">
											{({ state, handleChange, handleBlur }) => (
												<Field>
													<FieldLabel>Initial Price</FieldLabel>
													<Input
														type="number"
														value={state.value}
														onChange={(e) =>
															handleChange(Number(e.target.value))
														}
														onBlur={handleBlur}
													/>
												</Field>
											)}
										</addStockForm.Field>
									</FieldGroup>
								</FieldSet>
							</FieldGroup>
							<DialogFooter>
								<FieldGroup>
									<addStockForm.Subscribe
										selector={(state) => [state.canSubmit, state.isSubmitting]}
									>
										{([canSubmit, isSubmitting]) => (
											<Button
												type="submit"
												disabled={!canSubmit || isSubmitting}
											>
												{isSubmitting && <Spinner className="mr-2" />}
												{isSubmitting ? "Adding..." : "Add Record"}
											</Button>
										)}
									</addStockForm.Subscribe>
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
				}
			/>

			{stocks.isPending && (
				<div className="flex items-center justify-center py-8">
					<Spinner />
					<span className="ml-2">Searching stocks...</span>
				</div>
			)}
			{stocks.isSuccess && (
				<div className="overflow-x-auto rounded-lg border">
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id} className="hover:bg-transparent">
									{headerGroup.headers.map((header) =>
										header.isPlaceholder ? null : (
											<TableHead
												key={header.id}
												className="h-9 text-xs select-none"
											>
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
								<MemoizedRow key={row.id} row={row} />
							))}
						</TableBody>
					</Table>
					<FieldDescription className="border-t px-4 py-3">
						{Object.keys(rowSelection).length} of{" "}
						{table.getPreFilteredRowModel().rows.length} rows selected.
					</FieldDescription>
				</div>
			)}
			{table.getFilteredSelectedRowModel().rows.length > 0 && (
				// Clear of the tab bar on phones and centred on the page beside the rail.
				<div className="fixed bottom-20 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4 rounded-xl border bg-background/90 p-2 pl-4 text-sm shadow-lg backdrop-blur md:bottom-4 md:left-[calc(50%+6.5rem)]">
					{table.getFilteredSelectedRowModel().rows.length} of{" "}
					{table.getPreFilteredRowModel().rows.length} rows selected.
					<ButtonGroup>
						<ButtonGroup>
							<Button
								variant="destructive"
								size="icon"
								aria-label="Delete selected"
							>
								<Trash2 />
							</Button>
						</ButtonGroup>
						<ButtonGroup>
							<Button variant="outline">Lock/Unlock</Button>
							<Button variant="outline">View Details</Button>
						</ButtonGroup>
					</ButtonGroup>
				</div>
			)}
		</div>
	);
}
