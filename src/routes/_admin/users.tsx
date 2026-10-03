import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	ArrowDownWideNarrow,
	ArrowUpNarrowWide,
	Ban,
	Check,
	ChevronLeft,
	ChevronRight,
	MoreHorizontal,
	PanelRightOpen,
	Search,
	ShieldCheck,
	ShieldOff,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getUserStats, listUsers } from "#/api/users";
import { PageHeader } from "#/components/page-header";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import { Spinner } from "#/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { type Target, USERS_KEY, useUserActions } from "#/components/users/user-actions";
import { UserDetailSheet } from "#/components/users/user-detail-sheet";
import { StatusBadges, UserAvatar } from "#/components/users/user-bits";
import useSocket from "#/hooks/use-socket";
import { authClient } from "#/lib/auth-client";
import { formatDateTime, formatINR, formatRelative, formatSignedINR, plural, trendText } from "#/lib/format";
import { cn } from "#/lib/utils";
import {
	type AdminUser,
	type BulkAction,
	PAGE_SIZES,
	type RoleFilter,
	type SortDirection,
	type StatusFilter,
	type UserSort,
} from "#/types/users";

type UsersSearch = {
	q?: string;
	status?: StatusFilter;
	role?: RoleFilter;
	sort?: UserSort;
	dir?: SortDirection;
	page?: number;
	size?: number;
	user?: string;
};

const STATUSES: StatusFilter[] = ["all", "pending", "active", "online", "banned"];
const ROLES: RoleFilter[] = ["all", "user", "admin", "pending"];
const SORTS: UserSort[] = ["joined", "name", "net_worth", "cash"];

const oneOf = <T extends string>(value: unknown, allowed: readonly T[]) =>
	typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

export const Route = createFileRoute("/_admin/users")({
	// Filters live in the URL, so a view can be shared, bookmarked or gone back to.
	validateSearch: (search: Record<string, unknown>): UsersSearch => {
		const page = Number(search.page);
		const size = Number(search.size);
		return {
			q: typeof search.q === "string" && search.q ? search.q : undefined,
			status: oneOf(search.status, STATUSES),
			role: oneOf(search.role, ROLES),
			sort: oneOf(search.sort, SORTS),
			dir: oneOf(search.dir, ["asc", "desc"] as const),
			page: Number.isInteger(page) && page > 1 ? page : undefined,
			size: (PAGE_SIZES as readonly number[]).includes(size) ? size : undefined,
			user: typeof search.user === "string" && search.user ? search.user : undefined,
		};
	},
	component: UsersPage,
});

const SORT_LABELS: Record<UserSort, string> = {
	joined: "Joined",
	name: "Name",
	net_worth: "Net worth",
	cash: "Cash",
};

const ROLE_LABELS: Record<RoleFilter, string> = {
	all: "All roles",
	user: "Players",
	admin: "Organisers",
	pending: "Not approved",
};

function UsersPage() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const queryClient = useQueryClient();
	const socket = useSocket();
	const selfId = authClient.useSession().data?.user.id;

	const status = search.status ?? "all";
	const role = search.role ?? "all";
	const sort = search.sort ?? "joined";
	const direction = search.dir ?? (sort === "name" ? "asc" : "desc");
	const page = search.page ?? 1;
	const pageSize = search.size ?? 25;

	const setSearch = (patch: Partial<UsersSearch>, { resetPage = true } = {}) =>
		navigate({
			search: (prev) => ({ ...prev, ...(resetPage ? { page: undefined } : {}), ...patch }),
			replace: true,
		});

	// Typing updates the box at once and the query a moment later.
	const [text, setText] = useState(search.q ?? "");
	const searchRef = useRef<HTMLInputElement>(null);
	useEffect(() => {
		const handle = setTimeout(() => {
			if ((search.q ?? "") !== text.trim()) setSearch({ q: text.trim() || undefined });
		}, 250);
		return () => clearTimeout(handle);
	});

	const query = { search: search.q, status, role, sort, direction, page, page_size: pageSize };
	const list = useQuery({
		queryKey: [...USERS_KEY, "list", query],
		queryFn: () => listUsers(query),
		placeholderData: keepPreviousData,
	});
	const stats = useQuery({ queryKey: [...USERS_KEY, "stats"], queryFn: getUserStats, refetchInterval: 30_000 });

	// New sign-ups, approvals elsewhere and profile changes arrive live.
	useEffect(() => {
		if (!socket) return;
		const refresh = () => queryClient.invalidateQueries({ queryKey: USERS_KEY });
		socket.on("usersChanged", refresh);
		return () => {
			socket.off("usersChanged", refresh);
		};
	}, [socket, queryClient]);

	const users = list.data?.users ?? [];
	const total = list.data?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / pageSize));

	const [selected, setSelected] = useState<Set<string>>(new Set());
	// Selection is per view; changing the filters starts over.
	const viewKey = JSON.stringify([search.q, status, role, sort, direction, page, pageSize]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset when the view changes
	useEffect(() => setSelected(new Set()), [viewKey]);

	const actions = useUserActions({
		onDone: (action, ids) => {
			setSelected((prev) => {
				const next = new Set(prev);
				for (const id of ids) next.delete(id);
				return next;
			});
			if (action === "reject" && search.user && ids.includes(search.user)) setSearch({ user: undefined }, { resetPage: false });
		},
	});

	const selectedUsers = users.filter((user) => selected.has(user.id));
	const allOnPage = users.length > 0 && users.every((user) => selected.has(user.id));
	const someOnPage = users.some((user) => selected.has(user.id));
	const targetFor = (list: AdminUser[]): Target => ({
		ids: list.map((user) => user.id),
		label: list.length === 1 ? list[0].name || list[0].email : plural(list.length, "user"),
	});

	const hasFilters = Boolean(search.q) || status !== "all" || role !== "all";

	return (
		<div className="flex flex-col gap-5">
			<PageHeader title="Users" description="Approve new players, find anyone and step in when you need to." />

			<StatCards
				stats={stats.data}
				status={status}
				onSelect={(next) => setSearch({ status: next === status || next === "all" ? undefined : next })}
			/>

			<div className="flex flex-wrap items-center gap-2">
				<div className="relative min-w-0 flex-1 basis-64">
					<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						ref={searchRef}
						type="search"
						data-slash-search
						value={text}
						onChange={(event) => setText(event.target.value)}
						placeholder="Search by name or email"
						aria-label="Search users by name or email"
						className="pr-16 pl-9 [&::-webkit-search-cancel-button]:hidden"
					/>
					{text ? (
						<button
							type="button"
							onClick={() => {
								setText("");
								setSearch({ q: undefined });
								searchRef.current?.focus();
							}}
							aria-label="Clear search"
							className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
						>
							<X className="size-3.5" />
						</button>
					) : (
						<kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
							/
						</kbd>
					)}
				</div>

				<Select value={role} onValueChange={(value) => setSearch({ role: value === "all" ? undefined : (value as RoleFilter) })}>
					<SelectTrigger className="w-40" aria-label="Filter by role">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{ROLES.map((option) => (
							<SelectItem key={option} value={option}>
								{ROLE_LABELS[option]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<div className="flex items-center">
					<Select value={sort} onValueChange={(value) => setSearch({ sort: value as UserSort, dir: undefined })}>
						<SelectTrigger className="w-40 rounded-r-none" aria-label="Sort by">
							<span className="text-muted-foreground">Sort:</span>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{SORTS.map((option) => (
								<SelectItem key={option} value={option}>
									{SORT_LABELS[option]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						variant="outline"
						size="icon"
						className="rounded-l-none border-l-0"
						onClick={() => setSearch({ dir: direction === "asc" ? "desc" : "asc" })}
						aria-label={direction === "asc" ? "Sorted ascending; sort descending" : "Sorted descending; sort ascending"}
					>
						{direction === "asc" ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
					</Button>
				</div>
			</div>

			{selected.size > 0 && (
				<BulkBar
					users={selectedUsers}
					busy={actions.busy}
					onAction={(action, list) => actions.run(action, targetFor(list))}
					onClear={() => setSelected(new Set())}
				/>
			)}

			<div className="overflow-hidden rounded-xl border">
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead className="w-10 pl-4">
									<Checkbox
										checked={allOnPage ? true : someOnPage ? "indeterminate" : false}
										onCheckedChange={(checked) =>
											setSelected((prev) => {
												const next = new Set(prev);
												for (const user of users) {
													if (checked) next.add(user.id);
													else next.delete(user.id);
												}
												return next;
											})
										}
										aria-label="Select every user on this page"
										disabled={users.length === 0}
									/>
								</TableHead>
								<TableHead className="h-10 text-xs">User</TableHead>
								<TableHead className="h-10 text-xs">Status</TableHead>
								<TableHead className="h-10 text-right text-xs">Net worth</TableHead>
								<TableHead className="h-10 text-right text-xs">Cash</TableHead>
								<TableHead className="h-10 text-xs">Joined</TableHead>
								<TableHead className="h-10 w-px pr-4" />
							</TableRow>
						</TableHeader>
						<TableBody className={cn(list.isFetching && list.isPlaceholderData && "opacity-60 transition-opacity")}>
							{list.isPending &&
								Array.from({ length: 6 }, (_, index) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows
									<TableRow key={index}>
										<TableCell colSpan={7} className="px-4 py-3">
											<Skeleton className="h-9 w-full" />
										</TableCell>
									</TableRow>
								))}
							{list.isError && (
								<TableRow>
									<TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
										Could not load users.{" "}
										<Button variant="link" className="px-1" onClick={() => list.refetch()}>
											Try again
										</Button>
									</TableCell>
								</TableRow>
							)}
							{list.isSuccess && users.length === 0 && (
								<TableRow className="hover:bg-transparent">
									<TableCell colSpan={7} className="h-40 text-center">
										<p className="font-medium">{search.q ? `No users match “${search.q}”` : "No users here"}</p>
										{hasFilters && (
											<Button
												variant="link"
												onClick={() => {
													setText("");
													setSearch({ q: undefined, status: undefined, role: undefined });
												}}
											>
												Clear search and filters
											</Button>
										)}
									</TableCell>
								</TableRow>
							)}
							{users.map((user) => (
								<UserRow
									key={user.id}
									user={user}
									isSelf={user.id === selfId}
									selected={selected.has(user.id)}
									onSelect={(checked) =>
										setSelected((prev) => {
											const next = new Set(prev);
											if (checked) next.add(user.id);
											else next.delete(user.id);
											return next;
										})
									}
									onOpen={() => setSearch({ user: user.id }, { resetPage: false })}
									onAction={(action) => actions.run(action, targetFor([user]))}
									approving={actions.pendingFor("approve", user.id)}
									busy={actions.busy}
								/>
							))}
						</TableBody>
					</Table>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5 text-sm">
					<span className="text-muted-foreground" aria-live="polite">
						{total === 0
							? "0 users"
							: `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
						{list.isFetching && !list.isPending && <Spinner className="ml-2 inline size-3.5" />}
					</span>
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground">Rows</span>
						<Select value={String(pageSize)} onValueChange={(value) => setSearch({ size: Number(value) === 25 ? undefined : Number(value) })}>
							<SelectTrigger size="sm" className="w-18" aria-label="Rows per page">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PAGE_SIZES.map((size) => (
									<SelectItem key={size} value={String(size)}>
										{size}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<span className="px-2 text-muted-foreground tabular-nums">
							Page {Math.min(page, pageCount)} of {pageCount}
						</span>
						<Button
							variant="outline"
							size="icon-sm"
							onClick={() => setSearch({ page: page - 1 > 1 ? page - 1 : undefined }, { resetPage: false })}
							disabled={page <= 1}
							aria-label="Previous page"
						>
							<ChevronLeft />
						</Button>
						<Button
							variant="outline"
							size="icon-sm"
							onClick={() => setSearch({ page: page + 1 }, { resetPage: false })}
							disabled={page >= pageCount}
							aria-label="Next page"
						>
							<ChevronRight />
						</Button>
					</div>
				</div>
			</div>

			<UserDetailSheet
				userId={search.user ?? null}
				onClose={() => setSearch({ user: undefined }, { resetPage: false })}
				actions={actions}
				selfId={selfId}
			/>
			{actions.dialogs}
		</div>
	);
}

function StatCards({
	stats,
	status,
	onSelect,
}: {
	stats: Awaited<ReturnType<typeof getUserStats>> | undefined;
	status: StatusFilter;
	onSelect: (status: StatusFilter) => void;
}) {
	const cards: { value: StatusFilter; label: string; count: number | undefined; hint?: string; tone?: string }[] = [
		{ value: "all", label: "All users", count: stats?.total, hint: stats ? `${stats.admins} organisers` : undefined },
		{
			value: "pending",
			label: "Waiting for approval",
			count: stats?.pending,
			tone: stats?.pending ? "text-amber-700 dark:text-amber-400" : undefined,
		},
		{
			value: "active",
			label: "Active",
			count: stats?.active,
			hint: stats?.not_onboarded ? `${stats.not_onboarded} not set up yet` : undefined,
		},
		{ value: "online", label: "Online now", count: stats?.online },
		{ value: "banned", label: "Banned", count: stats?.banned },
	];

	return (
		<fieldset className="m-0 grid min-w-0 grid-cols-2 gap-2 border-0 p-0 sm:grid-cols-3 lg:grid-cols-5">
			<legend className="sr-only">Filter by status</legend>
			{cards.map((card) => {
				const active = status === card.value;
				return (
					<button
						key={card.value}
						type="button"
						aria-pressed={active}
						onClick={() => onSelect(card.value)}
						className={cn(
							"flex flex-col gap-1 rounded-xl border bg-card px-4 py-3 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50",
							active && "border-foreground/40 bg-muted/60 ring-1 ring-foreground/20",
						)}
					>
						<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
							{card.value === "online" && <span className="size-1.5 rounded-full bg-gain" aria-hidden="true" />}
							{card.label}
						</span>
						<span className={cn("font-mono text-2xl leading-tight font-medium tabular-nums", card.tone)}>
							{card.count ?? <Skeleton className="h-7 w-10" />}
						</span>
						<span className="min-h-4 truncate text-xs text-muted-foreground">{card.hint}</span>
					</button>
				);
			})}
		</fieldset>
	);
}

function UserRow({
	user,
	isSelf,
	selected,
	onSelect,
	onOpen,
	onAction,
	approving,
	busy,
}: {
	user: AdminUser;
	isSelf: boolean;
	selected: boolean;
	onSelect: (checked: boolean) => void;
	onOpen: () => void;
	onAction: (action: BulkAction) => void;
	approving: boolean;
	busy: boolean;
}) {
	return (
		<TableRow data-state={selected ? "selected" : undefined} className="group cursor-pointer" onClick={onOpen}>
			<TableCell className="pl-4" onClick={(event) => event.stopPropagation()}>
				<Checkbox
					checked={selected}
					onCheckedChange={(checked) => onSelect(checked === true)}
					aria-label={`Select ${user.name || user.email}`}
				/>
			</TableCell>
			<TableCell className="py-2.5">
				<div className="flex min-w-0 items-center gap-3">
					<UserAvatar user={user} />
					<div className="flex min-w-0 flex-col">
						{/* The name is the row's real link, for keyboard and screen reader users. */}
						<button
							type="button"
							onClick={(event) => {
								event.stopPropagation();
								onOpen();
							}}
							className="truncate text-left font-medium outline-none hover:underline focus-visible:underline"
						>
							{user.name || "Unnamed"}
							{isSelf && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
						</button>
						<span className="truncate text-xs text-muted-foreground">{user.email}</span>
					</div>
				</div>
			</TableCell>
			<TableCell>
				<StatusBadges user={user} />
			</TableCell>
			<TableCell className="text-right whitespace-nowrap">
				{user.status === "pending" ? (
					<span className="text-muted-foreground">—</span>
				) : (
					<div className="flex flex-col items-end">
						<span className="font-mono tabular-nums">{formatINR(user.net_worth)}</span>
						<span className={cn("font-mono text-xs tabular-nums", trendText(user.pnl))}>{formatSignedINR(user.pnl)}</span>
					</div>
				)}
			</TableCell>
			<TableCell className="text-right font-mono whitespace-nowrap tabular-nums">{formatINR(user.cash_balance)}</TableCell>
			<TableCell className="whitespace-nowrap text-muted-foreground" title={formatDateTime(user.created_at)}>
				{formatRelative(user.created_at)}
			</TableCell>
			<TableCell className="pr-4" onClick={(event) => event.stopPropagation()}>
				<div className="flex items-center justify-end gap-1">
					{user.status === "pending" && (
						<Button size="sm" onClick={() => onAction("approve")} disabled={busy}>
							{approving ? <Spinner data-icon="inline-start" /> : <Check data-icon="inline-start" />}
							Approve
						</Button>
					)}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon-sm" aria-label={`More actions for ${user.name || user.email}`}>
								<MoreHorizontal />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							<DropdownMenuItem onSelect={onOpen}>
								<PanelRightOpen />
								View details
							</DropdownMenuItem>
							{!isSelf && (
								<>
									<DropdownMenuSeparator />
									{user.status === "pending" && (
										<DropdownMenuItem variant="destructive" onSelect={() => onAction("reject")}>
											<X />
											Reject
										</DropdownMenuItem>
									)}
									{user.status !== "pending" &&
										(user.role === "admin" ? (
											<DropdownMenuItem onSelect={() => onAction("make_player")}>
												<ShieldOff />
												Make player
											</DropdownMenuItem>
										) : (
											<DropdownMenuItem onSelect={() => onAction("make_admin")}>
												<ShieldCheck />
												Make organiser
											</DropdownMenuItem>
										))}
									{user.status === "banned" ? (
										<DropdownMenuItem onSelect={() => onAction("unban")}>
											<ShieldCheck />
											Unban
										</DropdownMenuItem>
									) : (
										<DropdownMenuItem variant="destructive" onSelect={() => onAction("ban")}>
											<Ban />
											Ban
										</DropdownMenuItem>
									)}
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</TableCell>
		</TableRow>
	);
}

/** Actions for every selected user, offered only where they make sense. */
function BulkBar({
	users,
	busy,
	onAction,
	onClear,
}: {
	users: AdminUser[];
	busy: boolean;
	onAction: (action: BulkAction, users: AdminUser[]) => void;
	onClear: () => void;
}) {
	const pending = users.filter((user) => user.status === "pending");
	const banned = users.filter((user) => user.status === "banned");
	const bannable = users.filter((user) => user.status !== "banned");

	return (
		<section
			aria-label="Bulk actions"
			className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border bg-background/95 px-3 py-2 shadow-sm backdrop-blur"
		>
			<span className="px-1 text-sm font-medium">{plural(users.length, "user")} selected</span>
			<span className="h-5 w-px bg-border" aria-hidden="true" />
			{pending.length > 0 && (
				<>
					<Button size="sm" onClick={() => onAction("approve", pending)} disabled={busy}>
						<Check data-icon="inline-start" />
						Approve {pending.length}
					</Button>
					<Button size="sm" variant="outline" onClick={() => onAction("reject", pending)} disabled={busy}>
						<X data-icon="inline-start" />
						Reject {pending.length}
					</Button>
				</>
			)}
			{bannable.length > 0 && (
				<Button size="sm" variant="outline" onClick={() => onAction("ban", bannable)} disabled={busy}>
					<Ban data-icon="inline-start" />
					Ban {bannable.length}
				</Button>
			)}
			{banned.length > 0 && (
				<Button size="sm" variant="outline" onClick={() => onAction("unban", banned)} disabled={busy}>
					<ShieldCheck data-icon="inline-start" />
					Unban {banned.length}
				</Button>
			)}
			<Button size="sm" variant="ghost" className="ml-auto" onClick={onClear}>
				Clear selection
			</Button>
		</section>
	);
}
