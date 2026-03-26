import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	IndianRupee,
	TrendingDown,
	TrendingUp,
	TrendingUpDown,
} from "lucide-react";
import { useEffect } from "react";
import { getStockPrice } from "#/api/stocks";
import useSocket from "#/hooks/use-socket";
import type { StockOHLC, StockPrice } from "#/types/stock";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Spinner } from "./ui/spinner";

function formatPercent(value?: number | null) {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return "-";
	}

	return `${value.toFixed(2)}%`;
}

function formatCurrency(value?: number | null) {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return "-";
	}

	return value.toLocaleString("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

const StockCurrentPrice = ({ stockId }: { stockId: string }) => {
	const stockCurrentPrice = useQuery({
		queryKey: ["stock", stockId, "currentPrice"],
		queryFn: async () =>
			stockId ? await getStockPrice(stockId, true) : Promise.resolve(null),
	});

	const currentPrice = stockCurrentPrice.data?.price ?? null;
	const currentPriceChange = stockCurrentPrice.data?.priceChange ?? null;
	const currentPriceChangePercent =
		currentPrice !== null &&
		currentPriceChange !== null &&
		currentPrice - currentPriceChange !== 0
			? (currentPriceChange / (currentPrice - currentPriceChange)) * 100
			: null;

	const socket = useSocket();
	const queryClient = useQueryClient();
	useEffect(() => {
		if (stockCurrentPrice.isSuccess && stockCurrentPrice.data) {
			socket.on("stockPriceUpdate", (data: StockOHLC) => {
				queryClient.setQueryData(
					["stock", stockId, "currentPrice"],
					(oldData: StockPrice) => ({
						...oldData,
						price: data.close_price,
						priceChange: Number(data.close_price - data.open_price).toFixed(2),
						indicator:
							data.close_price > data.open_price
								? "up"
								: data.close_price < data.open_price
									? "down"
									: "neutral",
					}),
				);
			});
		}
	}, [
		stockCurrentPrice.isSuccess,
		stockCurrentPrice.data,
		socket,
		queryClient,
		stockId,
	]);

	// Fix div size to prevent layout shift when price updates, and also add a skeleton loader when loading
	if (stockCurrentPrice.isLoading) {
		return (
			<div className="rounded-xl bg-secondary p-4 font-mono w-48">
				<div className="text-xs uppercase tracking-wide text-muted-foreground">
					Current Price
				</div>

				<div className="mt-2 flex items-center gap-1 text-3xl font-semibold leading-none">
					<Spinner />
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-xl bg-secondary p-4 font-mono w-48">
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
							className={
								stockCurrentPrice.data?.indicator === "down"
									? "bg-red-500/15 text-red-500"
									: stockCurrentPrice.data?.indicator === "up"
										? "bg-green-500/15 text-green-500"
										: "bg-gray-500/15 text-white"
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
	);
};

export default StockCurrentPrice;
