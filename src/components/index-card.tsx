import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowDown, ArrowUp, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { getIndex, getIndexHistory } from "#/api/market";
import { AreaChart } from "#/components/area-chart";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import useSocket from "#/hooks/use-socket";
import { formatPct, trendBadge } from "#/lib/format";
import { cn } from "#/lib/utils";
import type { IndexSnapshot } from "#/types/market";

// The same history the player dashboard draws: 180 ten second candles, the
// last half hour, measured from starting prices.
const INDEX_POINTS = 180;
const INDEX_KEY = ["market-index"] as const;

/**
 * The Bazaar index exactly as players see it on their dashboard. Every figure
 * is the backend's: the snapshot from /market/getIndex, replaced by each
 * "indexTick" the engine pushes, and the history from /market/getIndexHistory.
 */
export function IndexCard({ isPaused }: { isPaused: boolean }) {
	const queryClient = useQueryClient();
	const socket = useSocket();
	const index = useQuery({ queryKey: INDEX_KEY, queryFn: getIndex }).data;
	const history = useQuery({
		queryKey: ["market-index-history", "start", INDEX_POINTS],
		queryFn: () => getIndexHistory(INDEX_POINTS, "start"),
		refetchInterval: isPaused ? false : 30_000,
	});

	useEffect(() => {
		if (!socket) return;
		const onIndexTick = (snapshot: IndexSnapshot) => {
			queryClient.setQueryData(INDEX_KEY, snapshot);
		};
		socket.on("indexTick", onIndexTick);
		return () => {
			socket.off("indexTick", onIndexTick);
		};
	}, [socket, queryClient]);

	const level = index?.level ?? null;
	const change = index?.change_pct ?? null;
	const ChangeIcon = change == null || change === 0 ? Minus : change > 0 ? TrendingUp : TrendingDown;

	return (
		<Card>
			<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
				<div className="flex flex-col gap-1.5">
					<CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<Activity className="size-4 text-primary" />
						Bazaar index
					</CardTitle>
					<div className="flex items-center gap-3">
						<span className="font-mono text-3xl font-medium tabular-nums">
							{level == null ? "—" : level.toFixed(2)}
						</span>
						{/* The player dashboard's ChangeBadge. */}
						<span
							className={cn(
								"inline-flex min-w-[4.75rem] items-center justify-between gap-1 rounded-md px-1.5 py-0.5 font-mono text-xs tabular-nums transition-colors",
								trendBadge(change),
							)}
						>
							<ChangeIcon className="size-3 shrink-0" aria-hidden="true" />
							{formatPct(change)}
						</span>
					</div>
					<span className="text-xs text-muted-foreground">
						Every stock weighted equally. 100 is where the market started. Players see this same figure.
					</span>
				</div>
				{index && index.priced_stocks > 0 && (
					<div className="flex items-center gap-2 text-xs">
						<span className="flex items-center gap-1 rounded-md bg-gain-muted px-2 py-1 font-mono text-gain">
							<ArrowUp className="size-3" />
							{index.advancing} above start
						</span>
						<span className="flex items-center gap-1 rounded-md bg-loss-muted px-2 py-1 font-mono text-loss">
							<ArrowDown className="size-3" />
							{index.declining} below
						</span>
					</div>
				)}
			</CardHeader>
			<CardContent>
				{history.data ? (
					<AreaChart
						label="Bazaar index"
						storageKey="index-type"
						points={history.data.points}
						live={level == null || change == null ? null : { value: level, change_pct: change }}
						baseline={100}
						formatValue={(v) => v.toFixed(2)}
					/>
				) : (
					<Skeleton className="h-[19rem] w-full" />
				)}
			</CardContent>
		</Card>
	);
}
