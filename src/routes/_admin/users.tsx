import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	ArrowDown,
	ArrowDownUp,
	ArrowUp,
	Ban,
	Info,
	MoreVertical,
	PencilLine,
	ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Spinner } from "#/components/ui/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/_admin/users")({
	component: RouteComponent,
});

type ListUsersResponse = Awaited<ReturnType<typeof authClient.admin.listUsers>>;
type AdminUser = NonNullable<ListUsersResponse["data"]>["users"][number];
type UserRole = "pending" | "user" | "admin";

const ROLE_OPTIONS: UserRole[] = ["pending", "user", "admin"];

function normalizeRole(role: unknown): UserRole {
	if (role === "admin" || role === "user" || role === "pending") {
		return role;
	}
	return "pending";
}

function getDateValue(value: unknown) {
	if (value instanceof Date) {
		return value;
	}
	if (typeof value === "string" || typeof value === "number") {
		const date = new Date(value);
		if (!Number.isNaN(date.getTime())) {
			return date;
		}
	}
	return null;
}

function formatDate(value: unknown) {
	const date = getDateValue(value);
	return date ? date.toLocaleString() : "-";
}

function formatPropValue(value: unknown) {
	if (value === null || value === undefined) {
		return "-";
	}
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return String(value);
	}
	if (value instanceof Date) {
		return value.toLocaleString();
	}
	return JSON.stringify(value);
}

function roleBadgeVariant(role: UserRole): "default" | "secondary" | "outline" {
	if (role === "admin") {
		return "default";
	}
	if (role === "user") {
		return "secondary";
	}
	return "outline";
}

function getCashBalanceMeta(user: AdminUser) {
	const candidate = user as Record<string, unknown>;

	if (candidate.cash_balance !== undefined) {
		return {
			value: String(candidate.cash_balance ?? "0"),
		};
	}

	return {
		value: "0",
	};
}

function RouteComponent() {
	const queryClient = useQueryClient();
	const [sorting, setSorting] = useState<SortingState>([]);
	const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole>>({});
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
	const [editName, setEditName] = useState("");
	const [editCashBalance, setEditCashBalance] = useState("0");

	const users = useQuery({
		queryKey: ["users"],
		queryFn: async () => {
			const res = await authClient.admin.listUsers({ query: {} });
			if (res.error) {
				throw new Error(res.error.message || "Failed to load users");
			}
			return (
				res.data ?? { users: [], total: 0, limit: undefined, offset: undefined }
			);
		},
	});

	const setRoleMutation = useMutation({
		mutationFn: async ({
			userId,
			role,
		}: {
			userId: string;
			role: UserRole;
		}) => {
			const res = await authClient.admin.setRole({
				userId,
				role: role as unknown as "admin" | "user" | ("admin" | "user")[],
			});
			if (res.error) {
				throw new Error(res.error.message || "Failed to update role");
			}
			return res.data;
		},
		onSuccess: async () => {
			toast.success("User role updated");
			await queryClient.invalidateQueries({ queryKey: ["users"] });
		},
		onError: (error) => {
			toast.error(error.message || "Unable to update user role");
		},
	});

	const banMutation = useMutation({
		mutationFn: async (userId: string) => {
			const res = await authClient.admin.banUser({
				userId,
				banReason: "Banned by administrator",
			});
			if (res.error) {
				throw new Error(res.error.message || "Failed to ban user");
			}
			return res.data;
		},
		onSuccess: async () => {
			toast.success("User banned");
			await queryClient.invalidateQueries({ queryKey: ["users"] });
		},
		onError: (error) => {
			toast.error(error.message || "Unable to ban user");
		},
	});

	const unbanMutation = useMutation({
		mutationFn: async (userId: string) => {
			const res = await authClient.admin.unbanUser({ userId });
			if (res.error) {
				throw new Error(res.error.message || "Failed to unban user");
			}
			return res.data;
		},
		onSuccess: async () => {
			toast.success("User unbanned");
			await queryClient.invalidateQueries({ queryKey: ["users"] });
		},
		onError: (error) => {
			toast.error(error.message || "Unable to unban user");
		},
	});

	const updateUserMutation = useMutation({
		mutationFn: async ({
			userId,
			data,
		}: {
			userId: string;
			data: Record<string, unknown>;
		}) => {
			const res = await authClient.admin.updateUser({ userId, data });
			if (res.error) {
				throw new Error(
					res.error.message || "Failed to update user attributes",
				);
			}
			return res.data;
		},
		onSuccess: async () => {
			toast.success("User attributes updated");
			setEditDialogOpen(false);
			setEditingUser(null);
			await queryClient.invalidateQueries({ queryKey: ["users"] });
		},
		onError: (error) => {
			toast.error(error.message || "Unable to update user attributes");
		},
	});

	const handleRoleDraftChange = (userId: string, role: string) => {
		if (role !== "pending" && role !== "user" && role !== "admin") {
			return;
		}
		setRoleDrafts((prev) => ({ ...prev, [userId]: role }));
	};

	const openEditDialog = (user: AdminUser) => {
		const cashMeta = getCashBalanceMeta(user);
		setEditingUser(user);
		setEditName(user.name ?? "");
		setEditCashBalance(cashMeta.value);
		setEditDialogOpen(true);
	};

	const handleUpdateUserAttributes = () => {
		if (!editingUser) {
			return;
		}

		const parsedCashBalance = Number(editCashBalance);
		if (Number.isNaN(parsedCashBalance)) {
			toast.error("Cash balance must be a valid number");
			return;
		}

		const payload: Record<string, unknown> = {
			name: editName.trim(),
			cash_balance: parsedCashBalance,
		};

		updateUserMutation.mutate({
			userId: editingUser.id,
			data: payload,
		});
	};

	const userRows = users.data?.users ?? [];
	const totalUsers = users.data?.total ?? userRows.length;

	const columns: ColumnDef<AdminUser>[] = [
		{
			accessorKey: "name",
			header: "Name",
			cell: (info) => info.getValue<string | null>() || "-",
		},
		{
			accessorKey: "email",
			header: "Email",
			cell: (info) => info.getValue<string | null>() || "-",
		},
		{
			id: "role",
			header: "Role",
			cell: ({ row }) => {
				const role = normalizeRole(row.original.role);
				return <Badge variant={roleBadgeVariant(role)}>{role}</Badge>;
			},
		},
		{
			id: "banned",
			header: "Banned",
			cell: ({ row }) => (row.original.banned ? "Yes" : "No"),
		},
		{
			accessorKey: "cash_balance",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Cash Balance
					{column.getIsSorted() === "asc" ? (
						<ArrowUp className="ml-2 h-4 w-4" />
					) : column.getIsSorted() === "desc" ? (
						<ArrowDown className="ml-2 h-4 w-4" />
					) : (
						<ArrowDownUp className="ml-2 h-4 w-4" />
					)}
				</Button>
			),
			cell: (info) => {
				const value = info.getValue<unknown>();
				if (typeof value === "number") {
					return `₹${value.toFixed(2)}`;
				}
				return "₹0.00";
			},
		},
		{
			accessorKey: "banReason",
			header: "Ban Reason",
			cell: (info) => info.getValue<string | null>() || "-",
		},
		{
			accessorKey: "banExpires",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Ban Expires
					{column.getIsSorted() === "asc" ? (
						<ArrowUp className="ml-2 h-4 w-4" />
					) : column.getIsSorted() === "desc" ? (
						<ArrowDown className="ml-2 h-4 w-4" />
					) : (
						<ArrowDownUp className="ml-2 h-4 w-4" />
					)}
				</Button>
			),
			cell: (info) => formatDate(info.getValue<unknown>()),
			enableSorting: true,
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Created At
					{column.getIsSorted() === "asc" ? (
						<ArrowUp className="ml-2 h-4 w-4" />
					) : column.getIsSorted() === "desc" ? (
						<ArrowDown className="ml-2 h-4 w-4" />
					) : (
						<ArrowDownUp className="ml-2 h-4 w-4" />
					)}
				</Button>
			),
			cell: (info) => formatDate(info.getValue<unknown>()),
			enableSorting: true,
		},
		{
			accessorKey: "updatedAt",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Updated At
					{column.getIsSorted() === "asc" ? (
						<ArrowUp className="ml-2 h-4 w-4" />
					) : column.getIsSorted() === "desc" ? (
						<ArrowDown className="ml-2 h-4 w-4" />
					) : (
						<ArrowDownUp className="ml-2 h-4 w-4" />
					)}
				</Button>
			),
			cell: (info) => formatDate(info.getValue<unknown>()),
			enableSorting: true,
		},
		{
			id: "actions",
			header: "Actions",
			enableSorting: false,
			cell: ({ row }) => {
				const user = row.original;
				const currentRole = normalizeRole(user.role);
				const selectedRole = roleDrafts[user.id] ?? currentRole;
				const isRoleUpdating =
					setRoleMutation.isPending &&
					setRoleMutation.variables?.userId === user.id;
				const isBanUpdating =
					banMutation.isPending && banMutation.variables === user.id;
				const isUnbanUpdating =
					unbanMutation.isPending && unbanMutation.variables === user.id;

				return (
					<div className="flex items-center justify-end gap-2">
						<Select
							value={selectedRole}
							onValueChange={(value) => handleRoleDraftChange(user.id, value)}
							disabled={isRoleUpdating}
						>
							<SelectTrigger className="w-28">
								<SelectValue placeholder="Role" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{ROLE_OPTIONS.map((role) => (
										<SelectItem key={role} value={role}>
											{role}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
						<Button
							size="sm"
							onClick={() =>
								setRoleMutation.mutate({ userId: user.id, role: selectedRole })
							}
							disabled={isRoleUpdating || selectedRole === currentRole}
						>
							{isRoleUpdating ? "Updating..." : "Update"}
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon-sm">
									<MoreVertical />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-48">
								<DropdownMenuLabel>User Actions</DropdownMenuLabel>
								<DropdownMenuItem
									className="whitespace-nowrap"
									onSelect={(event) => {
										event.preventDefault();
										openEditDialog(user);
									}}
								>
									<PencilLine className="mr-2" />
									Edit Attributes
								</DropdownMenuItem>
								<Dialog>
									<DialogTrigger asChild>
										<DropdownMenuItem
											className="w-full whitespace-nowrap"
											onSelect={(event) => event.preventDefault()}
										>
											<Info className="mr-2" />
											View Properties
										</DropdownMenuItem>
									</DialogTrigger>
									<DialogContent className="sm:max-w-xl">
										<DialogHeader>
											<DialogTitle>User Properties</DialogTitle>
											<DialogDescription>
												Complete property list for {user.email || user.id}.
											</DialogDescription>
										</DialogHeader>
										<div className="max-h-96 overflow-y-auto rounded-md border">
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Property</TableHead>
														<TableHead>Value</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{Object.entries(user).map(([key, value]) => (
														<TableRow key={key}>
															<TableCell className="font-medium">
																{key}
															</TableCell>
															<TableCell className="break-all">
																{formatPropValue(value)}
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>
									</DialogContent>
								</Dialog>
								<DropdownMenuSeparator />
								{user.banned ? (
									<DropdownMenuItem
										className="whitespace-nowrap"
										onClick={() => unbanMutation.mutate(user.id)}
										disabled={isUnbanUpdating}
									>
										<ShieldCheck className="mr-2" />
										{isUnbanUpdating ? "Unbanning..." : "Unban User"}
									</DropdownMenuItem>
								) : (
									<DropdownMenuItem
										className="whitespace-nowrap"
										onClick={() => banMutation.mutate(user.id)}
										variant="destructive"
										disabled={isBanUpdating}
									>
										<Ban className="mr-2" />
										{isBanUpdating ? "Banning..." : "Ban User"}
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			},
		},
	];

	const table = useReactTable({
		columns,
		data: userRows,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: { sorting },
	});

	if (users.isPending) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<Spinner className="mr-2" />
				<span>Loading users...</span>
			</div>
		);
	}

	if (users.isError) {
		return <div className="p-4">Failed to load users.</div>;
	}

	return (
		<div className="p-4 w-full h-full">
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Edit User Attributes</DialogTitle>
						<DialogDescription>
							Update basic profile fields for{" "}
							{editingUser?.email || editingUser?.id || "selected user"}.
						</DialogDescription>
					</DialogHeader>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="edit-user-name">Name</FieldLabel>
							<Input
								id="edit-user-name"
								value={editName}
								onChange={(event) => setEditName(event.target.value)}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="edit-user-cash-balance">
								Cash Balance
							</FieldLabel>
							<Input
								id="edit-user-cash-balance"
								type="number"
								value={editCashBalance}
								onChange={(event) => setEditCashBalance(event.target.value)}
							/>
							<FieldDescription>
								This updates the cash_balance user attribute.
							</FieldDescription>
						</Field>
					</FieldGroup>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setEditDialogOpen(false)}
							disabled={updateUserMutation.isPending}
						>
							Cancel
						</Button>
						<Button
							onClick={handleUpdateUserAttributes}
							disabled={updateUserMutation.isPending || !editingUser}
						>
							{updateUserMutation.isPending ? "Saving..." : "Save Changes"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-2xl font-bold">Users</h2>
				<Badge variant="secondary">{totalUsers} total</Badge>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) =>
									header.isPlaceholder ? null : (
										<TableHead key={header.id}>
											<div className="flex items-center justify-between gap-1">
												{flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
											</div>
										</TableHead>
									),
								)}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.length === 0 ? (
							<TableRow>
								<TableCell
									className="text-center text-muted-foreground"
									colSpan={11}
								>
									No users found.
								</TableCell>
							</TableRow>
						) : (
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
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
