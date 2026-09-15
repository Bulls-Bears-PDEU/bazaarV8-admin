import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	type SortingState,
	useTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowDownUp, ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { getStockOhlc } from "#/api/stocks";
import useSocket from "#/hooks/use-socket";
import { type AdminTableFeatures, adminTableFeatures } from "#/lib/table";
import { cn } from "#/lib/utils";
import type { StockOHLC } from "#/types/stock";
import { Checkbox } from "./ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./ui/table";

/** Column meta: right-align numbers so their digits line up. */
const isRight = (meta: unknown) =>
	(meta as { align?: "right" } | undefined)?.align === "right";

const formatPrice = (value: number | string) =>
	Number(value).toLocaleString("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

const StockOhlcTable = ({ stockId }: { stockId: string }) => {
	const stockOHLCData = useQuery({
		queryKey: ["stock", stockId, "ohlc", "table"],
		queryFn: async () => {
			const response = await getStockOhlc(stockId);
			return response;
		},
	});

	// Newest first: the candle being built right now sits at the top.
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "timestamp", desc: true },
	]);
	const columns: ColumnDef<AdminTableFeatures, StockOHLC>[] = [
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
				<button
					type="button"
					onClick={column.getToggleSortingHandler()}
					className="inline-flex items-center gap-1 hover:text-foreground"
				>
					Time
					{column.getIsSorted() === "asc" ? (
						<ArrowUp className="size-3" />
					) : column.getIsSorted() === "desc" ? (
						<ArrowDown className="size-3" />
					) : (
						<ArrowDownUp className="size-3 opacity-50" />
					)}
				</button>
			),
			accessorKey: "timestamp",
			// display: HH:MM:SS:MS format of the timestamp
			cell: ({ row }) => {
				// Append 'Z' if the DB returns UTC without a timezone indicator
				const ts = row.original.timestamp;
				const utcTs = ts.endsWith("Z") ? ts : `${ts}Z`;
				return (
					<span className="text-muted-foreground">
						{new Date(utcTs).toLocaleTimeString("en-IN", {
							hour: "2-digit",
							minute: "2-digit",
							second: "2-digit",
							fractionalSecondDigits: 3,
							timeZone: "Asia/Kolkata", // Explicitly force IST if desired
						})}
					</span>
				);
			},
			enableSorting: true,
			sortDescFirst: true,
		},
		{
			header: "Open",
			accessorKey: "open_price",
			meta: { align: "right" },
			cell: ({ row }) => formatPrice(row.original.open_price),
		},
		{
			header: "High",
			accessorKey: "high_price",
			meta: { align: "right" },
			cell: ({ row }) => formatPrice(row.original.high_price),
		},
		{
			header: "Low",
			accessorKey: "low_price",
			meta: { align: "right" },
			cell: ({ row }) => formatPrice(row.original.low_price),
		},
		{
			header: "Close",
			accessorKey: "close_price",
			meta: { align: "right" },
			cell: ({ row }) => {
				const { open_price, close_price } = row.original;
				return (
					<span
						className={cn(
							close_price > open_price && "text-gain",
							close_price < open_price && "text-loss",
						)}
					>
						{formatPrice(close_price)}
					</span>
				);
			},
		},
	];
	const table = useTable({
		features: adminTableFeatures,
		data: stockOHLCData.data || [],
		columns,
		state: {
			sorting,
		},
		onSortingChange: setSorting,
	});

	const socket = useSocket();
	const queryClient = useQueryClient();
	// Listen for real-time updates to the stock OHLC data
	useEffect(() => {
		if (!socket) return;

		const onUpdate = (updatedData: StockOHLC) => {
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
		};

		if (stockId) socket.on("stockPriceUpdate", onUpdate);
		// Only this handler: other components listen on the same shared socket.
		return () => {
			socket.off("stockPriceUpdate", onUpdate);
		};
	}, [socket, stockId, queryClient]);

	return (
		<div className="relative max-h-[28rem] w-full max-w-full overflow-auto rounded-lg border">
			<Table>
				<TableHeader className="sticky top-0 z-10 bg-background">
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id} className="hover:bg-transparent">
							{headerGroup.headers.map((header) =>
								header.isPlaceholder ? null : (
									<TableHead
										key={header.id}
										className={cn(
											"h-9 text-xs select-none",
											isRight(header.column.columnDef.meta) && "text-right",
										)}
									>
										{flexRender(
											header.column.columnDef.header,
											header.getContext(),
										)}
									</TableHead>
								),
							)}
						</TableRow>
					))}
				</TableHeader>
				<TableBody className="font-mono text-xs tabular-nums">
					{table.getRowModel().rows.map((row) => (
						<TableRow
							key={row.id}
							data-state={row.getIsSelected() ? "selected" : undefined}
						>
							{row.getVisibleCells().map((cell) => (
								<TableCell
									key={cell.id}
									className={cn(
										"py-1.5",
										isRight(cell.column.columnDef.meta) && "text-right",
									)}
								>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</TableCell>
							))}
						</TableRow>
					))}
					{stockOHLCData.data?.length === 0 && (
						<TableRow>
							<TableCell
								colSpan={columns.length}
								className="py-8 text-center font-sans text-muted-foreground"
							>
								No candles yet.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
};

export default StockOhlcTable;
