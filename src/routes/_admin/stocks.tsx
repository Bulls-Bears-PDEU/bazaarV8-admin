import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
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
	MoreVertical,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { getAllStockPrices, getAllStocks } from "#/api/stocks";
import { Button } from "#/components/ui/button";
import { ButtonGroup } from "#/components/ui/button-group";
import { Checkbox } from "#/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { FieldDescription } from "#/components/ui/field";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import type { Stock } from "#/types/stock";

export const Route = createFileRoute("/_admin/stocks")({
	component: RouteComponent,
});

function RouteComponent() {
	const columns: ColumnDef<Stock & { price: number }>[] = [
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
						<Link to="/stock/$id" params={{ id: String(info.row.original.id) }}>
							<DropdownMenuItem>Edit</DropdownMenuItem>
						</Link>
						<DropdownMenuItem disabled>Delete</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			),
			enableSorting: false,
			enableColumnFilter: false,
		},
	];
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
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		onRowSelectionChange: setRowSelection,
		state: {
			sorting,
			rowSelection,
		},
	});

	if (stocks.isLoading) {
		return <div>Loading stocks...</div>;
	}

	if (stocks.isError) {
		return <div>Failed to load stocks.</div>;
	}

	return (
		<div className="p-4 w-full h-full ">
			<h2 className="mb-4 text-2xl font-bold">Stocks</h2>
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
							<TableRow key={row.id}>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
				<FieldDescription className="p-4">
					{Object.keys(rowSelection).length} of{" "}
					{table.getPreFilteredRowModel().rows.length} rows selected.
				</FieldDescription>
			</div>
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