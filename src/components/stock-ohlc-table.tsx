import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	type SortingState,
	useTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowDownUp, ArrowUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getStockOhlc } from "#/api/stocks";
import useSocket from "#/hooks/use-socket";
import { type AdminTableFeatures, adminTableFeatures } from "#/lib/table";
import { cn } from "#/lib/utils";
import type { StockOHLC } from "#/types/stock";
import { Checkbox } from "./ui/checkbox";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./ui/table";

type ColumnMeta = { align?: "right"; width?: string };

const metaOf = (meta: unknown) => (meta ?? {}) as ColumnMeta;

/** Right-align numbers so their digits line up. */
const isRight = (meta: unknown) => metaOf(meta).align === "right";

/**
 * Rows are absolutely positioned by the virtualiser, so they cannot rely on a
 * table laying the columns out: each column carries its own width instead.
 */
const widthOf = (meta: unknown) =>
	metaOf(meta).width ?? "flex-1 basis-0 min-w-[5rem]";

/** Fixed row height, which is what lets the virtualiser measure without rendering. */
const ROW_HEIGHT = 30;

const formatPrice = (value: number | string) =>
	Number(value).toLocaleString("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

/**
 * How many candles the table keeps. Only the visible handful is ever rendered,
 * so this is about how much is worth sending and sorting rather than how much
 * the browser can draw: a stock gains a candle a second, and the whole history
 * is tens of thousands of rows by the end of a session.
 */
const MAX_ROWS = 2_000;

/**
 * How often live candles are folded into the table. The engine ticks every
 * second, but this is a log of finished candles rather than a price readout,
 * and re-sorting and re-rendering every row at that rate is what made the page
 * crawl. Candles that arrive in between are held and applied together.
 */
const FLUSH_MS = 2_000;

const tableKey = (stockId: string) =>
	["stock", stockId, "ohlc", "table", MAX_ROWS] as const;

const StockOhlcTable = ({ stockId }: { stockId: string }) => {
	const stockOHLCData = useQuery({
		queryKey: tableKey(stockId),
		queryFn: () => getStockOhlc(stockId, MAX_ROWS),
	});

	// Newest first: the candle being built right now sits at the top.
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "timestamp", desc: true },
	]);
	// Rebuilt only when it has to be: a fresh array every render makes the table
	// throw away its column and row models on every tick.
	const columns: ColumnDef<AdminTableFeatures, StockOHLC>[] = useMemo(
		() => [
			{
				id: "select",
				meta: { width: "w-10 shrink-0" },
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
				meta: { width: "w-44 shrink-0" },
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
		],
		[],
	);
	const rows = useMemo(() => stockOHLCData.data ?? [], [stockOHLCData.data]);
	const table = useTable({
		features: adminTableFeatures,
		data: rows,
		columns,
		state: {
			sorting,
		},
		onSortingChange: setSorting,
	});

	const scrollRef = useRef<HTMLDivElement>(null);
	const tableRows = table.getRowModel().rows;
	const virtualizer = useVirtualizer({
		count: tableRows.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => ROW_HEIGHT,
		// A few rows either side, so scrolling does not reach empty space first.
		overscan: 12,
	});
	const virtualRows = virtualizer.getVirtualItems();

	const socket = useSocket();
	const queryClient = useQueryClient();
	// Live candles, applied in batches rather than one re-render per tick.
	useEffect(() => {
		if (!socket || !stockId) return;
		const pending = new Map<string, StockOHLC>();

		const onUpdate = (updated: StockOHLC) => {
			if (updated.stock_id !== Number(stockId)) return;
			// Keyed by timestamp, so the candle still being built collapses into
			// one entry however many times it ticks before the next flush.
			pending.set(String(updated.timestamp), updated);
		};

		const flush = () => {
			if (pending.size === 0) return;
			const arriving = [...pending.values()];
			pending.clear();
			queryClient.setQueryData(
				tableKey(stockId),
				(oldData: StockOHLC[] | undefined) => {
					const next = oldData ? [...oldData] : [];
					for (const candle of arriving) {
						const index = next.findIndex(
							(item) => item.timestamp === candle.timestamp,
						);
						if (index === -1) next.push(candle);
						else next[index] = candle;
					}
					// Oldest dropped rather than letting the table grow all session.
					return next.slice(-MAX_ROWS);
				},
			);
		};

		socket.on("stockPriceUpdate", onUpdate);
		const timer = setInterval(flush, FLUSH_MS);
		// Only this handler: other components listen on the same shared socket.
		return () => {
			socket.off("stockPriceUpdate", onUpdate);
			clearInterval(timer);
		};
	}, [socket, stockId, queryClient]);

	return (
		<div
			ref={scrollRef}
			className="relative h-[28rem] w-full max-w-full overflow-auto rounded-lg border"
		>
			{/* Laid out as a grid rather than a table: the rows are positioned by
			    the virtualiser, so the browser's own table layout cannot be the
			    thing that decides where the columns sit. */}
			<table role="table" className="grid w-full caption-bottom text-sm">
				<TableHeader
					role="rowgroup"
					className="sticky top-0 z-10 grid bg-background"
				>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow
							key={headerGroup.id}
							role="row"
							className="flex w-full hover:bg-transparent"
						>
							{headerGroup.headers.map((header) =>
								header.isPlaceholder ? null : (
									<TableHead
										key={header.id}
										role="columnheader"
										className={cn(
											"flex h-9 items-center text-xs select-none",
											widthOf(header.column.columnDef.meta),
											isRight(header.column.columnDef.meta) && "justify-end",
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
				<TableBody
					role="rowgroup"
					className="relative grid font-mono text-xs tabular-nums"
					// The full height of every row, so the scrollbar is the right
					// length even though almost none of them exist.
					style={{ height: `${virtualizer.getTotalSize()}px` }}
				>
					{virtualRows.map((virtualRow) => {
						const row = tableRows[virtualRow.index];
						return (
							<TableRow
								key={row.id}
								role="row"
								data-index={virtualRow.index}
								data-state={row.getIsSelected() ? "selected" : undefined}
								className="absolute flex w-full items-center"
								style={{
									height: `${virtualRow.size}px`,
									transform: `translateY(${virtualRow.start}px)`,
								}}
							>
								{row.getVisibleCells().map((cell) => (
									<TableCell
										key={cell.id}
										role="cell"
										className={cn(
											"flex items-center py-0",
											widthOf(cell.column.columnDef.meta),
											isRight(cell.column.columnDef.meta) && "justify-end",
										)}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						);
					})}
				</TableBody>
			</table>
			{tableRows.length === 0 && (
				<p className="py-8 text-center text-sm text-muted-foreground">
					{stockOHLCData.isPending ? "Loading candles…" : "No candles yet."}
				</p>
			)}
		</div>
	);
};

export default StockOhlcTable;
