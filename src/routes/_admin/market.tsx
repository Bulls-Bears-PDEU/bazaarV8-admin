import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	ListX,
	Minus,
	Pause,
	Play,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cancelAllOrders } from "#/api/god-mode";
import {
	getMarketState,
	setMarketPaused,
	setMarketSentiment,
} from "#/api/market";
import { MarketOverview } from "#/components/market-overview";
import { PageHeader } from "#/components/page-header";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Skeleton } from "#/components/ui/skeleton";
import { Spinner } from "#/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { ConfirmDangerous } from "#/components/users/confirm-dangerous";
import useSocket from "#/hooks/use-socket";
import { cn } from "#/lib/utils";
import type { MarketSentiment, MarketState } from "#/types/market";

export const Route = createFileRoute("/_admin/market")({
	component: RouteComponent,
});

const SENTIMENTS: {
	value: MarketSentiment;
	label: string;
	icon: typeof TrendingUp;
	effect: string;
	active: string;
}[] = [
	{
		value: "bearish",
		label: "Bearish",
		icon: TrendingDown,
		effect: "Prices were knocked down and keep drifting lower.",
		active: "data-[state=on]:bg-loss-muted data-[state=on]:text-loss",
	},
	{
		value: "neutral",
		label: "Neutral",
		icon: Minus,
		effect:
			"No tilt. Prices stay where the last move left them and drift on noise and news alone.",
		active: "data-[state=on]:bg-background data-[state=on]:text-foreground",
	},
	{
		value: "bullish",
		label: "Bullish",
		icon: TrendingUp,
		effect: "Prices were marked up and keep drifting higher.",
		active: "data-[state=on]:bg-gain-muted data-[state=on]:text-gain",
	},
];

const formatTime = (value: string) =>
	new Date(value).toLocaleTimeString("en-IN", {
		hour: "2-digit",
		minute: "2-digit",
	});

function RouteComponent() {
	const queryClient = useQueryClient();
	const socket = useSocket();
	const [confirmPause, setConfirmPause] = useState(false);
	const [confirmClear, setConfirmClear] = useState(false);
	const clearOrders = useMutation({
		mutationFn: cancelAllOrders,
		onSuccess: (result) => {
			toast.success(`Cancelled ${result.cancelled} open order(s).`);
			setConfirmClear(false);
		},
		onError: () => toast.error("Could not clear the book."),
	});

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
			setConfirmPause(false);
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

	const state = marketState.data;
	const isPaused = state?.is_paused ?? false;
	const current = SENTIMENTS.find(
		(option) => option.value === state?.sentiment,
	);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Market"
				description="Run trading and steer the market. Players see these changes live."
			/>

			{/* The two controls an organiser reaches for, side by side on one bar. */}
			<Card className="grid gap-0 p-0 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
				<section
					aria-labelledby="trading-heading"
					className="flex flex-col gap-3 border-b p-4 md:border-r md:border-b-0 md:p-5"
				>
					<h2
						id="trading-heading"
						className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
					>
						Trading
					</h2>
					{state ? (
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex min-w-0 items-center gap-3" role="status">
								<span className="relative flex size-2.5 shrink-0">
									{!isPaused && (
										<span className="absolute inline-flex size-full animate-ping rounded-full bg-gain opacity-75 motion-reduce:animate-none" />
									)}
									<span
										className={cn(
											"relative inline-flex size-2.5 rounded-full",
											isPaused ? "bg-loss" : "bg-gain",
										)}
									/>
								</span>
								<div className="flex min-w-0 flex-col">
									<span className="font-medium">
										{isPaused ? "Paused" : "Live"}
									</span>
									<span className="truncate text-xs text-muted-foreground">
										{isPaused
											? state.paused_at
												? `Prices frozen since ${formatTime(state.paused_at)}`
												: "Prices are frozen"
											: "Prices move every second"}
									</span>
								</div>
							</div>
							{isPaused ? (
								<Button
									onClick={() => pauseMutation.mutate(false)}
									disabled={pauseMutation.isPending}
								>
									{pauseMutation.isPending ? (
										<Spinner data-icon="inline-start" />
									) : (
										<Play data-icon="inline-start" />
									)}
									Resume
								</Button>
							) : (
								<Button
									variant="outline"
									className="border-loss/40 text-loss hover:bg-loss-muted hover:text-loss"
									onClick={() => setConfirmPause(true)}
									disabled={pauseMutation.isPending}
								>
									<Pause data-icon="inline-start" />
									Pause
								</Button>
							)}
						</div>
					) : (
						<Skeleton className="h-10 w-full" />
					)}
				</section>

				<section
					aria-labelledby="sentiment-heading"
					className="flex flex-col gap-3 p-4 md:p-5"
				>
					<div className="flex items-center justify-between gap-3">
						<h2
							id="sentiment-heading"
							className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
						>
							Sentiment
						</h2>
						{sentimentMutation.isPending && (
							<Spinner className="size-3.5 text-muted-foreground" />
						)}
					</div>
					{/* A segmented control: three equal options that never outgrow the bar. */}
					<ToggleGroup
						type="single"
						spacing={1}
						aria-labelledby="sentiment-heading"
						value={state?.sentiment ?? ""}
						// Radix emits "" when the pressed item is pressed again, and a
						// market always has one sentiment.
						onValueChange={(value) =>
							value && sentimentMutation.mutate(value as MarketSentiment)
						}
						disabled={!state || sentimentMutation.isPending}
						className="grid w-full grid-cols-3 gap-1 rounded-lg bg-muted p-1"
					>
						{SENTIMENTS.map(({ value, label, icon: Icon, active }) => (
							<ToggleGroupItem
								key={value}
								value={value}
								aria-label={label}
								className={cn(
									"h-9 min-w-0 gap-1.5 rounded-md border-0 px-2 text-sm font-medium text-muted-foreground data-[state=on]:shadow-sm",
									active,
								)}
							>
								<Icon className="size-4 shrink-0" />
								<span className="truncate">{label}</span>
							</ToggleGroupItem>
						))}
					</ToggleGroup>
					<p className="text-xs text-muted-foreground">
						{current ? current.effect : "Loading…"}
						{isPaused && " Takes effect when trading resumes."}
					</p>
				</section>
			</Card>

			<MarketOverview isPaused={isPaused} />

			<Card>
				<section className="flex flex-col gap-3 p-4 md:p-5">
					<h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
						The order book
					</h2>
					<p className="text-sm text-muted-foreground">
						Clears every resting limit order in the market and gives each player
						back whatever theirs were holding aside. Positions are untouched.
					</p>
					<Button
						variant="outline"
						className="w-fit border-loss/40 text-loss hover:bg-loss-muted hover:text-loss"
						onClick={() => setConfirmClear(true)}
					>
						<ListX data-icon="inline-start" />
						Cancel every open order
					</Button>
				</section>
			</Card>

			<ConfirmDangerous
				open={confirmClear}
				onOpenChange={setConfirmClear}
				title="Cancel every open order?"
				description="Every player's resting limit orders are cancelled at once and their reserved cash and margin released. This cannot be undone, and it is written to the action log."
				confirmWord="CANCEL ALL"
				actionLabel="Cancel every order"
				pending={clearOrders.isPending}
				onConfirm={() => clearOrders.mutate()}
			/>

			<Dialog open={confirmPause} onOpenChange={setConfirmPause}>
				<DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Pause the market?</DialogTitle>
						<DialogDescription>
							Every price freezes and players are sent to the market-closed
							screen until you resume. Orders cannot be placed while it is
							paused.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmPause(false)}>
							Keep trading
						</Button>
						<Button
							variant="destructive"
							onClick={() => pauseMutation.mutate(true)}
							disabled={pauseMutation.isPending}
						>
							{pauseMutation.isPending ? (
								<Spinner data-icon="inline-start" />
							) : (
								<Pause data-icon="inline-start" />
							)}
							Pause market
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
