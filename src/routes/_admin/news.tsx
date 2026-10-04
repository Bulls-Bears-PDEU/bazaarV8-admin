import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Eye, EyeOff, MoreHorizontal, PencilLine, Plus, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { addNews, deleteNews, getAllNews, newsErrorMessage, setNewsReleased, updateNews } from "#/api/news";
import { NewsEditor } from "#/components/news-editor";
import { PageHeader } from "#/components/page-header";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Loading } from "#/components/ui/loading";
import { Spinner } from "#/components/ui/spinner";
import useSocket from "#/hooks/use-socket";
import { formatCountdown, formatDateTime, formatDuration } from "#/lib/format";
import { cn } from "#/lib/utils";
import type { News, NewsPayload } from "#/types/news";

export const Route = createFileRoute("/_admin/news")({
	component: RouteComponent,
});

const NEWS_KEY = ["admin-news"];
const MAX_CHIPS = 4;

type Status = "live" | "scheduled" | "hidden";
type Filter = "all" | Status;

// What an empty list means, filter by filter.
const EMPTY: Record<Filter, string> = {
	all: "No stories yet.",
	live: "No story is on the players' feed right now.",
	scheduled: "Nothing is scheduled to go out.",
	hidden: "No story has been taken down.",
};

/**
 * The status counts, which double as the list's filter: one row instead of
 * a summary plus a separate filter strip repeating the same numbers.
 */
function FilterCards({
	cards,
	filter,
	onSelect,
}: {
	cards: { value: Filter; label: string; count: number; hint: string; dot?: boolean }[];
	filter: Filter;
	onSelect: (filter: Filter) => void;
}) {
	return (
		<fieldset className="m-0 grid min-w-0 grid-cols-2 gap-2 border-0 p-0 lg:grid-cols-4">
			<legend className="sr-only">Show stories</legend>
			{cards.map((card) => {
				const active = filter === card.value;
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
							{card.dot && card.count > 0 && (
								<span className="size-1.5 rounded-full bg-gain" aria-hidden="true" />
							)}
							{card.label}
						</span>
						<span className="font-mono text-2xl leading-tight font-medium tabular-nums">{card.count}</span>
						<span className="min-h-4 text-xs text-pretty text-muted-foreground">{card.hint}</span>
					</button>
				);
			})}
		</fieldset>
	);
}

const statusOf = (news: News): Status =>
	news.isReleased ? "live" : news.first_released_at ? "hidden" : "scheduled";

/** Re-renders every `ms` so countdowns stay current. */
const useNow = (ms: number) => {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), ms);
		return () => clearInterval(timer);
	}, [ms]);
	return now;
};

function RouteComponent() {
	const queryClient = useQueryClient();
	const socket = useSocket();
	const now = useNow(1000);
	const [editor, setEditor] = useState<{ open: boolean; news: News | null }>({ open: false, news: null });
	const [confirmDelete, setConfirmDelete] = useState<News | null>(null);
	const [filter, setFilter] = useState<Filter>("all");

	const newsQuery = useQuery({ queryKey: NEWS_KEY, queryFn: getAllNews });

	// Scheduled stories go out on the server's clock, and other admins edit too.
	useEffect(() => {
		if (!socket) return;
		const refresh = () => queryClient.invalidateQueries({ queryKey: NEWS_KEY });
		socket.on("newsChanged", refresh);
		return () => {
			socket.off("newsChanged", refresh);
		};
	}, [socket, queryClient]);

	const refresh = () => queryClient.invalidateQueries({ queryKey: NEWS_KEY });

	const saveMutation = useMutation({
		mutationFn: ({ id, payload }: { id: number | null; payload: NewsPayload }) =>
			id === null ? addNews(payload) : updateNews(id, payload),
		onSuccess: async (saved, { id }) => {
			// A time already past releases the story on save, as "now" does.
			const justReleased = saved.first_released_at !== null && !editor.news?.first_released_at;
			toast.success(
				justReleased
					? "Story released. Its impact has started."
					: id === null
						? `Story scheduled for ${formatDateTime(saved.release_at)}.`
						: "Story saved.",
			);
			setEditor({ open: false, news: null });
			await refresh();
		},
		onError: (error) => toast.error(newsErrorMessage(error, "Could not save the story.")),
	});

	const releaseMutation = useMutation({
		mutationFn: ({ id, release }: { id: number; release: boolean }) => setNewsReleased(id, release),
		onSuccess: async (_, { release }) => {
			toast.success(release ? "Story is live." : "Story hidden from players.");
			await refresh();
		},
		onError: (error) => toast.error(newsErrorMessage(error, "Could not change the story.")),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: number) => deleteNews(id),
		onSuccess: async () => {
			toast.success("Story deleted.");
			setConfirmDelete(null);
			await refresh();
		},
		onError: (error) => toast.error(newsErrorMessage(error, "Could not delete the story.")),
	});

	const stories = newsQuery.data ?? [];
	const counts = useMemo(() => {
		const tally = { live: 0, scheduled: 0, hidden: 0 };
		for (const story of stories) tally[statusOf(story)] += 1;
		return tally;
	}, [stories]);
	const nextScheduled = useMemo(
		() =>
			stories
				.filter((story) => statusOf(story) === "scheduled")
				.sort((a, b) => new Date(a.release_at).getTime() - new Date(b.release_at).getTime())[0],
		[stories],
	);
	const visible = filter === "all" ? stories : stories.filter((story) => statusOf(story) === filter);

	if (newsQuery.isLoading) return <Loading text="Loading news..." />;
	if (newsQuery.isError) {
		return (
			<div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
				Could not load the news.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<PageHeader
				title="News"
				description="Write headlines, schedule them, and choose which stocks they move."
				action={
					<Button onClick={() => setEditor({ open: true, news: null })}>
						<Plus data-icon="inline-start" />
						Write story
					</Button>
				}
			/>

			<FilterCards
				filter={filter}
				onSelect={setFilter}
				cards={[
					{
						value: "all",
						label: "All stories",
						count: stories.length,
						hint: "Everything written so far",
					},
					{
						value: "live",
						label: "Live",
						count: counts.live,
						hint: "On the players' feed now",
						dot: true,
					},
					{
						value: "scheduled",
						label: "Scheduled",
						count: counts.scheduled,
						hint: nextScheduled
							? `Next goes out ${formatCountdown(nextScheduled.release_at, now)}`
							: "Go out on their own at the set time",
					},
					{
						value: "hidden",
						label: "Hidden",
						count: counts.hidden,
						hint: "Taken down after going out",
					},
				]}
			/>

			{visible.length === 0 ? (
				<div className="rounded-lg border border-dashed px-4 py-16 text-center text-sm text-muted-foreground">
					{stories.length === 0 ? "No stories yet. Write the first one." : EMPTY[filter]}
				</div>
			) : (
				<ul className="flex flex-col divide-y rounded-lg border">
					{visible.map((story) => (
						<StoryRow
							key={story.id}
							story={story}
							now={now}
							busy={releaseMutation.isPending && releaseMutation.variables?.id === story.id}
							onEdit={() => setEditor({ open: true, news: story })}
							onRelease={(release) => releaseMutation.mutate({ id: story.id, release })}
							onDelete={() => setConfirmDelete(story)}
						/>
					))}
				</ul>
			)}

			<NewsEditor
				open={editor.open}
				onOpenChange={(open) => setEditor((prev) => ({ ...prev, open }))}
				news={editor.news}
				saving={saveMutation.isPending}
				onSave={(payload) => saveMutation.mutate({ id: editor.news?.id ?? null, payload })}
			/>

			<Dialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
				<DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Delete this story?</DialogTitle>
						<DialogDescription>
							“{confirmDelete?.title}” will be removed for everyone.
							{confirmDelete?.first_released_at && " Price moves it already caused stay where they are."}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmDelete(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							disabled={deleteMutation.isPending}
							onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
						>
							{deleteMutation.isPending && <Spinner data-icon="inline-start" />}
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function StatusBadge({ story, now }: { story: News; now: number }) {
	const status = statusOf(story);
	if (status === "live") {
		return (
			<Badge variant="outline" className="border-gain/30 bg-gain-muted text-gain">
				Live
			</Badge>
		);
	}
	if (status === "hidden") {
		return (
			<Badge variant="outline" className="text-muted-foreground">
				Hidden
			</Badge>
		);
	}
	return (
		<Badge variant="outline" className="border-dashed text-muted-foreground">
			Scheduled · {formatCountdown(story.release_at, now)}
		</Badge>
	);
}

function StoryRow({
	story,
	now,
	busy,
	onEdit,
	onRelease,
	onDelete,
}: {
	story: News;
	now: number;
	busy: boolean;
	onEdit: () => void;
	onRelease: (release: boolean) => void;
	onDelete: () => void;
}) {
	const status = statusOf(story);
	const chips = story.impacts.slice(0, MAX_CHIPS);
	const extra = story.impacts.length - chips.length;

	return (
		<li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				<div className="flex flex-wrap items-center gap-2">
					<StatusBadge story={story} now={now} />
					<time className="font-mono text-xs text-muted-foreground" dateTime={story.release_at}>
						{formatDateTime(story.release_at)}
					</time>
				</div>
				<button type="button" onClick={onEdit} className="text-left font-medium text-pretty hover:underline">
					{story.title}
				</button>
				<p className="line-clamp-1 text-sm text-muted-foreground">{story.content}</p>
				<div className="flex flex-wrap items-center gap-1.5 pt-0.5">
					{story.impacts.length === 0 ? (
						<span className="text-xs text-muted-foreground">No price impact</span>
					) : (
						<>
							{chips.map((impact) => (
								<span
									key={impact.stock_id}
									className={cn(
										"inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap tabular-nums",
										impact.impact_pct > 0 ? "bg-gain-muted text-gain" : "bg-loss-muted text-loss",
									)}
								>
									{impact.symbol}
									{impact.impact_pct > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
									{Math.abs(impact.impact_pct)}%
									<span className="opacity-70">
										· {formatDuration(impact.duration_seconds ?? story.default_duration_seconds)}
									</span>
								</span>
							))}
							{extra > 0 && <span className="text-xs text-muted-foreground">+{extra} more</span>}
						</>
					)}
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-2">
				{status === "scheduled" && (
					<Button variant="secondary" size="sm" disabled={busy} onClick={() => onRelease(true)}>
						{busy ? <Spinner data-icon="inline-start" /> : <Send data-icon="inline-start" />}
						Release now
					</Button>
				)}
				<Button variant="outline" size="sm" onClick={onEdit}>
					<PencilLine data-icon="inline-start" />
					Edit
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon-sm" aria-label={`More actions for ${story.title}`}>
							<MoreHorizontal />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{status === "live" && (
							<DropdownMenuItem onSelect={() => onRelease(false)}>
								<EyeOff />
								Hide from players
							</DropdownMenuItem>
						)}
						{status === "hidden" && (
							<DropdownMenuItem onSelect={() => onRelease(true)}>
								<Eye />
								Show again
							</DropdownMenuItem>
						)}
						{status !== "scheduled" && <DropdownMenuSeparator />}
						<DropdownMenuItem variant="destructive" onSelect={onDelete}>
							<Trash2 />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</li>
	);
}
