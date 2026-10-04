import { ImageUp, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { StockLogo } from "#/components/stock-logo";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty";
import { Spinner } from "#/components/ui/spinner";

export const LOGO_ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
// The backend refuses bodies over 8 MB; saying so before the upload is kinder.
export const LOGO_MAX_BYTES = 8 * 1024 * 1024;

/** Null when the file can be uploaded, else why not. */
export const logoFileProblem = (file: File) => {
	if (!LOGO_ACCEPTED.includes(file.type))
		return "Use a PNG, JPEG or WebP image.";
	if (file.size > LOGO_MAX_BYTES) return "That image is over 8 MB.";
	return null;
};

const fileSize = (bytes: number) =>
	bytes < 1024 * 1024
		? `${Math.max(1, Math.round(bytes / 1024))} KB`
		: `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/**
 * The logo control every form uses. Without a logo it is a drop zone; with
 * one, a card previewing it as players will see it, with Change and Remove.
 * It only reports what the admin picked: the caller decides whether that
 * uploads straight away or waits for the form.
 */
export function LogoField({
	symbol,
	logoUrl,
	title,
	detail,
	busy = false,
	onFile,
	onRemove,
	onRestore,
}: {
	/** Used for the preview's fallback initials. */
	symbol: string;
	/** What to preview; null shows the drop zone. */
	logoUrl: string | null | undefined;
	title: string;
	detail: string;
	busy?: boolean;
	onFile: (file: File) => void;
	onRemove: () => void;
	/** Set while a saved logo is marked for removal, to take that back. */
	onRestore?: () => void;
}) {
	const input = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);

	const take = (file: File | undefined) => {
		if (!file || busy) return;
		const problem = logoFileProblem(file);
		if (problem) {
			toast.error(problem);
			return;
		}
		onFile(file);
	};
	const choose = () => input.current?.click();
	// An image dropped on either state replaces the logo.
	const dropTarget = {
		onDragOver: (event: React.DragEvent) => {
			event.preventDefault();
			setDragging(true);
		},
		onDragLeave: () => setDragging(false),
		onDrop: (event: React.DragEvent) => {
			event.preventDefault();
			setDragging(false);
			take(event.dataTransfer.files[0]);
		},
	};

	return (
		<>
			<input
				ref={input}
				type="file"
				accept={LOGO_ACCEPTED.join(",")}
				className="sr-only"
				tabIndex={-1}
				onChange={(event) => {
					const file = event.target.files?.[0];
					// Cleared so choosing the same file again still fires.
					event.target.value = "";
					take(file);
				}}
			/>
			{logoUrl ? (
				<Card size="sm" {...dropTarget}>
					<CardContent className="flex items-center gap-3">
						<StockLogo
							symbol={symbol.trim().toUpperCase() || "?"}
							logoUrl={logoUrl}
							size="md"
						/>
						<div className="flex min-w-0 flex-1 flex-col">
							<span className="truncate font-medium">
								{dragging ? "Drop to replace the logo" : title}
							</span>
							<span className="text-xs text-muted-foreground">{detail}</span>
						</div>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={busy}
							onClick={choose}
						>
							{busy && <Spinner data-icon="inline-start" />}
							Change
						</Button>
						<Button
							type="button"
							size="icon-sm"
							variant="ghost"
							aria-label="Remove logo"
							disabled={busy}
							onClick={onRemove}
						>
							<X />
						</Button>
					</CardContent>
				</Card>
			) : (
				<Empty className="border" {...dropTarget}>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<ImageUp />
						</EmptyMedia>
						<EmptyTitle>
							{dragging
								? "Drop to use this image"
								: onRestore
									? "Logo will be removed"
									: "Add a logo"}
						</EmptyTitle>
						<EmptyDescription>
							{onRestore
								? "The current logo is removed when you save. Choose another image, or keep it."
								: "Drag an image here or choose one. PNG, JPEG or WebP up to 8 MB, resized to a square."}
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<div className="flex flex-wrap justify-center gap-2">
							<Button
								type="button"
								size="sm"
								variant="outline"
								disabled={busy}
								onClick={choose}
							>
								{busy && <Spinner data-icon="inline-start" />}
								Choose image
							</Button>
							{onRestore && (
								<Button
									type="button"
									size="sm"
									variant="ghost"
									disabled={busy}
									onClick={onRestore}
								>
									Keep current logo
								</Button>
							)}
						</div>
					</EmptyContent>
				</Empty>
			)}
		</>
	);
}

/**
 * Picks a logo for something that does not exist yet (a new stock or IPO).
 * The file stays in the browser until the form creates the record and
 * uploads it.
 */
export function LogoPicker({
	symbol,
	file,
	onChange,
}: {
	symbol: string;
	file: File | null;
	onChange: (file: File | null) => void;
}) {
	// A local preview of the chosen file, released when it changes.
	const preview = useMemo(
		() => (file ? URL.createObjectURL(file) : null),
		[file],
	);
	useEffect(
		() => () => {
			if (preview) URL.revokeObjectURL(preview);
		},
		[preview],
	);

	return (
		<LogoField
			symbol={symbol}
			logoUrl={preview}
			title={file?.name ?? ""}
			detail={
				file ? `${fileSize(file.size)} · resized to a square on upload` : ""
			}
			onFile={onChange}
			onRemove={() => onChange(null)}
		/>
	);
}

/**
 * A logo change an edit form has not saved yet: a new file, null to remove
 * the saved logo, or undefined to leave it as it is.
 */
export type LogoChange = File | null | undefined;

/**
 * Changes the logo of something that already exists (a stock or IPO being
 * edited). Like the other fields, nothing is sent until the form is saved.
 */
export function LogoChangePicker({
	symbol,
	currentUrl,
	change,
	onChange,
}: {
	symbol: string;
	/** The saved logo, shown until it is replaced or removed. */
	currentUrl: string | null | undefined;
	change: LogoChange;
	onChange: (change: LogoChange) => void;
}) {
	const file = change instanceof File ? change : null;
	const preview = useMemo(
		() => (file ? URL.createObjectURL(file) : null),
		[file],
	);
	useEffect(
		() => () => {
			if (preview) URL.revokeObjectURL(preview);
		},
		[preview],
	);

	return (
		<LogoField
			symbol={symbol}
			logoUrl={file ? preview : change === null ? null : currentUrl}
			title={file ? file.name : "Current logo"}
			detail={
				file
					? `${fileSize(file.size)} · replaces the current logo when you save`
					: "Replace or remove it; nothing changes until you save."
			}
			onFile={onChange}
			// Removing a file just picked goes back to the saved logo; removing the
			// saved logo marks it to be deleted on save.
			onRemove={() => onChange(file ? undefined : null)}
			onRestore={
				change === null && currentUrl ? () => onChange(undefined) : undefined
			}
		/>
	);
}
