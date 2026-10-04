import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { runBulkAction, usersErrorMessage } from "#/api/users";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Spinner } from "#/components/ui/spinner";
import { Textarea } from "#/components/ui/textarea";
import { plural } from "#/lib/format";
import type { BulkAction } from "#/types/users";

export const USERS_KEY = ["admin-users"] as const;

const BAN_LENGTHS = [
	{ value: "3600", label: "1 hour" },
	{ value: "86400", label: "1 day" },
	{ value: String(7 * 86400), label: "7 days" },
	{ value: String(30 * 86400), label: "30 days" },
	{ value: "permanent", label: "Until unbanned" },
];

const DONE: Record<BulkAction, (count: string) => string> = {
	approve: (count) => `Approved ${count}. They can trade once they confirm their profile.`,
	reject: (count) => `Rejected and removed ${count}.`,
	ban: (count) => `Banned ${count}. They were signed out.`,
	unban: (count) => `Unbanned ${count}.`,
	make_admin: (count) => `Made ${count} an organiser.`,
	make_player: (count) => `Made ${count} a player.`,
};

export type Target = { ids: string[]; label: string };

/**
 * Every user action in one place, for the table, the bulk bar and the detail
 * panel alike. Approve, unban and role changes run straight away; ban and
 * reject ask first. Returns the dialogs to render alongside.
 */
export function useUserActions({ onDone }: { onDone?: (action: BulkAction, ids: string[]) => void } = {}) {
	const queryClient = useQueryClient();
	const [banTarget, setBanTarget] = useState<Target | null>(null);
	const [rejectTarget, setRejectTarget] = useState<Target | null>(null);
	const [reason, setReason] = useState("");
	const [length, setLength] = useState("permanent");

	const mutation = useMutation({
		mutationFn: (input: { action: BulkAction; ids: string[]; reason?: string; seconds?: number }) =>
			runBulkAction({
				action: input.action,
				user_ids: input.ids,
				reason: input.reason,
				duration_seconds: input.seconds,
			}),
		onSuccess: (result, input) => {
			const count = plural(result.succeeded, "user");
			if (result.succeeded > 0) toast.success(DONE[input.action](count));
			if (result.failed.length > 0) {
				toast.error(
					result.failed.length === 1
						? result.failed[0].error
						: `${plural(result.failed.length, "user")} could not be updated: ${result.failed[0].error}`,
				);
			}
			setBanTarget(null);
			setRejectTarget(null);
			onDone?.(input.action, input.ids);
		},
		onError: (error) => toast.error(usersErrorMessage(error, "That did not work. Try again.")),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: USERS_KEY });
		},
	});

	const run = (action: BulkAction, target: Target) => {
		if (action === "ban") {
			setReason("");
			setLength("permanent");
			setBanTarget(target);
			return;
		}
		if (action === "reject") {
			setRejectTarget(target);
			return;
		}
		mutation.mutate({ action, ids: target.ids });
	};

	const pendingFor = (action: BulkAction, id?: string) =>
		mutation.isPending &&
		mutation.variables?.action === action &&
		(id === undefined || mutation.variables.ids.includes(id));

	const dialogs: ReactNode = (
		<>
			<Dialog open={banTarget !== null} onOpenChange={(open) => !open && setBanTarget(null)}>
				<DialogContent>
					<form
						className="flex flex-col gap-6"
						onSubmit={(event) => {
							event.preventDefault();
							if (!banTarget) return;
							mutation.mutate({
								action: "ban",
								ids: banTarget.ids,
								reason: reason.trim() || undefined,
								seconds: length === "permanent" ? undefined : Number(length),
							});
						}}
					>
						<DialogHeader>
							<DialogTitle>Ban {banTarget?.label}?</DialogTitle>
							<DialogDescription>
								They are signed out at once and cannot sign in or trade until the ban ends. Their holdings stay as
								they are.
							</DialogDescription>
						</DialogHeader>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="ban-length">Length</FieldLabel>
								<Select value={length} onValueChange={setLength}>
									<SelectTrigger id="ban-length" className="w-48">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{BAN_LENGTHS.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</Field>
							<Field>
								<FieldLabel htmlFor="ban-reason">Reason</FieldLabel>
								<Textarea
									id="ban-reason"
									rows={3}
									maxLength={200}
									value={reason}
									onChange={(event) => setReason(event.target.value)}
									placeholder="Shown to them when they try to sign in"
								/>
								<FieldDescription>Optional, up to 200 characters.</FieldDescription>
							</Field>
						</FieldGroup>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => setBanTarget(null)}>
								Cancel
							</Button>
							<Button type="submit" variant="destructive" disabled={mutation.isPending}>
								{mutation.isPending && <Spinner data-icon="inline-start" />}
								Ban {banTarget && banTarget.ids.length > 1 ? plural(banTarget.ids.length, "user") : ""}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={rejectTarget !== null} onOpenChange={(open) => !open && setRejectTarget(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Reject {rejectTarget?.label}?</DialogTitle>
						<DialogDescription>
							Their account is deleted. They can sign up again with the same email later.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setRejectTarget(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							disabled={mutation.isPending}
							onClick={() => rejectTarget && mutation.mutate({ action: "reject", ids: rejectTarget.ids })}
						>
							{mutation.isPending && <Spinner data-icon="inline-start" />}
							Reject and delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);

	return { run, pendingFor, busy: mutation.isPending, dialogs };
}
