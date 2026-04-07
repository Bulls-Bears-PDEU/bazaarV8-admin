import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { getLeaderboard } from "#/api/leaderboard";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Badge } from "#/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Spinner } from "#/components/ui/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import useSocket from "#/hooks/use-socket";
import { cn } from "#/lib/utils";
import type { LeaderboardEntry } from "#/types/leaderboard";

export const Route = createFileRoute("/_admin/leaderboard")({
	component: RouteComponent,
});

function RouteComponent() {
	const queryClient = useQueryClient();
	const socket = useSocket();

	const {
		data: leaderboard,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ["leaderboard"],
		queryFn: getLeaderboard,
	});

	useEffect(() => {
		if (!socket) return;

		const handleLeaderboardUpdate = (
			updatedLeaderboard: LeaderboardEntry[],
		) => {
			if (Array.isArray(updatedLeaderboard)) {
				queryClient.setQueryData(["leaderboard"], updatedLeaderboard);
			} else {
				queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
			}
		};

		socket.on("leaderboard_update", handleLeaderboardUpdate);

		return () => {
			socket.off("leaderboard_update", handleLeaderboardUpdate);
		};
	}, [socket, queryClient]);

	if (isLoading) {
		return (
			<div className="flex h-screen w-full flex-col items-center justify-center">
				<Spinner className="text-muted-foreground" />
				<p className="mt-4 animate-pulse text-sm text-muted-foreground">
					Loading standings...
				</p>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="flex h-screen w-full flex-col items-center justify-center">
				<p className="text-sm text-destructive">
					Failed to load leaderboard data.
				</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-4xl py-10 px-4 sm:px-6">
			<div className="mb-8 flex flex-col gap-2">
				<h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
				<p className="text-muted-foreground">
					Highest performing traders by total profit.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Top Traders</CardTitle>
					<CardDescription>
						Live real-time standings updated continuously.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[100px] text-center">Rank</TableHead>
								<TableHead>Trader</TableHead>
								<TableHead className="text-right">Total Profit</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{leaderboard?.map((entry, index) => {
								const rank = index + 1;
								const isTop3 = rank <= 3;

								return (
									<TableRow
										key={entry.id}
										className={cn(isTop3 && "bg-muted/20")}
									>
										<TableCell className="text-center font-medium">
											{rank === 1 ? (
												<Badge
													variant="default"
													className="bg-yellow-500 hover:bg-yellow-600 text-black border-transparent"
												>
													1st
												</Badge>
											) : rank === 2 ? (
												<Badge
													variant="secondary"
													className="bg-slate-300 hover:bg-slate-400 text-slate-900 border-transparent"
												>
													2nd
												</Badge>
											) : rank === 3 ? (
												<Badge
													variant="outline"
													className="bg-amber-600 hover:bg-amber-700 text-white border-transparent"
												>
													3rd
												</Badge>
											) : (
												<span className="text-muted-foreground">#{rank}</span>
											)}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-3">
												<Avatar className="h-9 w-9">
													<AvatarImage
														src={entry.image || undefined}
														alt={entry.name}
													/>
													<AvatarFallback>
														{entry.name.slice(0, 2).toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<div className="flex flex-col">
													<span className="font-medium leading-none">
														{entry.name}
													</span>
													<span className="mt-1.5 text-xs text-muted-foreground">
														ID: {entry.id}
													</span>
												</div>
											</div>
										</TableCell>
										<TableCell className="text-right">
											<div className="flex items-center justify-end gap-2 font-mono font-medium">
												<TrendingUp className="h-4 w-4 text-muted-foreground" />
												{formatProfit(entry.total_profit)}
											</div>
										</TableCell>
									</TableRow>
								);
							})}

							{leaderboard?.length === 0 && (
								<TableRow>
									<TableCell
										colSpan={3}
										className="h-24 text-center text-muted-foreground"
									>
										No traders on the leaderboard yet.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}

function formatProfit(value: string | number) {
	const num = typeof value === "string" ? parseFloat(value) : value;
	if (Number.isNaN(num)) return value;
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 2,
	}).format(num);
}
