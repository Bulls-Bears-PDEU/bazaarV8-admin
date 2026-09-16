import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageOff, ImageUp } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { removeStockLogo, uploadStockLogo } from "#/api/stocks";
import { usersErrorMessage } from "#/api/users";
import { StockLogo } from "#/components/stock-logo";
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
// The backend refuses bodies over 8 MB; saying so before the upload is kinder.
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * A stock's logo with its upload and remove controls. The file goes to the
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

	return (
		<div className="flex items-center gap-3">
			<StockLogo symbol={symbol} logoUrl={logoUrl} size="lg" />
			<div className="flex flex-col gap-1.5">
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
					}}
				/>
				<div className="flex gap-1.5">
					<Button
						size="xs"
						variant="outline"
						disabled={busy}
						onClick={() => input.current?.click()}
					>
						{upload.isPending ? (
							<Spinner data-icon="inline-start" />
						) : (
							<ImageUp data-icon="inline-start" />
						)}
						{logoUrl ? "Replace logo" : "Upload logo"}
					</Button>
					{logoUrl && (
						<Button
							size="xs"
							variant="ghost"
							disabled={busy}
							onClick={() => remove.mutate()}
						>
							<ImageOff data-icon="inline-start" />
							Remove
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
