import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type Row,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	ArrowDown,
	ArrowDownUp,
	ArrowUp,
	MoreVertical,
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
import type { Stock, StockOHLC } from "#/types/stock";

export const Route = createFileRoute("/_admin/stocks")({
	component: RouteComponent,
});

type StockRow = Stock & {
	price: number;
	indicator?: "up" | "down" | "neutral";
};

const MemoizedRow = memo(
	({ row }: { row: Row<StockRow> }) => {
		return (
			<TableRow>
				{row.getVisibleCells().map((cell) => (
					<TableCell key={cell.id}>
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

	const columns = useMemo<ColumnDef<StockRow>[]>(
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
			},
			{
				accessorKey: "symbol",
				header: "Symbol",
			},
			{
				accessorKey: "name",
				header: "Name",
			},
			{
				accessorKey: "price",
				header: ({ column }) => (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Price
						{column.getIsSorted() === "asc" ? (
							<ArrowUp className="ml-4 h-4 w-4" />
						) : column.getIsSorted() === "desc" ? (
							<ArrowDown className="ml-4 h-4 w-4" />
						) : (
							<ArrowDownUp className="ml-4 h-4 w-4" />
						)}
					</Button>
				),
				cell: ({ row }) => {
					const price = row.original.price;
					const indicator = row.original.indicator;
					return (
						<div className="flex items-center gap-2 px-4 font-mono">
							<span>₹{Number(price)?.toFixed(2) ?? "0.00"}</span>
							{indicator === "up" && (
								<ArrowUp className="h-4 w-4 text-green-500" />
							)}
							{indicator === "down" && (
								<ArrowDown className="h-4 w-4 text-red-500" />
							)}
							{!indicator && <span className="w-4 h-4 inline-block" />}
						</div>
					);
				},
				enableSorting: true,
			},
			{
				accessorKey: "volatility",
				header: "Volatility",
			},
			{
				accessorKey: "sector",
				header: "Sector",
			},
			{
				accessorKey: "created_at",
				header: "Created At",
				cell: (info) => new Date(info.getValue() as string).toLocaleString(),
			},
			{
				accessorKey: "isLocked",
				header: "Is Locked",
				cell: (info) => (info.getValue() ? "Yes" : "No"),
			},
			{
				accessorKey: "actions",
				header: "",
				cell: (info) => (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon">
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
	const table = useReactTable({
		columns,
		data: stocks.data || [],
		getRowId: (row) => String(row.id),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
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
					"id" | "created_at" | "isLocked" | "name_tsv"
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
		return <div>Failed to load stocks.</div>;
	}

	return (
		<div className="p-4 w-full h-full ">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-2xl font-bold">Stocks</h2>
				<Dialog>
					<DialogTrigger asChild>
						<Button>Add Stock</Button>
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
			</div>

			{stocks.isPending && (
				<div className="flex items-center justify-center py-8">
					<Spinner />
					<span className="ml-2">Searching stocks...</span>
				</div>
			)}
			{stocks.isSuccess && (
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) =>
										header.isPlaceholder ? null : (
											<TableHead
												key={header.id}
												className="cursor-pointer select-none "
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
					<FieldDescription className="p-4">
						{Object.keys(rowSelection).length} of{" "}
						{table.getPreFilteredRowModel().rows.length} rows selected.
					</FieldDescription>
				</div>
			)}
			{table.getFilteredSelectedRowModel().rows.length > 0 && (
				//align to center bottom of the screen
				<div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 dark:border backdrop-blur-sm bg-white/8 p-2 rounded-xl shadow-md flex items-center gap-4 border">
					{table.getFilteredSelectedRowModel().rows.length} of{" "}
					{table.getPreFilteredRowModel().rows.length} rows selected.
					<ButtonGroup>
						<ButtonGroup>
							<Button variant="destructive" size="icon">
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