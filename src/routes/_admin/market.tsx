import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Minus, Pause, Play, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import {
	getMarketState,
	setMarketPaused,
	setMarketSentiment,
} from "#/api/market";
import { MarketOverview } from "#/components/market-overview";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Spinner } from "#/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import useSocket from "#/hooks/use-socket";
import { authClient } from "#/lib/auth-client";
import { cn } from "#/lib/utils";
import type { MarketSentiment, MarketState } from "#/types/market";

export const Route = createFileRoute("/_admin/market")({
	component: RouteComponent,
});

const SENTIMENTS = [
	{
		value: "bullish" as const,
		label: "Bullish",
		icon: TrendingUp,
		hint: "Tilts every stock upwards",
		activeClass: "data-[state=on]:bg-gain-muted data-[state=on]:text-gain",
	},
	{
		value: "neutral" as const,
		label: "Neutral",
		icon: Minus,
		hint: "Leaves the baseline drift alone",
		activeClass:
			"data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
	},
	{
		value: "bearish" as const,
		label: "Bearish",
		icon: TrendingDown,
		hint: "Tilts every stock downwards",
		activeClass: "data-[state=on]:bg-loss-muted data-[state=on]:text-loss",
	},
];

function RouteComponent() {
	const queryClient = useQueryClient();
	const socket = useSocket();

	const marketState = useQuery({
		queryKey: ["market-state"],
		queryFn: getMarketState,
	});

	// The backend broadcasts every pause and sentiment change, so another admin's
	// action lands here without a refetch.
	useEffect(() => {
		if (!socket) return;

		const handleMarketStateUpdate = (state: MarketState) => {
			queryClient.setQueryData(["market-state"], state);
			// The snapshot embeds the market state and stops polling while paused,
			// so pull a fresh one as soon as the state changes.
			queryClient.invalidateQueries({ queryKey: ["market-overview"] });
		};

		socket.on("marketStateUpdate", handleMarketStateUpdate);

		return () => {
			socket.off("marketStateUpdate", handleMarketStateUpdate);
		};
	}, [socket, queryClient]);

	const pauseMutation = useMutation({
		mutationFn: (isPaused: boolean) => setMarketPaused(isPaused),
		onSuccess: (state) => {
			queryClient.setQueryData(["market-state"], state);
			toast.success(
				state.is_paused
					? "Market paused. Prices are frozen."
					: "Market resumed. Prices are moving again.",
			);
		},
		onError: (error) => {
			toast.error(error.message || "Could not change the market state.");
		},
	});

	const sentimentMutation = useMutation({
		mutationFn: (sentiment: MarketSentiment) => setMarketSentiment(sentiment),
		onSuccess: (state) => {
			queryClient.setQueryData(["market-state"], state);
			toast.success(`Sentiment set to ${state.sentiment}.`);
		},
		onError: (error) => {
			toast.error(error.message || "Could not change the sentiment.");
		},
	});

	const activeSessions = useQuery({
		queryKey: ["activeSessions"],
		queryFn: () => authClient.listSessions(),
	});

	const isPaused = marketState.data?.is_paused ?? false;
	const sentiment = marketState.data?.sentiment;
	const isLoading = marketState.isPending;
	const sessions = activeSessions.data?.data ?? [];

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6">
			<div className="flex flex-wrap items-center gap-3">
				<h1 className="text-2xl font-semibold tracking-tight">Market</h1>
				{marketState.data && (
					<Badge variant={isPaused ? "destructive" : "secondary"}>
						{isPaused ? "Paused" : "Live"}
					</Badge>
				)}
				{sentiment && <Badge variant="outline">{sentiment}</Badge>}
			</div>

			<MarketOverview isPaused={isPaused} />

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Sentiment</CardTitle>
						<CardDescription>
							Sets the direction the whole market drifts in. News and volatility
							still apply on top.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ToggleGroup
							type="single"
							variant="outline"
							spacing={2}
							value={sentiment ?? ""}
							disabled={isLoading || sentimentMutation.isPending}
							onValueChange={(value) => {
								// Radix emits "" when the active item is toggled off; the market
								// always has a sentiment, so ignore it.
								if (!value || value === sentiment) return;
								sentimentMutation.mutate(value as MarketSentiment);
							}}
						>
							{SENTIMENTS.map(
								({ value, label, icon: Icon, hint, activeClass }) => (
									<ToggleGroupItem
										key={value}
										value={value}
										aria-label={label}
										className={cn(
											"h-auto flex-1 flex-col items-start gap-1 rounded-lg px-3 py-2.5",
											activeClass,
										)}
									>
										<span className="flex items-center gap-2 font-medium">
											<Icon className="size-4" />
											{label}
										</span>
										<span className="text-xs text-muted-foreground text-left">
											{hint}
										</span>
									</ToggleGroupItem>
								),
							)}
						</ToggleGroup>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>
							{isPaused ? "Market paused" : "Trading is live"}
						</CardTitle>
						<CardDescription>
							{isPaused
								? "Prices are frozen and no candles are being generated. News timers resume where they left off."
								: "Pausing freezes every price and stops new candles. Use it between rounds or to fix a problem mid-event."}
						</CardDescription>
						<CardAction>
							<Button
								variant={isPaused ? "default" : "destructive"}
								disabled={isLoading || pauseMutation.isPending}
								onClick={() => pauseMutation.mutate(!isPaused)}
							>
								{pauseMutation.isPending ? (
									<Spinner data-icon="inline-start" />
								) : isPaused ? (
									<Play data-icon="inline-start" />
								) : (
									<Pause data-icon="inline-start" />
								)}
								{isPaused ? "Resume market" : "Pause market"}
							</Button>
						</CardAction>
					</CardHeader>
					{isPaused && marketState.data?.paused_at && (
						<CardContent className="font-mono text-xs text-muted-foreground">
							paused at{" "}
							{new Date(marketState.data.paused_at).toLocaleString("en-IN")}
						</CardContent>
					)}
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Active sessions</CardTitle>
					<CardDescription>
						Everyone signed in right now, newest first.
					</CardDescription>
					<CardAction>
						<Button
							variant="outline"
							size="sm"
							onClick={() => activeSessions.refetch()}
							disabled={activeSessions.isFetching}
						>
							{activeSessions.isFetching && (
								<Spinner data-icon="inline-start" />
							)}
							Refresh
						</Button>
					</CardAction>
				</CardHeader>
				<CardContent className="flex flex-col gap-2">
					<span className="font-mono text-2xl tabular-nums">
						{sessions.length}
					</span>
					{sessions.length ? (
						<div className="flex flex-col divide-y">
							{sessions.map((session) => (
								<div
									key={session.id}
									className="flex items-center justify-between gap-4 py-1.5 text-sm"
								>
									<span className="truncate font-mono text-xs">
										{session.userId}
									</span>
									<span className="shrink-0 font-mono text-xs text-muted-foreground">
										{new Date(session.createdAt).toLocaleTimeString("en-IN")}
									</span>
								</div>
							))}
						</div>
					) : (
						<span className="text-sm text-muted-foreground">
							Nobody is signed in.
						</span>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
