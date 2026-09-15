import { useQuery } from "@tanstack/react-query";
import {
	Activity,
	ArrowDown,
	ArrowUp,
	Landmark,
	Newspaper,
	Rocket,
	Scale,
	Users,
} from "lucide-react";
import { getMarketOverview } from "#/api/market";
import { IndexCard } from "#/components/index-card";
import { Badge } from "#/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { cn } from "#/lib/utils";
import type { SectorSnapshot, StockSnapshot } from "#/types/market";

const REFETCH_MS = 10_000;

function formatPrice(value?: number | null) {
	if (value === null || value === undefined || Number.isNaN(value)) return "—";
	return `₹${value.toLocaleString("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function formatCompactCurrency(value?: number | null) {
	if (value === null || value === undefined || Number.isNaN(value)) return "—";
	return `₹${value.toLocaleString("en-IN", {
		notation: "compact",
		maximumFractionDigits: 2,
	})}`;
}

function formatCount(value?: number | null) {
	if (value === null || value === undefined || Number.isNaN(value)) return "—";
	return value.toLocaleString("en-IN");
}

function formatPercent(value?: number | null) {
	if (value === null || value === undefined || Number.isNaN(value)) return "—";
	return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function directionClass(value?: number | null) {
	if (!value) return "text-muted-foreground";
	return value > 0 ? "text-gain" : "text-loss";
}

function DirectionIcon({ value }: { value?: number | null }) {
	if (!value) return null;
	return value > 0 ? (
		<ArrowUp className="size-3.5" />
	) : (
		<ArrowDown className="size-3.5" />
	);
}

function MoverRow({ stock }: { stock: StockSnapshot }) {
	return (
		<div className="flex items-center justify-between gap-3 py-2">
			<div className="min-w-0">
				<div className="font-mono font-medium truncate">{stock.symbol}</div>
				<div className="text-xs text-muted-foreground truncate">
					{stock.name}
				</div>
			</div>
			<div className="flex flex-col items-end gap-0.5 shrink-0">
				<span className="font-mono text-sm">
					{formatPrice(stock.current_price)}
				</span>
				<span
					className={cn(
						"flex items-center gap-0.5 font-mono text-xs",
						directionClass(stock.change_pct),
					)}
				>
					<DirectionIcon value={stock.change_pct} />
					{formatPercent(stock.change_pct)}
				</span>
			</div>
		</div>
	);
}

function SectorRow({ sector }: { sector: SectorSnapshot }) {
	// Bars are scaled against a 5% move so ordinary sectors stay readable and a
	// runaway one simply maxes out.
	const width = Math.min(Math.abs(sector.change_pct ?? 0) / 5, 1) * 100;
	const isUp = (sector.change_pct ?? 0) >= 0;

	return (
		<div className="flex flex-col gap-1.5 py-2">
			<div className="flex items-baseline justify-between gap-3 text-sm">
				<span className="truncate">{sector.sector}</span>
				<span
					className={cn("font-mono text-xs", directionClass(sector.change_pct))}
				>
					{formatPercent(sector.change_pct)}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
					<div
						className={cn("h-full rounded-full", isUp ? "bg-gain" : "bg-loss")}
						style={{ width: `${width}%` }}
					/>
				</div>
				<span className="font-mono text-[11px] text-muted-foreground shrink-0">
					{sector.advancing}/{sector.declining}
				</span>
			</div>
		</div>
	);
}

function StatCard({
	title,
	icon: Icon,
	value,
	valueClassName,
	detail,
}: {
	title: string;
	icon: React.ComponentType<{ className?: string }>;
	value: React.ReactNode;
	valueClassName?: string;
	detail: React.ReactNode;
}) {
	return (
		<Card>
			<CardHeader>
				<CardDescription className="flex items-center gap-2">
					<Icon className="size-4" />
					{title}
				</CardDescription>
				<CardTitle
					className={cn("font-mono text-2xl tabular-nums", valueClassName)}
				>
					{value}
				</CardTitle>
			</CardHeader>
			<CardContent className="text-xs text-muted-foreground">
				{detail}
			</CardContent>
		</Card>
	);
}

/**
 * A consolidated read of the whole market. Polls while the market is live and
 * holds still while it is paused, since frozen prices cannot change.
 */
export function MarketOverview({ isPaused }: { isPaused: boolean }) {
	const refetchInterval = isPaused ? false : REFETCH_MS;

	const overview = useQuery({
		queryKey: ["market-overview"],
		queryFn: () => getMarketOverview(),
		refetchInterval,
	});

	if (overview.isPending) {
		return (
			<div className="flex flex-col gap-4">
				<IndexCard isPaused={isPaused} />
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{["breadth", "capital", "activity", "listings"].map((key) => (
						<Skeleton key={key} className="h-28 w-full rounded-xl" />
					))}
				</div>
			</div>
		);
	}

	if (overview.isError || !overview.data) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Market snapshot didn't load</CardTitle>
					<CardDescription>
						{overview.error?.message ??
							"The market data could not be reached. It will retry on the next refresh."}
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const data = overview.data;
	const { breadth, activity, participants, news, ipos } = data;
	const decided = breadth.advancing + breadth.declining;
	const advancingShare = decided ? (breadth.advancing / decided) * 100 : 50;

	return (
		<div className="flex flex-col gap-4">
			<IndexCard isPaused={isPaused} />

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title="Breadth"
					icon={Scale}
					value={
						<span className="flex items-baseline gap-1.5">
							<span className="text-gain">{breadth.advancing}</span>
							<span className="text-muted-foreground text-lg">/</span>
							<span className="text-loss">{breadth.declining}</span>
						</span>
					}
					detail={
						<div className="flex flex-col gap-1.5">
							<div className="h-1 w-full rounded-full bg-loss-muted overflow-hidden">
								<div
									className="h-full rounded-full bg-gain"
									style={{ width: `${advancingShare}%` }}
								/>
							</div>
							<span>
								rising vs falling over the last {data.window_candles} candles, of{" "}
								{breadth.total} listed
							</span>
						</div>
					}
				/>

				<StatCard
					title="Capital in play"
					icon={Landmark}
					value={formatCompactCurrency(participants.net_worth)}
					detail={`${formatCompactCurrency(participants.total_cash)} cash · ${formatCompactCurrency(participants.holdings_value)} held in stock`}
				/>

				<StatCard
					title="Trades"
					icon={Activity}
					value={formatCount(activity.trade_count)}
					detail={`${formatCount(activity.total_volume)} shares · ${formatCompactCurrency(activity.total_value)} turnover`}
				/>

				<StatCard
					title="Traders"
					icon={Users}
					value={formatCount(participants.approved_users)}
					detail={
						<span className="flex flex-wrap items-center gap-1.5">
							{participants.investors} holding stock
							{participants.pending_users > 0 && (
								<Badge variant="outline">
									{participants.pending_users} awaiting approval
								</Badge>
							)}
						</span>
					}
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Leading</CardTitle>
						<CardDescription>
							Biggest risers over the last {data.window_candles} candles
						</CardDescription>
					</CardHeader>
					<CardContent className="divide-y">
						{data.top_gainers.length ? (
							data.top_gainers.map((stock) => (
								<MoverRow key={stock.id} stock={stock} />
							))
						) : (
							<p className="py-2 text-sm text-muted-foreground">
								Nothing is rising in this window.
							</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Lagging</CardTitle>
						<CardDescription>
							Biggest fallers over the last {data.window_candles} candles
						</CardDescription>
					</CardHeader>
					<CardContent className="divide-y">
						{data.top_losers.length ? (
							data.top_losers.map((stock) => (
								<MoverRow key={stock.id} stock={stock} />
							))
						) : (
							<p className="py-2 text-sm text-muted-foreground">
								Nothing is falling in this window.
							</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Sectors</CardTitle>
						<CardDescription>
							Average move over the last {data.window_candles} candles
						</CardDescription>
					</CardHeader>
					<CardContent className="divide-y">
						{data.sectors.length ? (
							data.sectors.map((sector) => (
								<SectorRow key={sector.sector} sector={sector} />
							))
						) : (
							<p className="py-2 text-sm text-muted-foreground">
								Add stocks to see sector performance.
							</p>
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
					<span className="flex items-center gap-2">
						<Newspaper className="size-4 text-muted-foreground" />
						<span className="font-mono">{news.released}</span> news released
						<span className="text-muted-foreground">
							· {news.scheduled} scheduled
						</span>
						{news.next_release_at && (
							<span className="text-muted-foreground">
								· next at {new Date(news.next_release_at).toLocaleTimeString()}
							</span>
						)}
					</span>

					<Separator orientation="vertical" className="h-4" />

					<span className="flex items-center gap-2">
						<Rocket className="size-4 text-muted-foreground" />
						<span className="font-mono">{ipos.open}</span> IPOs open
						<span className="text-muted-foreground">
							· {ipos.upcoming} upcoming · {ipos.listed} listed
						</span>
					</span>

					<span className="ml-auto font-mono text-xs text-muted-foreground">
						{isPaused
							? "prices frozen"
							: `updated ${new Date(data.generated_at).toLocaleTimeString()}`}
					</span>
				</CardContent>
			</Card>
		</div>
	);
}
