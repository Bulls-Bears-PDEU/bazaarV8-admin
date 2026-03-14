import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { SortAsc, SortDesc } from "lucide-react";
import { useMemo, useState } from "react";
import { getAllStocks } from "#/api/stocks";
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

const columnHelper = createColumnHelper<Stock>();

function RouteComponent() {
	const columns = useMemo(
		() => [
			columnHelper.accessor("id", {
				header: "ID",
			}),
			columnHelper.accessor("symbol", {
				header: "Symbol",
				cell: (info) => info.getValue().toUpperCase(),
				// sortUndefined: "last",
			}),
			columnHelper.accessor("name", {
				header: "Name",
			}),
			columnHelper.accessor("price", {
				header: "Price",
			}),
			columnHelper.accessor("volume", {
				header: "Volume",
			}),
			columnHelper.accessor("drift", {
				header: "Drift",
			}),
			columnHelper.accessor("volatility", {
				header: "Volatility",
			}),
			columnHelper.accessor("sector", {
				header: "Sector",
			}),
			columnHelper.accessor("created_at", {
				header: "Created At",
				cell: (info) => new Date(info.getValue()).toLocaleString(),
			}),
			columnHelper.accessor("isLocked", {
				header: "Is Locked",
			}),
		],
		[],
	);
	const stocks = useQuery({
		queryKey: ["stocks"],
		queryFn: getAllStocks,
	});
	const [sorting, setSorting] = useState<SortingState>([]);
	const table = useReactTable({
		columns,
		data: stocks.data || [],
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: {
			sorting,
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
			<Table>
				<TableHeader className="bg-muted">
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) =>
								header.isPlaceholder ? null : (
									<TableHead
										key={header.id}
										onClick={header.column.getToggleSortingHandler()}
										className="cursor-pointer select-none "
									>
										<div className="flex items-center justify-between gap-1 text-lg">
											{flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
											{{
												asc: <SortAsc className="w-4" />,
												desc: <SortDesc className="w-4" />,
											}[header.column.getIsSorted() as string] ?? null}
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
}
