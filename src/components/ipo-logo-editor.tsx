import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageOff, ImageUp } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { removeIpoLogo, uploadIpoLogo } from "#/api/ipos";
import { usersErrorMessage } from "#/api/users";
import { StockLogo } from "#/components/stock-logo";
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";

export const LOGO_ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
// The backend refuses bodies over 8 MB; saying so before the upload is kinder.
export const LOGO_MAX_BYTES = 8 * 1024 * 1024;

/** Null when the file can be uploaded, else why not. */
export const logoFileProblem = (file: File) => {
	if (!LOGO_ACCEPTED.includes(file.type)) return "Use a PNG, JPEG or WebP image.";
	if (file.size > LOGO_MAX_BYTES) return "That image is over 8 MB.";
	return null;
};

/**
 * An IPO's logo with its upload and remove controls. Listing copies it to the
 * new stock, so it only needs setting once.
 */
export function IpoLogoEditor({
	ipoId,
	symbol,
	logoUrl,
}: {
	ipoId: number;
	symbol: string;
	logoUrl: string | null | undefined;
}) {
	const queryClient = useQueryClient();
	const input = useRef<HTMLInputElement>(null);

	const refresh = () =>
		queryClient.invalidateQueries({ queryKey: ["admin-ipos"] });

	const upload = useMutation({
		mutationFn: (file: File) => uploadIpoLogo(ipoId, file),
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
		mutationFn: () => removeIpoLogo(ipoId),
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
					accept={LOGO_ACCEPTED.join(",")}
					className="sr-only"
					tabIndex={-1}
					onChange={(event) => {
						const file = event.target.files?.[0];
						// Cleared so choosing the same file again still fires.
						event.target.value = "";
						if (!file) return;
						const problem = logoFileProblem(file);
						if (problem) {
							toast.error(problem);
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
