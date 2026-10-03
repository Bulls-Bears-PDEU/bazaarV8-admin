import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Medal } from "lucide-react";
import { useEffect } from "react";
import { getLeaderboard } from "#/api/leaderboard";
import { PageHeader } from "#/components/page-header";
import { Stat } from "#/components/stat";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Skeleton } from "#/components/ui/skeleton";
import useSocket from "#/hooks/use-socket";
import { mediaUrl } from "#/lib/media";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_admin/leaderboard")({
	component: RouteComponent,
});

const inr = new Intl.NumberFormat("en-IN", {
	style: "currency",
	currency: "INR",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

const initials = (name: string) =>
	name
		.split(/\s+/)
		.filter(Boolean)
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase() || "?";

const trendText = (value: number) => (value > 0 ? "text-gain" : value < 0 ? "text-loss" : "text-muted-foreground");

const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${inr.format(Math.abs(value))}`;

function RouteComponent() {
	const queryClient = useQueryClient();
	const socket = useSocket();

	const board = useQuery({
		queryKey: ["leaderboard"],
		queryFn: getLeaderboard,
	});

	useEffect(() => {
		if (!socket) return;

		// The backend re-ranks every player every ten seconds and only signals
		// it; the board itself is fetched again.
		const handleLeaderboardUpdate = () => {
			queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
		};

		socket.on("leaderboard_update", handleLeaderboardUpdate);

		return () => {
			socket.off("leaderboard_update", handleLeaderboardUpdate);
		};
	}, [socket, queryClient]);

	// Every figure is the backend's: rank, net worth and P&L.
	const entries = board.data ?? [];
	const leader = entries[0];

	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="Leaderboard" description="Every player ranked by net worth, updated every 10 seconds." />

			<div className="grid grid-cols-2 gap-4 rounded-xl border p-4 md:grid-cols-3">
				<Stat label="Leader" value={leader?.name ?? "—"} />
				<Stat label="Leader's net worth" value={leader ? inr.format(leader.net_worth) : "—"} />
				<Stat
					label="Leader's profit"
					value={leader ? <span className={trendText(leader.pnl)}>{signed(leader.pnl)}</span> : "—"}
					hint="Since the start"
					className="col-span-2 md:col-span-1"
				/>
			</div>

			{board.isPending ? (
				<Skeleton className="h-96 w-full" />
			) : board.isError ? (
				<p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
					Could not load the leaderboard.
				</p>
			) : entries.length === 0 ? (
				<p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
					No players yet. Approved players appear here once they are ranked.
				</p>
			) : (
				<ol className="flex flex-col divide-y rounded-lg border">
					{entries.map((entry, index) => {
						const rank = entry.rank ?? index + 1;
						return (
							<li key={entry.id} className="flex items-center gap-3 px-3 py-3">
								<span
									className={cn(
										"flex w-8 justify-center font-mono text-sm tabular-nums",
										rank <= 3 && "font-semibold text-primary",
									)}
								>
									{rank <= 3 ? (
										<Medal
											className={cn(
												"size-5",
												rank === 1 && "text-amber-500",
												rank === 2 && "text-slate-400",
												rank === 3 && "text-orange-700 dark:text-orange-400",
											)}
											aria-label={`Rank ${rank}`}
										/>
									) : (
										rank
									)}
								</span>
								<Avatar className="size-8">
									{entry.image && <AvatarImage src={mediaUrl(entry.image)} alt="" />}
									<AvatarFallback className="text-xs">{initials(entry.name)}</AvatarFallback>
								</Avatar>
								<span className="flex min-w-0 flex-1 flex-col">
									<span className="truncate text-sm">{entry.name}</span>
									<span className="truncate font-mono text-[11px] text-muted-foreground">{entry.id}</span>
								</span>
								<span className="flex flex-col items-end">
									<span className="font-mono text-sm tabular-nums">{inr.format(entry.net_worth)}</span>
									<span className={cn("font-mono text-xs tabular-nums", trendText(entry.pnl))}>
										{signed(entry.pnl)}
									</span>
								</span>
							</li>
						);
					})}
				</ol>
			)}
		</div>
	);
}
