import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowDownUp, ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { getStockOhlc } from "#/api/stocks";
import useSocket from "#/hooks/use-socket";
import type { StockOHLC } from "#/types/stock";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./ui/table";

const StockOhlcTable = ({ stockId }: { stockId: string }) => {
	const stockOHLCData = useQuery({
		queryKey: ["stock", stockId, "ohlc", "table"],
		queryFn: async () => {
			const response = await getStockOhlc(stockId);
			return response;
		},
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
			cell: ({ row }) => {
				// Append 'Z' if the DB returns UTC without a timezone indicator
				const ts = row.original.timestamp;
				const utcTs = ts.endsWith("Z") ? ts : `${ts}Z`;
				return new Date(utcTs).toLocaleTimeString("en-IN", {
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
					fractionalSecondDigits: 3,
					timeZone: "Asia/Kolkata", // Explicitly force IST if desired
				});
			},
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
		data: stockOHLCData.data || [],
		columns,
		state: {
			sorting,
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
	});

	const socket = useSocket();
	const queryClient = useQueryClient();
	// Listen for real-time updates to the stock OHLC data
	useEffect(() => {
		if (!socket) return;

		if (stockId) {
			socket.on("stockPriceUpdate", (updatedData: StockOHLC) => {
				if (updatedData.stock_id === Number(stockId)) {
					// Update the table data with the new OHLC data
					queryClient.setQueryData(
						["stock", stockId, "ohlc", "table"],
						(oldData: StockOHLC[] | undefined) => {
							if (!oldData) return [updatedData];

							const index = oldData.findIndex(
								(item) => item.timestamp === updatedData.timestamp,
							);
							if (index !== -1) {
								const newData = [...oldData];
								newData[index] = updatedData;
								return newData;
							}
							return [...oldData, updatedData];
						},
					);
				}
			});
		}

		return () => {
			socket.off("stockPriceUpdate");
		};
	}, [socket, stockId, queryClient]);

	return (
		<div className="rounded-md border overflow-x-auto w-full max-w-full relative">
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
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
};

export default StockOhlcTable;
