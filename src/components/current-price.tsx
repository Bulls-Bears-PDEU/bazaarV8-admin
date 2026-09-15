import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getStockPrice } from "#/api/stocks";
import useSocket from "#/hooks/use-socket";
import { cn } from "#/lib/utils";
import type { StockOHLC } from "#/types/stock";
import { Skeleton } from "./ui/skeleton";

const formatCurrency = (value?: number | null) =>
	value === null || value === undefined || Number.isNaN(value)
		? "—"
		: `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The stock's live price as a figure in the player app's style: the backend's
 * current price, then the close of each candle the engine pushes.
 */
const StockCurrentPrice = ({ stockId, className }: { stockId: string; className?: string }) => {
	const queryKey = ["stock", stockId, "currentPrice"];
	const stockCurrentPrice = useQuery({
		queryKey,
		queryFn: () => getStockPrice(stockId, false),
		enabled: Boolean(stockId),
	});
	const socket = useSocket();
	const queryClient = useQueryClient();

	// Only this handler is removed on cleanup: other components listen for the
	// same event on the shared socket.
	useEffect(() => {
		if (!socket || !stockId) return;
		const onUpdate = (data: StockOHLC) => {
			if (data.stock_id !== Number(stockId)) return;
			queryClient.setQueryData(["stock", stockId, "currentPrice"], { price: Number(data.close_price) });
		};
		socket.on("stockPriceUpdate", onUpdate);
		return () => {
			socket.off("stockPriceUpdate", onUpdate);
		};
	}, [socket, queryClient, stockId]);

	const price = stockCurrentPrice.data?.price ?? null;

	return (
		<div className={cn("flex min-w-0 flex-col gap-1", className)}>
			<span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Current price</span>
			{stockCurrentPrice.isPending ? (
				<Skeleton className="h-8 w-36" />
			) : (
				<span className="font-mono text-2xl leading-tight tabular-nums">{formatCurrency(price)}</span>
			)}
			<span className="text-xs text-muted-foreground">Live</span>
		</div>
	);
};

export default StockCurrentPrice;
