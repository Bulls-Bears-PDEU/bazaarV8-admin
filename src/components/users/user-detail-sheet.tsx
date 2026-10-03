import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Ban,
	Check,
	ImageOff,
	ShieldCheck,
	ShieldOff,
	UserRound,
	X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getUserDetail, updateUser, usersErrorMessage } from "#/api/users";
import { Stat } from "#/components/stat";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import { Skeleton } from "#/components/ui/skeleton";
import { Spinner } from "#/components/ui/spinner";
import { Switch } from "#/components/ui/switch";
import { GodModePanel } from "#/components/users/god-mode-panel";
import {
	USERS_KEY,
	type useUserActions,
} from "#/components/users/user-actions";
import { StatusBadges, UserAvatar } from "#/components/users/user-bits";
import {
	formatDateTime,
	formatINR,
	formatPct,
	formatQty,
	formatRelative,
	formatSignedINR,
	trendText,
} from "#/lib/format";
import { cn } from "#/lib/utils";
import type { UserDetail } from "#/types/users";

type Actions = ReturnType<typeof useUserActions>;

/**
 * Everything about one account: who they are, how they are doing, what they
 * hold and have traded, and the actions an organiser can take on them.
 */
export function UserDetailSheet({
	userId,
	onClose,
	actions,
	selfId,
}: {
	userId: string | null;
	onClose: () => void;
	actions: Actions;
	selfId: string | undefined;
}) {
	const detail = useQuery({
		queryKey: [...USERS_KEY, "detail", userId],
		queryFn: () => getUserDetail(userId as string),
		enabled: userId !== null,
	});

	return (
		<Sheet open={userId !== null} onOpenChange={(open) => !open && onClose()}>
			<SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
				{detail.isPending || !detail.data ? (
					<div className="flex flex-col gap-4 p-6">
						<SheetHeader className="sr-only">
							<SheetTitle>User details</SheetTitle>
							<SheetDescription>Loading</SheetDescription>
						</SheetHeader>
						{detail.isError ? (
							<p className="text-sm text-muted-foreground">
								Could not load this user. They may have been removed.
							</p>
						) : (
							<>
								<Skeleton className="h-16 w-full" />
								<Skeleton className="h-28 w-full" />
								<Skeleton className="h-48 w-full" />
							</>
						)}
					</div>
				) : (
					<DetailBody
						key={detail.data.user.id}
						detail={detail.data}
						actions={actions}
						isSelf={detail.data.user.id === selfId}
					/>
				)}
			</SheetContent>
		</Sheet>
	);
}

function DetailBody({
	detail,
	actions,
	isSelf,
}: {
	detail: UserDetail;
	actions: Actions;
	isSelf: boolean;
}) {
	const { user, money } = detail;
	const target = { ids: [user.id], label: user.name || user.email };

	return (
		<>
			<SheetHeader className="gap-4 border-b p-6">
				<div className="flex items-start gap-4 pr-8">
					<UserAvatar user={user} className="size-14 text-lg" />
					<div className="flex min-w-0 flex-col gap-1">
						<SheetTitle className="truncate text-xl">
							{user.name || "Unnamed"}
						</SheetTitle>
						<SheetDescription className="truncate">
							{user.email}
						</SheetDescription>
						<StatusBadges user={user} className="pt-1" />
					</div>
				</div>
				{!isSelf && (
					<div className="flex flex-wrap gap-2">
						{user.status === "pending" && (
							<>
								<Button
									size="sm"
									onClick={() => actions.run("approve", target)}
									disabled={actions.busy}
								>
									{actions.pendingFor("approve", user.id) ? (
										<Spinner data-icon="inline-start" />
									) : (
										<Check data-icon="inline-start" />
									)}
									Approve
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={() => actions.run("reject", target)}
									disabled={actions.busy}
								>
									<X data-icon="inline-start" />
									Reject
								</Button>
							</>
						)}
						{user.status === "banned" ? (
							<Button
								size="sm"
								variant="outline"
								onClick={() => actions.run("unban", target)}
								disabled={actions.busy}
							>
								{actions.pendingFor("unban", user.id) ? (
									<Spinner data-icon="inline-start" />
								) : (
									<ShieldCheck data-icon="inline-start" />
								)}
								Unban
							</Button>
						) : (
							<Button
								size="sm"
								variant="outline"
								onClick={() => actions.run("ban", target)}
								disabled={actions.busy}
							>
								<Ban data-icon="inline-start" />
								Ban
							</Button>
						)}
						{user.status !== "pending" &&
							(user.role === "admin" ? (
								<Button
									size="sm"
									variant="ghost"
									onClick={() => actions.run("make_player", target)}
									disabled={actions.busy}
								>
									<ShieldOff data-icon="inline-start" />
									Make player
								</Button>
							) : (
								<Button
									size="sm"
									variant="ghost"
									onClick={() => actions.run("make_admin", target)}
									disabled={actions.busy}
								>
									<ShieldCheck data-icon="inline-start" />
									Make organiser
								</Button>
							))}
					</div>
				)}
			</SheetHeader>

			<div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-6">
				{user.status === "banned" && (
					<div className="rounded-lg border border-loss/30 bg-loss-muted px-4 py-3 text-sm">
						<p className="font-medium text-loss">
							Banned{" "}
							{user.ban_expires
								? `until ${formatDateTime(user.ban_expires)}`
								: "until unbanned"}
						</p>
						<p className="text-muted-foreground">
							{user.ban_reason || "No reason given."}
						</p>
					</div>
				)}

				<Section title="Account">
					<dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
						<Fact label="Joined" value={formatDateTime(user.created_at)} />
						<Fact
							label="Profile"
							value={
								user.onboarded_at
									? `Set up ${formatRelative(user.onboarded_at)}`
									: user.status === "pending"
										? "After approval"
										: "Not set up yet"
							}
						/>
						<Fact
							label="Last seen"
							value={
								user.online
									? "Online now"
									: user.last_session_at
										? formatRelative(user.last_session_at)
										: "—"
							}
						/>
						<Fact
							label="Email"
							value={user.email_verified ? "Verified" : "Not verified"}
						/>
					</dl>
				</Section>

				{user.status !== "pending" && (
					<Section title="Performance">
						<div className="grid grid-cols-2 gap-4 rounded-xl border p-4 sm:grid-cols-3">
							<Stat label="Net worth" value={formatINR(money.net_worth)} />
							<Stat
								label="Since start"
								value={
									<span className={trendText(money.total_pnl)}>
										{formatSignedINR(money.total_pnl)}
									</span>
								}
								hint={formatPct(money.return_pct)}
							/>
							<Stat
								label="Rank"
								value={detail.rank ? `#${detail.rank.rank}` : "—"}
								hint={
									detail.rank
										? `of ${detail.rank.total_players}`
										: user.role === "admin"
											? "Organisers are not ranked"
											: user.hidden_from_leaderboard
												? "Hidden from the leaderboard"
												: undefined
								}
							/>
							<Stat label="Cash" value={formatINR(money.cash_balance)} />
							<Stat
								label="Held back"
								value={formatINR(money.frozen_balance)}
								hint="Orders, margin, IPOs"
							/>
							<Stat
								label="Open P&L"
								value={
									<span className={trendText(money.unrealized_pnl)}>
										{formatSignedINR(money.unrealized_pnl)}
									</span>
								}
							/>
						</div>
					</Section>
				)}

				{user.status !== "pending" && (
					<Section title={`Positions (${detail.positions.length})`}>
						{detail.positions.length === 0 ? (
							<Empty>No open positions.</Empty>
						) : (
							<ul className="divide-y rounded-lg border text-sm">
								{detail.positions.map((position) => (
									<li
										key={position.stock_id}
										className="flex items-center gap-3 px-3 py-2"
									>
										<span className="w-24 font-mono font-medium">
											{position.symbol}
										</span>
										<Badge variant="outline" className="capitalize">
											{position.side}
										</Badge>
										<span className="flex-1 font-mono text-xs text-muted-foreground tabular-nums">
											{formatQty(position.quantity)} @{" "}
											{formatINR(position.average_price)}
										</span>
										<span
											className={cn(
												"font-mono text-xs tabular-nums",
												trendText(position.unrealized_pnl),
											)}
										>
											{formatSignedINR(position.unrealized_pnl)}
										</span>
									</li>
								))}
							</ul>
						)}
					</Section>
				)}

				{user.status !== "pending" && (
					<Section title={`Recent orders (${detail.order_count})`}>
						{detail.recent_orders.length === 0 ? (
							<Empty>No orders yet.</Empty>
						) : (
							<ul className="divide-y rounded-lg border text-sm">
								{detail.recent_orders.map((order) => (
									<li
										key={order.id}
										className="flex items-center gap-3 px-3 py-2"
									>
										<span className="w-20 shrink-0 text-xs text-muted-foreground">
											{formatRelative(order.created_at)}
										</span>
										<span className="w-12 shrink-0 capitalize">
											{order.action ?? order.side}
										</span>
										<span className="w-24 shrink-0 font-mono font-medium">
											{order.symbol}
										</span>
										<span className="flex-1 font-mono text-xs text-muted-foreground tabular-nums">
											{formatQty(order.quantity)}
											{order.average_fill_price
												? ` @ ${formatINR(order.average_fill_price)}`
												: ""}
										</span>
										<Badge
											variant="outline"
											className="capitalize"
											title={order.reject_reason ?? undefined}
										>
											{order.status}
										</Badge>
									</li>
								))}
							</ul>
						)}
					</Section>
				)}

				<EditSection detail={detail} />

				{/* Only an approved player has an account worth acting on: a pending
				    or removed one has no cash, positions or orders yet. */}
				{user.status !== "pending" && (
					<Section title="God mode">
						<GodModePanel userId={user.id} userName={user.name} />
					</Section>
				)}
			</div>
		</>
	);
}

function EditSection({ detail }: { detail: UserDetail }) {
	const queryClient = useQueryClient();
	const { user, money } = detail;
	const [name, setName] = useState(user.name);
	const [cash, setCash] = useState(String(money.cash_balance));

	const save = useMutation({
		mutationFn: (data: Parameters<typeof updateUser>[1]) =>
			updateUser(user.id, data),
		onSuccess: (updated, data) => {
			queryClient.setQueryData([...USERS_KEY, "detail", user.id], updated);
			queryClient.invalidateQueries({ queryKey: USERS_KEY });
			toast.success(
				data.remove_avatar
					? "Photo removed."
					: data.cash_balance !== undefined
						? "Cash updated."
						: data.hidden_from_leaderboard !== undefined
							? data.hidden_from_leaderboard
								? "Hidden from the leaderboard."
								: "Shown on the leaderboard."
							: "Name updated.",
			);
		},
		onError: (error) =>
			toast.error(usersErrorMessage(error, "Could not save that.")),
	});

	const cleanName = name.replace(/\s+/g, " ").trim();
	const cashValue = Number(cash);
	const cashValid =
		cash.trim() !== "" && Number.isFinite(cashValue) && cashValue >= 0;

	return (
		<Section title="Edit">
			<div className="flex flex-col gap-5 rounded-xl border p-4">
				<form
					className="flex flex-col gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						if (cleanName.length >= 2 && cleanName !== user.name)
							save.mutate({ name: cleanName });
					}}
				>
					<Label htmlFor="edit-name">Display name</Label>
					<div className="flex gap-2">
						<div className="relative flex-1">
							<UserRound className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="edit-name"
								className="pl-8"
								value={name}
								maxLength={70}
								onChange={(event) => setName(event.target.value)}
							/>
						</div>
						<Button
							type="submit"
							variant="secondary"
							disabled={
								save.isPending ||
								cleanName.length < 2 ||
								cleanName === user.name
							}
						>
							Save
						</Button>
					</div>
				</form>

				<form
					className="flex flex-col gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						if (cashValid && cashValue !== money.cash_balance)
							save.mutate({ cash_balance: cashValue });
					}}
				>
					<Label htmlFor="edit-cash">Cash balance (₹)</Label>
					<div className="flex gap-2">
						<Input
							id="edit-cash"
							className="flex-1 font-mono tabular-nums"
							inputMode="decimal"
							value={cash}
							onChange={(event) => setCash(event.target.value)}
							aria-describedby="edit-cash-hint"
						/>
						<Button
							type="submit"
							variant="secondary"
							disabled={
								save.isPending || !cashValid || cashValue === money.cash_balance
							}
						>
							Set cash
						</Button>
					</div>
					<p id="edit-cash-hint" className="text-xs text-muted-foreground">
						Replaces free cash only; money held back for orders and margin is
						untouched.
					</p>
				</form>

				{user.role === "user" && (
					<div className="flex items-start justify-between gap-3">
						<div className="flex flex-col gap-1">
							<Label htmlFor="edit-hidden">Hide from leaderboard</Label>
							<p
								id="edit-hidden-hint"
								className="text-xs text-muted-foreground"
							>
								For test or house accounts. They keep trading as normal but
								are not ranked, and other players move up a place.
							</p>
						</div>
						<Switch
							id="edit-hidden"
							checked={user.hidden_from_leaderboard}
							onCheckedChange={(checked) =>
								save.mutate({ hidden_from_leaderboard: checked })
							}
							disabled={save.isPending}
							aria-describedby="edit-hidden-hint"
						/>
					</div>
				)}

				{user.image && (
					<div className="flex items-center justify-between gap-3">
						<span className="text-sm text-muted-foreground">
							Remove a photo that breaks the rules.
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => save.mutate({ remove_avatar: true })}
							disabled={save.isPending}
						>
							<ImageOff data-icon="inline-start" />
							Remove photo
						</Button>
					</div>
				)}
				{save.isPending && (
					<p className="flex items-center gap-2 text-xs text-muted-foreground">
						<Spinner /> Saving…
					</p>
				)}
			</div>
		</Section>
	);
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3">
			<h3 className="text-sm font-semibold tracking-tight">{title}</h3>
			{children}
		</section>
	);
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-0.5">
			<dt className="text-xs text-muted-foreground">{label}</dt>
			<dd>{value}</dd>
		</div>
	);
}

function Empty({ children }: { children: React.ReactNode }) {
	return (
		<p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
			{children}
		</p>
	);
}
