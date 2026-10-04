import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { EyeOff, ImageUp, Megaphone, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	getAdsAdmin,
	removeAd,
	setAdsEnabled,
	updateAd,
	uploadAdImage,
} from "#/api/ads";
import { usersErrorMessage } from "#/api/users";
import { ErrorState } from "#/components/error-state";
import { PageHeader } from "#/components/page-header";
import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import { Spinner } from "#/components/ui/spinner";
import { Switch } from "#/components/ui/switch";
import useSocket from "#/hooks/use-socket";
import { mediaUrl } from "#/lib/media";
import { cn } from "#/lib/utils";
import type { AdSlot } from "#/types/ads";

export const Route = createFileRoute("/_admin/ads")({
	component: RouteComponent,
});

const ADS_KEY = ["ads"] as const;

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
// The backend refuses bodies over 8 MB; saying so before the upload is kinder.
const MAX_BYTES = 8 * 1024 * 1024;

function RouteComponent() {
	const queryClient = useQueryClient();
	const socket = useSocket();
	const ads = useQuery({ queryKey: ADS_KEY, queryFn: getAdsAdmin });

	// Another organiser changed an ad: show it here too.
	useEffect(() => {
		if (!socket) return;
		const refresh = () => queryClient.invalidateQueries({ queryKey: ADS_KEY });
		socket.on("adsChanged", refresh);
		return () => {
			socket.off("adsChanged", refresh);
		};
	}, [socket, queryClient]);

	const toggle = useMutation({
		mutationFn: setAdsEnabled,
		onSuccess: ({ enabled }) => {
			toast.success(
				enabled ? "Ads are showing to players." : "All ads are hidden.",
			);
			queryClient.invalidateQueries({ queryKey: ADS_KEY });
		},
		onError: (error) =>
			toast.error(usersErrorMessage(error, "Could not change that.")),
	});

	const enabled = ads.data?.enabled ?? true;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Ads"
				description="Upload sponsor ads for the spaces in the player app. Players see changes straight away."
				action={
					<Field orientation="horizontal">
						<Switch
							id="ads-enabled"
							checked={enabled}
							disabled={!ads.data || toggle.isPending}
							onCheckedChange={(checked) => toggle.mutate(checked)}
						/>
						<FieldLabel htmlFor="ads-enabled">Show ads to players</FieldLabel>
					</Field>
				}
			/>

			{ads.data && !enabled && (
				<Alert>
					<EyeOff />
					<AlertTitle>All ads are hidden from players</AlertTitle>
					<AlertDescription>
						No ads or empty ad spaces show in the player app. Your ads below are
						kept as they are.
					</AlertDescription>
					<AlertAction>
						<Button
							size="sm"
							variant="outline"
							disabled={toggle.isPending}
							onClick={() => toggle.mutate(true)}
						>
							{toggle.isPending && <Spinner data-icon="inline-start" />}
							Show ads
						</Button>
					</AlertAction>
				</Alert>
			)}

			{ads.isError ? (
				<ErrorState error={ads.error} reset={() => ads.refetch()} />
			) : !ads.data ? (
				<div className="grid gap-4 lg:grid-cols-2">
					{Array.from({ length: 4 }, (_, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
						<Skeleton key={index} className="h-96" />
					))}
				</div>
			) : (
				<div className="grid gap-4 lg:grid-cols-2">
					{ads.data.slots.map((slot) => (
						<AdSlotCard key={slot.slot} slot={slot} hidden={!enabled} />
					))}
				</div>
			)}
		</div>
	);
}

function AdSlotCard({ slot, hidden }: { slot: AdSlot; hidden: boolean }) {
	const queryClient = useQueryClient();
	const input = useRef<HTMLInputElement>(null);
	const ad = slot.ad;

	const [sponsor, setSponsor] = useState(ad?.sponsor ?? "");
	const [link, setLink] = useState(ad?.link_url ?? "");
	const [dragging, setDragging] = useState(false);
	const [confirmRemove, setConfirmRemove] = useState(false);

	// Follow the saved values when they change underneath (a save, another organiser).
	useEffect(() => {
		setSponsor(ad?.sponsor ?? "");
		setLink(ad?.link_url ?? "");
	}, [ad?.sponsor, ad?.link_url]);

	const refresh = () => queryClient.invalidateQueries({ queryKey: ADS_KEY });

	const upload = useMutation({
		mutationFn: (file: File) => uploadAdImage(slot.slot, file),
		onSuccess: (result) => {
			toast.success(
				`Ad image saved (${(result.bytes / 1024).toFixed(1)} KB stored).`,
			);
			refresh();
		},
		onError: (error) =>
			toast.error(usersErrorMessage(error, "Could not upload that image.")),
	});
	const save = useMutation({
		mutationFn: () =>
			updateAd(slot.slot, { sponsor, link_url: link.trim() || null }),
		onSuccess: () => {
			toast.success("Ad saved.");
			refresh();
		},
		onError: (error) =>
			toast.error(usersErrorMessage(error, "Could not save the ad.")),
	});
	const setActive = useMutation({
		mutationFn: (is_active: boolean) => updateAd(slot.slot, { is_active }),
		onSuccess: (saved) => {
			toast.success(saved.is_active ? "Ad is live." : "Ad paused.");
			refresh();
		},
		onError: (error) =>
			toast.error(usersErrorMessage(error, "Could not change the ad.")),
	});
	const remove = useMutation({
		mutationFn: () => removeAd(slot.slot),
		onSuccess: () => {
			toast.success("Ad removed.");
			setConfirmRemove(false);
			refresh();
		},
		onError: (error) =>
			toast.error(usersErrorMessage(error, "Could not remove the ad.")),
	});

	const busy =
		upload.isPending ||
		save.isPending ||
		setActive.isPending ||
		remove.isPending;
	const dirty =
		!!ad &&
		(sponsor.trim() !== ad.sponsor || (link.trim() || null) !== ad.link_url);

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

	const status = !ad
		? { label: "Empty", variant: "outline" as const }
		: !ad.is_active
			? { label: "Paused", variant: "secondary" as const }
			: hidden
				? { label: "Hidden", variant: "secondary" as const }
				: { label: "Live", variant: "default" as const };

	return (
		<Card>
			<CardHeader>
				<CardTitle>{slot.label}</CardTitle>
				<CardDescription>
					{slot.width} × {slot.height} ·{" "}
					<span className="font-mono text-xs">{slot.slot}</span>
				</CardDescription>
				<CardAction>
					<Badge variant={status.variant}>{status.label}</Badge>
				</CardAction>
			</CardHeader>

			<CardContent className="flex flex-col gap-5">
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
				{/* The preview is the slot at its real proportions, and a drop target. */}
				<button
					type="button"
					disabled={busy}
					aria-label={
						ad
							? `Replace the ${slot.label} image`
							: `Upload an image for ${slot.label}`
					}
					onClick={() => input.current?.click()}
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
					style={{
						aspectRatio: `${slot.width} / ${slot.height}`,
						maxWidth: slot.width,
					}}
					className={cn(
						"group/ad relative mx-auto w-full overflow-hidden rounded-lg border bg-muted/30 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
						!ad && "border-dashed",
						dragging &&
							"ring-2 ring-primary ring-offset-2 ring-offset-background",
					)}
				>
					{ad ? (
						<img
							src={mediaUrl(ad.image_url)}
							alt={ad.sponsor ? `Ad from ${ad.sponsor}` : "Current ad"}
							className={cn(
								"size-full object-contain",
								!ad.is_active && "opacity-50",
							)}
						/>
					) : (
						<span className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center text-xs text-muted-foreground">
							<Megaphone className="size-4 opacity-60" aria-hidden="true" />
							Drop an image here or click to choose one
						</span>
					)}
					<span
						className={cn(
							"absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 transition-opacity group-hover/ad:opacity-100 group-focus-visible/ad:opacity-100",
							(busy || dragging) && "opacity-100",
						)}
						aria-hidden="true"
					>
						{upload.isPending ? <Spinner /> : <ImageUp className="size-5" />}
					</span>
				</button>

				<FieldGroup>
					<Field>
						<FieldLabel htmlFor={`${slot.slot}-sponsor`}>Sponsor</FieldLabel>
						<Input
							id={`${slot.slot}-sponsor`}
							value={sponsor}
							maxLength={100}
							disabled={!ad || busy}
							placeholder="Acme Corp"
							onChange={(event) => setSponsor(event.target.value)}
						/>
						<FieldDescription>
							Read out to screen readers as "Ad from …".
						</FieldDescription>
					</Field>
					<Field>
						<FieldLabel htmlFor={`${slot.slot}-link`}>Link</FieldLabel>
						<Input
							id={`${slot.slot}-link`}
							type="url"
							inputMode="url"
							value={link}
							disabled={!ad || busy}
							placeholder="https://example.com"
							onChange={(event) => setLink(event.target.value)}
						/>
						<FieldDescription>
							Opens in a new tab. Leave empty for an image that is not a link.
						</FieldDescription>
					</Field>
					<Field orientation="horizontal">
						<Switch
							id={`${slot.slot}-active`}
							checked={ad?.is_active ?? false}
							disabled={!ad || busy}
							onCheckedChange={(checked) => setActive.mutate(checked)}
						/>
						<FieldLabel htmlFor={`${slot.slot}-active`}>Live</FieldLabel>
					</Field>
				</FieldGroup>
			</CardContent>

			<CardFooter className="flex flex-wrap gap-2">
				<Button
					variant="outline"
					disabled={busy}
					onClick={() => input.current?.click()}
				>
					<ImageUp data-icon="inline-start" />
					{ad ? "Replace image" : "Upload image"}
				</Button>
				<Button disabled={!dirty || busy} onClick={() => save.mutate()}>
					{save.isPending && <Spinner data-icon="inline-start" />}
					Save
				</Button>
				{ad && (
					<Button
						variant="destructive"
						className="ml-auto"
						disabled={busy}
						onClick={() => setConfirmRemove(true)}
					>
						<Trash2 data-icon="inline-start" />
						Remove
					</Button>
				)}
			</CardFooter>

			<Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Remove this ad?</DialogTitle>
						<DialogDescription>
							The image, sponsor and link for {slot.label} are deleted. Players
							see the empty ad space until you upload a new one.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">Cancel</Button>
						</DialogClose>
						<Button
							variant="destructive"
							disabled={remove.isPending}
							onClick={() => remove.mutate()}
						>
							{remove.isPending && <Spinner data-icon="inline-start" />}
							Remove ad
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
