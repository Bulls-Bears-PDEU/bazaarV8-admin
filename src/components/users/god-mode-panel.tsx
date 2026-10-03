import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Banknote,
	Layers,
	ListX,
	RotateCcw,
	TrendingDown,
	TrendingUp,
	Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	adjustCash,
	cancelUserOrders,
	closePosition,
	flattenUser,
	getGodModeView,
	openPosition,
	resetAccount,
} from "#/api/god-mode";
import { getAllStocks } from "#/api/stocks";
import { usersErrorMessage } from "#/api/users";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import { Spinner } from "#/components/ui/spinner";
import { ConfirmDangerous } from "#/components/users/confirm-dangerous";
import { USERS_KEY } from "#/components/users/user-actions";
import { formatINR, formatQty, formatSignedINR, trendText } from "#/lib/format";
import { cn } from "#/lib/utils";

export const GOD_KEY = ["god-mode"] as const;

/**
 * Direct control over one player's account.
 *
 * Nothing here is a special case in the engine: positions open and close
 * through the same settlement a player's own order uses, so the account this
 * leaves behind is one they could have reached themselves. What it skips is
 * their consent, which is why the irreversible parts are behind a typed
 * confirmation and every action is written to the trail.
 */
export function GodModePanel({
	userId,
	userName,
}: {
	userId: string;
	userName: string;
}) {
	const queryClient = useQueryClient();
	const view = useQuery({
		queryKey: [...GOD_KEY, userId],
		queryFn: () => getGodModeView(userId),
	});
	const stocks = useQuery({
		queryKey: ["stocks"],
		queryFn: getAllStocks,
		staleTime: 60_000,
	});

	const refresh = () => {
		queryClient.invalidateQueries({ queryKey: [...GOD_KEY, userId] });
		queryClient.invalidateQueries({ queryKey: USERS_KEY });
	};

	if (view.isPending) return <Skeleton className="h-64 w-full" />;
	if (!view.data) {
		return (
			<p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
				Could not load this account.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-5">
			<p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-muted-foreground">
				<Zap className="mt-0.5 size-3.5 shrink-0 text-destructive" />
				<span>
					The actions below change{" "}
					<span className="font-medium text-foreground">{userName}’s</span>{" "}
					account immediately, and they are not notified. Each action is
					recorded in the action log.
				</span>
			</p>

			<CashControls userId={userId} view={view.data} onDone={refresh} />
			<PositionControls
				userId={userId}
				userName={userName}
				view={view.data}
				stocks={stocks.data ?? []}
				onDone={refresh}
			/>
			<OrderControls
				userId={userId}
				userName={userName}
				view={view.data}
				onDone={refresh}
			/>
			<ResetControl userId={userId} userName={userName} onDone={refresh} />
		</div>
	);
}

/** One heading and its controls. */
function Block({
	icon: Icon,
	title,
	hint,
	children,
}: {
	icon: typeof Zap;
	title: string;
	hint?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-2.5 rounded-lg border p-3">
			<header className="flex items-center gap-2">
				<Icon className="size-4 shrink-0 text-muted-foreground" />
				<h4 className="text-sm font-medium">{title}</h4>
			</header>
			{hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
			{children}
		</section>
	);
}

/** Every action here reports the same way, so they share one shape. */
const useGodAction = <TArgs, TResult>(
	run: (args: TArgs) => Promise<TResult>,
	describe: (result: TResult) => string,
	onDone: () => void,
) =>
	useMutation({
		mutationFn: run,
		onSuccess: (result) => {
			toast.success(describe(result));
			onDone();
		},
		onError: (error) =>
			toast.error(usersErrorMessage(error, "That did not go through.")),
	});

type View = Awaited<ReturnType<typeof getGodModeView>>;

function CashControls({
	userId,
	view,
	onDone,
}: {
	userId: string;
	view: View;
	onDone: () => void;
}) {
	const [amount, setAmount] = useState("");
	const value = Number(amount);
	const valid = amount !== "" && Number.isFinite(value) && value > 0;

	const move = useGodAction(
		(body: { delta?: number; absolute?: number }) => adjustCash(userId, body),
		(result) =>
			`Balance is now ${formatINR(result.cash_balance)} (${formatSignedINR(result.change)})`,
		() => {
			setAmount("");
			onDone();
		},
	);

	return (
		<Block
			icon={Banknote}
			title="Cash"
			hint={`Holding ${formatINR(view.cash_balance)}, with ${formatINR(view.frozen_balance)} held against open orders and margin.`}
		>
			<div className="flex flex-col gap-2">
				<Label htmlFor="god-cash" className="sr-only">
					Amount in rupees
				</Label>
				<Input
					id="god-cash"
					inputMode="decimal"
					placeholder="Amount in rupees"
					className="font-mono tabular-nums"
					value={amount}
					onChange={(event) =>
						setAmount(event.target.value.replace(/[^\d.]/g, ""))
					}
				/>
				<div className="flex flex-wrap gap-2">
					<Button
						size="sm"
						disabled={!valid || move.isPending}
						onClick={() => move.mutate({ delta: value })}
					>
						{move.isPending && <Spinner data-icon="inline-start" />}
						Credit
					</Button>
					<Button
						size="sm"
						variant="outline"
						disabled={!valid || move.isPending}
						onClick={() => move.mutate({ delta: -value })}
					>
						Debit
					</Button>
					<Button
						size="sm"
						variant="outline"
						disabled={!valid || move.isPending}
						onClick={() => move.mutate({ absolute: value })}
					>
						Set balance
					</Button>
				</div>
				{/* Frozen cash belongs to open orders; releasing it here would leave
				    them unbacked, so it is only ever moved by cancelling them. */}
				<p className="text-xs text-muted-foreground">
					Frozen cash is not touched.
				</p>
			</div>
		</Block>
	);
}

function PositionControls({
	userId,
	userName,
	view,
	stocks,
	onDone,
}: {
	userId: string;
	userName: string;
	view: View;
	stocks: { id: number; symbol: string; name: string }[];
	onDone: () => void;
}) {
	const [stockId, setStockId] = useState("");
	const [quantity, setQuantity] = useState("");
	const [flattening, setFlattening] = useState(false);

	const qty = Number(quantity);
	const ready = stockId !== "" && Number.isInteger(qty) && qty > 0;
	// Sell only ever sells shares they own; a short is closed from its row.
	const held = view.positions.find((p) => p.stock_id === Number(stockId));
	const sharesOwned = held && held.volume > 0 ? held.volume : 0;
	const symbol = stocks.find((s) => s.id === Number(stockId))?.symbol;

	const buy = useGodAction(
		() =>
			openPosition(userId, {
				stock_id: Number(stockId),
				action: "buy",
				quantity: qty,
			}),
		() => `Bought ${formatQty(qty)} ${symbol ?? "shares"} for ${userName}`,
		() => {
			setQuantity("");
			onDone();
		},
	);
	const sell = useGodAction(
		() => closePosition(userId, Number(stockId), qty),
		() => `Sold ${formatQty(qty)} ${symbol ?? "shares"} for ${userName}`,
		() => {
			setQuantity("");
			onDone();
		},
	);
	const trading = buy.isPending || sell.isPending;
	const close = useGodAction(
		(stock: number) => closePosition(userId, stock),
		() => "Position closed",
		onDone,
	);
	const flatten = useGodAction(
		() => flattenUser(userId),
		(result) =>
			`Closed everything, realising ${formatSignedINR(result.realized_pnl)}`,
		() => {
			setFlattening(false);
			onDone();
		},
	);

	return (
		<Block
			icon={Layers}
			title="Positions"
			hint="Trades fill at the live price, just like a player's own market order."
		>
			{view.positions.length === 0 ? (
				<p className="text-xs text-muted-foreground">Holding nothing.</p>
			) : (
				<ul className="flex flex-col gap-1.5">
					{view.positions.map((position) => {
						const long = position.volume > 0;
						const quantityHeld = Math.abs(position.volume);
						const pnl = long
							? (Number(position.last_price ?? position.average_price) -
									position.average_price) *
								quantityHeld
							: (position.average_price -
									Number(position.last_price ?? position.average_price)) *
								quantityHeld;
						return (
							<li
								key={position.stock_id}
								className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5"
							>
								<span className="flex min-w-0 flex-col">
									<span className="flex items-center gap-1.5 text-sm font-medium">
										<span className="font-mono">{position.symbol}</span>
										<Badge
											variant="outline"
											className={cn(
												"text-[10px]",
												long ? "text-gain" : "text-loss",
											)}
										>
											{long ? "Long" : "Short"} {formatQty(quantityHeld)}
										</Badge>
									</span>
									<span className="font-mono text-xs text-muted-foreground tabular-nums">
										@ {formatINR(position.average_price)} ·{" "}
										<span className={trendText(pnl)}>
											{formatSignedINR(pnl)}
										</span>
									</span>
								</span>
								<Button
									size="xs"
									variant="outline"
									disabled={close.isPending}
									onClick={() => close.mutate(position.stock_id)}
								>
									Close
								</Button>
							</li>
						);
					})}
					<li>
						<Button
							size="sm"
							variant="destructive"
							className="w-full"
							onClick={() => setFlattening(true)}
						>
							<Layers data-icon="inline-start" />
							Close every position
						</Button>
					</li>
				</ul>
			)}

			<div className="flex flex-col gap-2 border-t pt-2.5">
				<Label className="text-xs text-muted-foreground">Buy or sell</Label>
				<Select value={stockId} onValueChange={setStockId}>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Pick a stock" />
					</SelectTrigger>
					<SelectContent>
						{stocks.map((stock) => (
							<SelectItem key={stock.id} value={String(stock.id)}>
								<span className="font-mono">{stock.symbol}</span> — {stock.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<div className="flex gap-2">
					<Input
						inputMode="numeric"
						placeholder="Shares"
						aria-label="Shares"
						className="flex-1 font-mono tabular-nums"
						value={quantity}
						onChange={(event) =>
							setQuantity(event.target.value.replace(/[^\d]/g, ""))
						}
					/>
					<Button
						variant="outline"
						className="text-gain"
						disabled={!ready || trading}
						onClick={() => buy.mutate(undefined)}
					>
						{buy.isPending ? (
							<Spinner data-icon="inline-start" />
						) : (
							<TrendingUp data-icon="inline-start" />
						)}
						Buy
					</Button>
					<Button
						variant="outline"
						className="text-loss"
						disabled={!ready || trading || qty > sharesOwned}
						onClick={() => sell.mutate(undefined)}
					>
						{sell.isPending ? (
							<Spinner data-icon="inline-start" />
						) : (
							<TrendingDown data-icon="inline-start" />
						)}
						Sell
					</Button>
				</div>
				{stockId !== "" && (
					<p className="text-xs text-muted-foreground">
						{sharesOwned > 0
							? `They own ${formatQty(sharesOwned)} ${symbol ?? ""}, so they can sell up to that.`
							: `They own no ${symbol ?? "shares"}, so there is nothing to sell.`}
					</p>
				)}
			</div>

			<ConfirmDangerous
				open={flattening}
				onOpenChange={setFlattening}
				title={`Close everything ${userName} holds?`}
				description="Their resting orders are cancelled first, then every position is closed at the live price. The realised profit or loss is booked to their account."
				confirmWord="CLOSE ALL"
				actionLabel="Close everything"
				pending={flatten.isPending}
				onConfirm={() => flatten.mutate(undefined)}
			/>
		</Block>
	);
}

function OrderControls({
	userId,
	userName,
	view,
	onDone,
}: {
	userId: string;
	userName: string;
	view: View;
	onDone: () => void;
}) {
	const [confirming, setConfirming] = useState(false);
	const cancel = useGodAction(
		() => cancelUserOrders(userId),
		(result) => `Cancelled ${result.cancelled} order(s)`,
		() => {
			setConfirming(false);
			onDone();
		},
	);

	return (
		<Block
			icon={ListX}
			title="Open orders"
			hint="Cancelling returns whatever each order was holding back."
		>
			{view.open_orders.length === 0 ? (
				<p className="text-xs text-muted-foreground">Nothing resting.</p>
			) : (
				<>
					<ul className="flex flex-col gap-1">
						{view.open_orders.map((order) => (
							<li
								key={order.id}
								className="flex items-center justify-between gap-2 text-xs"
							>
								<span className="font-mono">
									{order.symbol} {order.action ?? order.side}{" "}
									{formatQty(order.quantity - order.filled_quantity)}
								</span>
								<span className="font-mono text-muted-foreground tabular-nums">
									{order.limit_price === null
										? "market"
										: formatINR(order.limit_price)}
								</span>
							</li>
						))}
					</ul>
					<Button
						size="sm"
						variant="outline"
						onClick={() => setConfirming(true)}
					>
						<ListX data-icon="inline-start" />
						Cancel all {view.open_orders.length}
					</Button>
				</>
			)}

			<ConfirmDangerous
				open={confirming}
				onOpenChange={setConfirming}
				title={`Cancel ${userName}'s open orders?`}
				description="Every resting order is cancelled and whatever it reserved goes back to their cash."
				confirmWord="CANCEL"
				actionLabel="Cancel their orders"
				pending={cancel.isPending}
				onConfirm={() => cancel.mutate(undefined)}
			/>
		</Block>
	);
}

function ResetControl({
	userId,
	userName,
	onDone,
}: {
	userId: string;
	userName: string;
	onDone: () => void;
}) {
	const [confirming, setConfirming] = useState(false);
	const [wipeHistory, setWipeHistory] = useState(false);

	const reset = useGodAction(
		() => resetAccount(userId, wipeHistory),
		() => `${userName} is back to starting capital`,
		() => {
			setConfirming(false);
			setWipeHistory(false);
			onDone();
		},
	);

	return (
		<Block
			icon={RotateCcw}
			title="Reset the account"
			hint="Orders cancelled, positions closed, cash back to the starting capital."
		>
			<Button
				size="sm"
				variant="destructive"
				className="w-fit"
				onClick={() => setConfirming(true)}
			>
				<RotateCcw data-icon="inline-start" />
				Reset {userName}
			</Button>

			<ConfirmDangerous
				open={confirming}
				onOpenChange={setConfirming}
				title={`Reset ${userName}'s account?`}
				description="Their orders are cancelled and their positions closed at the live price, then their cash goes back to the starting capital. This cannot be undone."
				confirmWord="RESET"
				actionLabel="Reset the account"
				pending={reset.isPending}
				onConfirm={() => reset.mutate(undefined)}
			>
				<Label className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-xs font-normal">
					<Checkbox
						checked={wipeHistory}
						onCheckedChange={(checked) => setWipeHistory(checked === true)}
						className="mt-0.5"
					/>
					<span>
						Throw away their trade history too.
						<span className="block text-muted-foreground">
							Kept by default: it is the record of what they actually did, and
							deleting it makes the leaderboard disagree with the ledger.
						</span>
					</span>
				</Label>
			</ConfirmDangerous>
		</Block>
	);
}
