import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Spinner } from "#/components/ui/spinner";

/**
 * The gate in front of anything god mode cannot undo.
 *
 * The phrase has to be typed out rather than a button clicked twice: it is the
 * one confirmation that cannot be got through by muscle memory, which is the
 * point when the action spends someone else's money or wipes their history.
 */
export function ConfirmDangerous({
	open,
	onOpenChange,
	title,
	description,
	confirmWord,
	actionLabel,
	pending = false,
	onConfirm,
	children,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: React.ReactNode;
	confirmWord: string;
	actionLabel: string;
	pending?: boolean;
	onConfirm: () => void;
	children?: React.ReactNode;
}) {
	const [typed, setTyped] = useState("");
	// A fresh box every time it opens, so a previous confirmation never carries.
	useEffect(() => {
		if (open) setTyped("");
	}, [open]);

	const matches = typed.trim().toUpperCase() === confirmWord.toUpperCase();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				{children}
				<div className="flex flex-col gap-2">
					<Label htmlFor="confirm-word">
						Type{" "}
						<span className="font-mono font-semibold text-foreground">
							{confirmWord}
						</span>{" "}
						to confirm
					</Label>
					<Input
						id="confirm-word"
						autoComplete="off"
						value={typed}
						onChange={(event) => setTyped(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" && matches && !pending) onConfirm();
						}}
					/>
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={pending}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={onConfirm}
						disabled={!matches || pending}
					>
						{pending && <Spinner data-icon="inline-start" />}
						{actionLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
