import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getIpoDemand, runIpoAllotment } from "#/api/ipos";
import { usersErrorMessage } from "#/api/users";
import { Stat } from "#/components/stat";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
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
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#/components/ui/input-group";
import { Skeleton } from "#/components/ui/skeleton";
import { Spinner } from "#/components/ui/spinner";
import { formatINR, formatQty } from "#/lib/format";
import type { Ipo } from "#/types/ipo";

/**
 * Runs an IPO's allotment: picks the price every allottee pays, shares the
 * lots out among the bids at or above it, and refunds everything else. The
 * backend does all of it and refuses a second run, so this only collects the
 * price and says what will happen.
 */
export function IpoAllotDialog({
	ipo,
	onClose,
}: {
	ipo: Ipo | null;
	onClose: () => void;
}) {
	return (
		<Dialog open={ipo !== null} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-lg">
				{ipo && <AllotBody key={ipo.id} ipo={ipo} onClose={onClose} />}
			</DialogContent>
		</Dialog>
	);
}

function AllotBody({ ipo, onClose }: { ipo: Ipo; onClose: () => void }) {
	const queryClient = useQueryClient();
	const [price, setPrice] = useState(String(Number(ipo.max_price)));

	const demand = useQuery({
		queryKey: ["admin-ipos", "demand", ipo.id],
		queryFn: () => getIpoDemand(ipo.id),
	});

	const allot = useMutation({
		mutationFn: () =>
			runIpoAllotment(ipo.id, price.trim() === "" ? undefined : Number(price)),
		onSuccess: async (result) => {
			toast.success(
				result.allottees > 0
					? `${formatQty(result.allotted_lots)} lots allotted to ${formatQty(result.allottees)} player${result.allottees === 1 ? "" : "s"} at ${formatINR(result.allotment_price)}. ${formatINR(result.refunded)} refunded.`
					: `Allotment done at ${formatINR(result.allotment_price)}. Nobody was allotted shares${result.refunded > 0 ? `; ${formatINR(result.refunded)} refunded` : ""}.`,
			);
			await queryClient.invalidateQueries({ queryKey: ["admin-ipos"] });
			onClose();
		},
		onError: (error) =>
			toast.error(usersErrorMessage(error, "Could not run the allotment.")),
	});

	const summary = demand.data;

	return (
		<form
			className="flex flex-col gap-6"
			onSubmit={(event) => {
				event.preventDefault();
				allot.mutate();
			}}
		>
			<DialogHeader>
				<DialogTitle>Run allotment for {ipo.symbol}</DialogTitle>
				<DialogDescription>
					Decides who gets shares. Players then see their result, and
					everything they don't get is refunded to their cash. After this,
					list the IPO to start trading.
				</DialogDescription>
			</DialogHeader>

			<div className="grid grid-cols-3 gap-4 rounded-xl border p-4">
				{demand.isPending ? (
					<>
						<Skeleton className="h-10" />
						<Skeleton className="h-10" />
						<Skeleton className="h-10" />
					</>
				) : summary ? (
					<>
						<Stat label="Applications" value={formatQty(summary.applications)} />
						<Stat
							label="Lots asked for"
							value={formatQty(summary.lots_applied)}
							hint={`of ${formatQty(summary.lots_offered)} offered`}
						/>
						<Stat
							label="Subscribed"
							value={`${(summary.subscription_rate ?? 0).toFixed(2)}×`}
						/>
					</>
				) : (
					<p className="col-span-3 text-sm text-muted-foreground">
						Could not load the demand for this IPO.
					</p>
				)}
			</div>

			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="allotment-price">Allotment price</FieldLabel>
					<InputGroup>
						<InputGroupAddon>₹</InputGroupAddon>
						<InputGroupInput
							id="allotment-price"
							type="number"
							inputMode="decimal"
							step="0.01"
							min={ipo.min_price}
							max={ipo.max_price}
							value={price}
							onChange={(event) => setPrice(event.target.value)}
							className="font-mono tabular-nums"
						/>
					</InputGroup>
					<FieldDescription>
						What every allotted player pays per share, between{" "}
						{formatINR(ipo.min_price)} and {formatINR(ipo.max_price)}. Bids
						below it get nothing; anyone who bid more pays this price and
						gets the difference back. If players asked for more lots than
						are offered, each gets a share in proportion to what they asked
						for.
					</FieldDescription>
					<FieldDescription>
						{Number(ipo.listing_price) > 0
							? `It then lists at the ${formatINR(ipo.listing_price)} listing price you set.`
							: "No listing price was set, so it lists at this price too."}
					</FieldDescription>
				</Field>
			</FieldGroup>

			<Alert variant="warning">
				<TriangleAlert />
				<AlertTitle>Allotment runs once</AlertTitle>
				<AlertDescription>
					It can't be undone or re-run with a different price.
				</AlertDescription>
			</Alert>

			<DialogFooter>
				<Button type="button" variant="outline" onClick={onClose}>
					Cancel
				</Button>
				<Button type="submit" disabled={allot.isPending || price.trim() === ""}>
					{allot.isPending && <Spinner data-icon="inline-start" />}
					Run allotment
				</Button>
			</DialogFooter>
		</form>
	);
}
