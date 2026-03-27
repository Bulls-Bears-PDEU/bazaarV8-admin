import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { EyeOff, PencilLine, Plus, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { addNews, getAllNews, type NewsPayload, updateNews } from "#/api/news";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Spinner } from "#/components/ui/spinner";
import { Loading } from "#/components/ui/loading";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { Textarea } from "#/components/ui/textarea";
import type { News } from "#/types/news";

export const Route = createFileRoute("/_admin/news")({
	component: RouteComponent,
});

type NewsFormState = {
	title: string;
	content: string;
	releaseAfterMinutes: string;
	affectedStocksText: string;
};

const EMPTY_FORM: NewsFormState = {
	title: "",
	content: "",
	releaseAfterMinutes: "",
	affectedStocksText: "",
};

function parseAffectedStocks(input: string): Record<string, number> {
	const trimmed = input.trim();
	if (!trimmed) {
		return {};
	}

	let parsedJson: unknown;
	try {
		parsedJson = JSON.parse(trimmed);
	} catch {
		throw new Error(
			'Affected stocks must be a valid JSON object, e.g. {"AAPL": 1.5, "MSFT": -0.8}',
		);
	}

	if (
		!parsedJson ||
		typeof parsedJson !== "object" ||
		Array.isArray(parsedJson)
	) {
		throw new Error("Affected stocks must be a JSON object.");
	}

	const affectedStocks: Record<string, number> = {};
	for (const [stockId, impactValue] of Object.entries(parsedJson)) {
		const impact = Number(impactValue);
		if (Number.isNaN(impact)) {
			throw new Error(`Impact for ${stockId} must be a valid number.`);
		}
		affectedStocks[stockId] = impact;
	}

	return affectedStocks;
}

function formatAffectedStocks(affected: Record<string, number> | undefined) {
	if (!affected || Object.keys(affected).length === 0) {
		return "{}";
	}

	return JSON.stringify(affected, null, 2);
}

function resolveReleaseAt(form: NewsFormState) {
	if (form.releaseAfterMinutes.trim()) {
		const minutes = Number(form.releaseAfterMinutes);
		if (!Number.isFinite(minutes) || minutes < 0) {
			throw new Error(
				"Release-after time must be a valid non-negative number.",
			);
		}

		return {
			releaseAt: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
			isReleased: minutes === 0,
		};
	}

	return {
		releaseAt: new Date().toISOString(),
		isReleased: true,
	};
}

function getReleasePreview(minutesInput: string) {
	const trimmed = minutesInput.trim();
	if (!trimmed) {
		return `Will release immediately at ${new Date().toLocaleString()}`;
	}

	const minutes = Number(trimmed);
	if (!Number.isFinite(minutes) || minutes < 0) {
		return "Enter a valid non-negative number of minutes.";
	}

	const releaseTime = new Date(Date.now() + minutes * 60 * 1000);
	return `Will release at ${releaseTime.toLocaleString()}`;
}

function toNewsPayload(form: NewsFormState, releaseNow = false): NewsPayload {
	const releaseInfo = releaseNow
		? { releaseAt: new Date().toISOString(), isReleased: true }
		: resolveReleaseAt(form);

	if (!form.title.trim()) {
		throw new Error("Title is required.");
	}

	if (!form.content.trim()) {
		throw new Error("Content is required.");
	}

	return {
		title: form.title.trim(),
		content: form.content.trim(),
		isReleased: releaseInfo.isReleased,
		release_at: releaseInfo.releaseAt,
		affected_stocks: parseAffectedStocks(form.affectedStocksText),
	};
}

function RouteComponent() {
	const queryClient = useQueryClient();
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [addForm, setAddForm] = useState<NewsFormState>(EMPTY_FORM);
	const [editForm, setEditForm] = useState<NewsFormState>(EMPTY_FORM);
	const [editingNewsId, setEditingNewsId] = useState<number | null>(null);
	const [releasingNewsId, setReleasingNewsId] = useState<number | null>(null);
	const [unreleasingNewsId, setUnreleasingNewsId] = useState<number | null>(
		null,
	);

	const newsQuery = useQuery({
		queryKey: ["admin-news"],
		queryFn: getAllNews,
	});

	const addNewsMutation = useMutation({
		mutationFn: addNews,
		onSuccess: async () => {
			toast.success("News added successfully.");
			setAddForm(EMPTY_FORM);
			setIsAddOpen(false);
			await queryClient.invalidateQueries({ queryKey: ["admin-news"] });
		},
		onError: (error) => {
			toast.error(error.message || "Failed to add news.");
		},
	});

	const updateNewsMutation = useMutation({
		mutationFn: ({
			id,
			payload,
		}: {
			id: number;
			payload: Partial<NewsPayload>;
		}) => updateNews(id, payload),
		onSuccess: async () => {
			toast.success("News updated successfully.");
			setIsEditOpen(false);
			setEditingNewsId(null);
			await queryClient.invalidateQueries({ queryKey: ["admin-news"] });
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update news.");
		},
	});

	const releaseNowMutation = useMutation({
		mutationFn: (id: number) =>
			updateNews(id, {
				isReleased: true,
				release_at: new Date().toISOString(),
			}),
		onMutate: (id) => {
			setReleasingNewsId(id);
		},
		onSuccess: async () => {
			toast.success("News released successfully.");
			await queryClient.invalidateQueries({ queryKey: ["admin-news"] });
		},
		onError: (error) => {
			toast.error(error.message || "Failed to release news.");
		},
		onSettled: () => {
			setReleasingNewsId(null);
		},
	});

	const unreleaseMutation = useMutation({
		mutationFn: (id: number) =>
			updateNews(id, {
				isReleased: false,
			}),
		onMutate: (id) => {
			setUnreleasingNewsId(id);
		},
		onSuccess: async () => {
			toast.success("News hidden successfully.");
			await queryClient.invalidateQueries({ queryKey: ["admin-news"] });
		},
		onError: (error) => {
			toast.error(error.message || "Failed to unrelease news.");
		},
		onSettled: () => {
			setUnreleasingNewsId(null);
		},
	});

	const newsRows = useMemo(() => {
		const rows = newsQuery.data ?? [];
		return [...rows].sort(
			(a, b) =>
				new Date(b.release_at).getTime() - new Date(a.release_at).getTime(),
		);
	}, [newsQuery.data]);

	const latestNewsTitle = newsRows[0]?.title ?? "No news published yet";

	const openEditDialog = (news: News) => {
		setEditingNewsId(news.id);
		setEditForm({
			title: news.title,
			content: news.content,
			releaseAfterMinutes: "",
			affectedStocksText: formatAffectedStocks(news.affected_stocks),
		});
		setIsEditOpen(true);
	};

	const columns: ColumnDef<News>[] = [
		{
			accessorKey: "title",
			header: "Title",
			cell: (info) => {
				const value = info.getValue<string>();
				return (
					<div className="max-w-[360px] truncate font-medium" title={value}>
						{value}
					</div>
				);
			},
		},
		{
			accessorKey: "release_at",
			header: "Release At",
			cell: (info) => new Date(info.getValue<string>()).toLocaleString(),
		},
		{
			id: "affectedStocks",
			header: "Affected Stocks",
			cell: ({ row }) => {
				const stocks = Object.keys(row.original.affected_stocks ?? {});
				return stocks.length > 0 ? `${stocks.length} stocks` : "None";
			},
		},
		{
			accessorKey: "isReleased",
			header: "Status",
			cell: (info) => {
				const value = info.getValue<boolean>();
				return value ? (
					<Badge variant="default">Released</Badge>
				) : (
					<Badge variant="secondary">Hidden</Badge>
				);
			},
		},
		{
			accessorKey: "created_at",
			header: "Created",
			cell: (info) => new Date(info.getValue<string>()).toLocaleString(),
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => openEditDialog(row.original)}
					>
						<PencilLine data-icon="inline-start" />
						Edit
					</Button>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => releaseNowMutation.mutate(row.original.id)}
						disabled={
							releaseNowMutation.isPending &&
							releasingNewsId === row.original.id
						}
					>
						{releaseNowMutation.isPending &&
						releasingNewsId === row.original.id ? (
							<Spinner data-icon="inline-start" />
						) : (
							<Send data-icon="inline-start" />
						)}
						Release Now
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => unreleaseMutation.mutate(row.original.id)}
						disabled={
							!row.original.isReleased ||
							(unreleaseMutation.isPending &&
								unreleasingNewsId === row.original.id)
						}
					>
						{unreleaseMutation.isPending &&
						unreleasingNewsId === row.original.id ? (
							<Spinner data-icon="inline-start" />
						) : (
							<EyeOff data-icon="inline-start" />
						)}
						Unrelease
					</Button>
				</div>
			),
		},
	];

	const table = useReactTable({
		data: newsRows,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	const handleAddSubmit = () => {
		try {
			addNewsMutation.mutate(toNewsPayload(addForm));
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Invalid form data.",
			);
		}
	};

	const handleAddAndReleaseNow = () => {
		try {
			addNewsMutation.mutate(toNewsPayload(addForm, true));
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Invalid form data.",
			);
		}
	};

	const handleEditSubmit = () => {
		if (!editingNewsId) {
			return;
		}

		try {
			updateNewsMutation.mutate({
				id: editingNewsId,
				payload: toNewsPayload(editForm),
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Invalid form data.",
			);
		}
	};

	const addReleasePreview = getReleasePreview(addForm.releaseAfterMinutes);
	const editReleasePreview = getReleasePreview(editForm.releaseAfterMinutes);

	if (newsQuery.isLoading) {
		return <Loading text="Loading news..." />;
	}

	if (newsQuery.isError) {
		return <div className="p-4">Failed to load news.</div>;
	}

	return (
		<div className="w-full p-4">
			<div className="mb-4 flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">News Admin Dashboard</h1>
					<p className="text-sm text-muted-foreground">
						Manage published news updates and stock impact metadata.
					</p>
				</div>
				<Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus data-icon="inline-start" />
							Add News
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Add News</DialogTitle>
							<DialogDescription>
								Create a new news item and define affected stocks as a JSON
								object.
							</DialogDescription>
						</DialogHeader>
						<FieldGroup>
							<Field>
								<FieldLabel>Title</FieldLabel>
								<Input
									value={addForm.title}
									onChange={(e) =>
										setAddForm((prev) => ({ ...prev, title: e.target.value }))
									}
								/>
							</Field>
							<Field>
								<FieldLabel>Content (Markdown)</FieldLabel>
								<Textarea
									rows={6}
									value={addForm.content}
									onChange={(e) =>
										setAddForm((prev) => ({ ...prev, content: e.target.value }))
									}
								/>
							</Field>
							<Field>
								<FieldLabel>Release In (minutes)</FieldLabel>
								<Input
									type="number"
									min={0}
									placeholder="30"
									value={addForm.releaseAfterMinutes}
									onChange={(e) =>
										setAddForm((prev) => ({
											...prev,
											releaseAfterMinutes: e.target.value,
										}))
									}
								/>
								<FieldDescription>
									Optional. Leave empty to release now.
								</FieldDescription>
								<FieldDescription>{addReleasePreview}</FieldDescription>
							</Field>
							<Field>
								<FieldLabel>Affected Stocks (JSON)</FieldLabel>
								<Textarea
									rows={4}
									placeholder='{"AAPL": 1.2, "MSFT": -0.8}'
									value={addForm.affectedStocksText}
									onChange={(e) =>
										setAddForm((prev) => ({
											...prev,
											affectedStocksText: e.target.value,
										}))
									}
								/>
								<FieldDescription>
									Enter a valid JSON object with numeric values.
								</FieldDescription>
							</Field>
						</FieldGroup>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsAddOpen(false)}
							>
								Cancel
							</Button>
							<Button
								type="button"
								onClick={handleAddSubmit}
								disabled={addNewsMutation.isPending}
							>
								{addNewsMutation.isPending && (
									<Spinner data-icon="inline-start" />
								)}
								Create News
							</Button>
							<Button
								type="button"
								variant="secondary"
								onClick={handleAddAndReleaseNow}
								disabled={addNewsMutation.isPending}
							>
								{addNewsMutation.isPending ? (
									<Spinner data-icon="inline-start" />
								) : (
									<Send data-icon="inline-start" />
								)}
								Release News
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			<div className="mb-4 grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Total News</CardTitle>
						<CardDescription>Total count of news posts</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">{newsRows.length}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Latest News Title</CardTitle>
						<CardDescription>Most recently released title</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="line-clamp-2 font-medium">{latestNewsTitle}</p>
					</CardContent>
				</Card>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id}>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No news available.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Update News</DialogTitle>
						<DialogDescription>
							Update title, content, release time, and affected stock impacts.
						</DialogDescription>
					</DialogHeader>
					<FieldGroup>
						<Field>
							<FieldLabel>Title</FieldLabel>
							<Input
								value={editForm.title}
								onChange={(e) =>
									setEditForm((prev) => ({ ...prev, title: e.target.value }))
								}
							/>
						</Field>
						<Field>
							<FieldLabel>Content (Markdown)</FieldLabel>
							<Textarea
								rows={6}
								value={editForm.content}
								onChange={(e) =>
									setEditForm((prev) => ({ ...prev, content: e.target.value }))
								}
							/>
						</Field>
						<Field>
							<FieldLabel>Release In (minutes)</FieldLabel>
							<Input
								type="number"
								min={0}
								placeholder="30"
								value={editForm.releaseAfterMinutes}
								onChange={(e) =>
									setEditForm((prev) => ({
										...prev,
										releaseAfterMinutes: e.target.value,
									}))
								}
							/>
							<FieldDescription>
								Optional. Leave empty to release now.
							</FieldDescription>
							<FieldDescription>{editReleasePreview}</FieldDescription>
						</Field>
						<Field>
							<FieldLabel>Affected Stocks (JSON)</FieldLabel>
							<Textarea
								rows={4}
								placeholder='{"AAPL": 1.2, "MSFT": -0.8}'
								value={editForm.affectedStocksText}
								onChange={(e) =>
									setEditForm((prev) => ({
										...prev,
										affectedStocksText: e.target.value,
									}))
								}
							/>
							<FieldDescription>
								Enter a valid JSON object with numeric values.
							</FieldDescription>
						</Field>
					</FieldGroup>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsEditOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={handleEditSubmit}
							disabled={updateNewsMutation.isPending}
						>
							{updateNewsMutation.isPending && (
								<Spinner data-icon="inline-start" />
							)}
							Update News
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{newsRows.length > 0 && (
				<div className="mt-4 flex flex-wrap gap-2">
					{Object.keys(newsRows[0].affected_stocks ?? {}).map((stockId) => (
						<Badge key={stockId} variant="secondary">
							{stockId}
						</Badge>
					))}
				</div>
			)}
		</div>
	);
}


