import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageOff, ImageUp, Pencil } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { removeStockLogo, uploadStockLogo } from "#/api/stocks";
import { usersErrorMessage } from "#/api/users";
import { StockLogo } from "#/components/stock-logo";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Spinner } from "#/components/ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
// The backend refuses bodies over 8 MB; saying so before the upload is kinder.
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * A stock's logo that is also its upload and remove control. The file goes to the
 * backend as it is: the server does the resizing, so the admin panel cannot be
 * the thing that decides how large a stored logo gets.
 */
export function StockLogoEditor({
	stockId,
	symbol,
	logoUrl,
}: {
	stockId: number;
	symbol: string;
	logoUrl: string | null | undefined;
}) {
	const queryClient = useQueryClient();
	const input = useRef<HTMLInputElement>(null);

	const refresh = () => {
		// The stock list feeds every StockLogo; the detail query feeds this page.
		queryClient.invalidateQueries({ queryKey: ["stocks"] });
		// Exact: the chart and candle table sit under the same prefix and do not
		// need thousands of candles refetched because a picture changed.
		queryClient.invalidateQueries({
			queryKey: ["stock", String(stockId)],
			exact: true,
		});
	};

	const upload = useMutation({
		mutationFn: (file: File) => uploadStockLogo(stockId, file),
		onSuccess: (result) => {
			toast.success(
				`Logo saved (${(result.bytes / 1024).toFixed(1)} KB stored).`,
			);
			refresh();
		},
		onError: (error) =>
			toast.error(usersErrorMessage(error, "Could not upload that logo.")),
	});
	const remove = useMutation({
		mutationFn: () => removeStockLogo(stockId),
		onSuccess: () => {
			toast.success("Logo removed.");
			refresh();
		},
		onError: (error) =>
			toast.error(usersErrorMessage(error, "Could not remove the logo.")),
	});

	const busy = upload.isPending || remove.isPending;
	const [dragging, setDragging] = useState(false);

	const take = (file: File | undefined) => {
		if (!file) return;
		if (!ACCEPTED.includes(file.type)) {
			toast.error("Use a PNG, JPEG or WebP image.");
			return;
		}
		if (file.size > MAX_BYTES) {
			toast.error("That image is over 8 MB.");
			return;
		}
		upload.mutate(file);
	};

	// The logo is the control: the corner badge says it can be changed, and an
	// image dropped on it uploads straight away.
	const tile = (
		<button
			type="button"
			disabled={busy}
			aria-label={`Change the ${symbol} logo`}
			onClick={logoUrl ? undefined : () => input.current?.click()}
			onDragOver={(event) => {
				event.preventDefault();
				setDragging(true);
			}}
			onDragLeave={() => setDragging(false)}
			onDrop={(event) => {
				event.preventDefault();
				setDragging(false);
				if (!busy) take(event.dataTransfer.files[0]);
			}}
			className={cn(
				"group/logo relative shrink-0 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
				dragging && "ring-2 ring-primary ring-offset-2 ring-offset-background",
			)}
		>
			<StockLogo symbol={symbol} logoUrl={logoUrl} size="lg" />
			<span
				className={cn(
					"absolute inset-0 flex items-center justify-center rounded-2xl bg-black/55 text-white opacity-0 transition-opacity group-hover/logo:opacity-100 group-focus-visible/logo:opacity-100",
					(busy || dragging) && "opacity-100",
				)}
				aria-hidden="true"
			>
				{busy ? <Spinner /> : <ImageUp className="size-5" />}
			</span>
			<span
				className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm"
				aria-hidden="true"
			>
				<Pencil className="size-3" />
			</span>
		</button>
	);

	return (
		<>
			<input
				ref={input}
				type="file"
				accept={ACCEPTED.join(",")}
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
				<DropdownMenu>
					<Tooltip>
						<TooltipTrigger asChild>
							<DropdownMenuTrigger asChild>{tile}</DropdownMenuTrigger>
						</TooltipTrigger>
						<TooltipContent>Change logo</TooltipContent>
					</Tooltip>
					<DropdownMenuContent align="start" className="min-w-44">
						<DropdownMenuGroup>
							<DropdownMenuItem onSelect={() => input.current?.click()}>
								<ImageUp />
								Replace logo
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								onSelect={() => remove.mutate()}
							>
								<ImageOff />
								Remove logo
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			) : (
				<Tooltip>
					<TooltipTrigger asChild>{tile}</TooltipTrigger>
					<TooltipContent>Upload a logo</TooltipContent>
				</Tooltip>
			)}
		</>
	);
}
