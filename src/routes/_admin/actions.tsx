import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { useEffect, useState } from "react";
import { listAdminActions } from "#/api/god-mode";
import { PageHeader } from "#/components/page-header";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import useSocket from "#/hooks/use-socket";
import { formatDateTime, formatRelative } from "#/lib/format";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_admin/actions")({
	component: RouteComponent,
});

const ACTIONS_KEY = ["admin-actions"] as const;

/** Actions that move money or destroy something get a louder badge. */
const HEAVY = new Set([
	"account_reset",
	"flattened",
	"cash_adjusted",
	"orders_cancelled_all",
	"reject",
]);

const LABEL: Record<string, string> = {
	cash_adjusted: "Cash",
	orders_cancelled: "Orders cancelled",
	orders_cancelled_all: "All orders cancelled",
	position_opened: "Position opened",
	position_closed: "Position closed",
	flattened: "Flattened",
	account_reset: "Account reset",
	user_edited: "Account edited",
	approve: "Approved",
	reject: "Removed",
	ban: "Banned",
	unban: "Unbanned",
	make_admin: "Made admin",
	make_player: "Made player",
};

/**
 * Everything organisers have done to player accounts, newest first. The trail
 * is written by the backend on the way out of each action, so it records what
 * actually happened rather than what the panel meant to do.
 */
function RouteComponent() {
	const queryClient = useQueryClient();
	const socket = useSocket();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);

	const log = useQuery({
		queryKey: [...ACTIONS_KEY, page],
		queryFn: () => listAdminActions({ page, page_size: 50 }),
	});

	// Another organiser acting in their own tab shows up here without a refresh.
	useEffect(() => {
		if (!socket) return;
		const refresh = () =>
			queryClient.invalidateQueries({ queryKey: ACTIONS_KEY });
		socket.on("adminActionLogged", refresh);
		return () => {
			socket.off("adminActionLogged", refresh);
		};
	}, [socket, queryClient]);

	const term = search.trim().toLowerCase();
	const rows = (log.data?.actions ?? []).filter((row) =>
		term === ""
			? true
			: [
					row.admin_name,
					row.target_user_name ?? "",
					row.summary,
					LABEL[row.action] ?? row.action,
				]
					.join(" ")
					.toLowerCase()
					.includes(term),
	);
	const pages = Math.max(
		1,
		Math.ceil((log.data?.total ?? 0) / (log.data?.page_size ?? 50)),
	);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Action log"
				description="Every change an organiser has made to a player's account, and who made it."
			/>

			<Input
				placeholder="Filter by organiser, player or what happened"
				value={search}
				onChange={(event) => setSearch(event.target.value)}
				className="max-w-sm"
			/>

			{log.isPending ? (
				<div className="flex flex-col gap-2">
					{[0, 1, 2, 3, 4].map((row) => (
						<Skeleton key={row} className="h-14 w-full" />
					))}
				</div>
			) : rows.length === 0 ? (
				<p className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
					<ScrollText className="size-5" />
					{term
						? "Nothing matches that."
						: "Nothing has been done to a player's account yet."}
				</p>
			) : (
				<ul className="divide-y rounded-xl border">
					{rows.map((row) => (
						<li
							key={row.id}
							className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm"
						>
							<Badge
								variant="outline"
								className={cn("shrink-0", HEAVY.has(row.action) && "text-loss")}
							>
								{LABEL[row.action] ?? row.action}
							</Badge>
							<span className="min-w-0 flex-1">
								<span className="font-medium">{row.admin_name}</span>
								{row.target_user_name && (
									<>
										{" → "}
										<span className="font-medium">{row.target_user_name}</span>
									</>
								)}
								<span className="block text-xs text-muted-foreground">
									{row.summary}
								</span>
							</span>
							<time
								dateTime={row.created_at}
								title={formatDateTime(row.created_at)}
								className="shrink-0 text-xs text-muted-foreground"
							>
								{formatRelative(row.created_at)}
							</time>
						</li>
					))}
				</ul>
			)}

			{pages > 1 && (
				<div className="flex items-center justify-between gap-3 text-sm">
					<Button
						variant="outline"
						size="sm"
						disabled={page <= 1}
						onClick={() => setPage((p) => p - 1)}
					>
						Previous
					</Button>
					<span className="text-muted-foreground">
						Page {page} of {pages}
					</span>
					<Button
						variant="outline"
						size="sm"
						disabled={page >= pages}
						onClick={() => setPage((p) => p + 1)}
					>
						Next
					</Button>
				</div>
			)}
		</div>
	);
}
