import { formOptions, useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pen, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	addStockOhlc,
	getAllSectors,
	getStock,
	removeStockLogo,
	updateStock,
	uploadStockLogo,
} from "#/api/stocks";
import { usersErrorMessage } from "#/api/users";
import StockCurrentPrice from "#/components/current-price";
import { type LogoChange, LogoChangePicker } from "#/components/logo-picker";
import { PageHeader } from "#/components/page-header";
import { SectorCombobox } from "#/components/sector-combobox";
import { SectionTitle, Stat } from "#/components/stat";
import { StockLogoEditor } from "#/components/stock-logo-editor";
import StockOhlcTable from "#/components/stock-ohlc-table";
import TVChart from "#/components/tv-chart";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
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
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldSet,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Loading } from "#/components/ui/loading";
import { Spinner } from "#/components/ui/spinner";
import { Switch } from "#/components/ui/switch";
import { STOCK_FIELD_HELP } from "#/lib/stock-field-help";
import type { StockOHLC } from "#/types/stock";

export const Route = createFileRoute("/_admin/stock/$id")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	const queryClient = useQueryClient();
	const stock = useQuery({
		queryKey: ["stock", id],
		queryFn: () => (id ? getStock(id) : Promise.resolve(null)),
	});

	const [isAddRecordDialogOpen, setIsAddRecordDialogOpen] = useState(false);

	const addRecordFormOptions = formOptions({
		defaultValues: {
			open_price: 0,
			high_price: 0,
			low_price: 0,
			close_price: 0,
		} as StockOHLC,
	});

	const addRecordForm = useForm({
		...addRecordFormOptions,
		onSubmit: async ({ value }) => {
			try {
				const ohlcData: StockOHLC = {
					...value,
					stock_id: Number(id),
					timestamp: new Date().toISOString(),
				};
				const result = await addStockOhlc(ohlcData);
				console.log("Adding new OHLC record:", ohlcData);
				console.info("Result from API:", result);
				queryClient.invalidateQueries({ queryKey: ["stock", id] });
				toast.success("OHLC record added successfully!");
				setIsAddRecordDialogOpen(false);
			} catch (error) {
				console.error("Error adding OHLC record:", error);
				toast.error("Failed to add OHLC record. Please try again.");
			}
		},
	});

	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	// Held until Save changes, like the other fields; each opening starts clean.
	const [logoChange, setLogoChange] = useState<LogoChange>(undefined);
	const openEditDialog = (open: boolean) => {
		setIsEditDialogOpen(open);
		if (open) setLogoChange(undefined);
	};
	const allSectors = useQuery({
		queryKey: ["sectors"],
		queryFn: async () => {
			const sectors = await getAllSectors();
			return sectors;
		},
	});
	const editStockFormOptions = formOptions({
		defaultValues: {
			name: stock.data?.name || "",
			symbol: stock.data?.symbol || "",
			sector: stock.data?.sector || "",
			volatility: stock.data?.volatility || 0,
			locked: stock.data?.locked || false,
		},
	});
	const editStockForm = useForm({
		...editStockFormOptions,
		onSubmit: async ({ value }) => {
			try {
				const updatedData = {
					name: value.name,
					symbol: value.symbol,
					sector: value.sector,
					volatility: value.volatility,
					locked: value.locked,
				};
				console.log("Updating stock with data:", updatedData);
				const result = await updateStock(Number(id), updatedData);
				console.info("Result from API:", result);
			} catch (error) {
				console.error("Error updating stock details:", error);
				toast.error("Failed to update stock details. Please try again.");
				return;
			}

			// The details are saved; a failed logo change keeps the dialog open
			// with the change still in it, so saving again retries it.
			let logoSaved = true;
			try {
				if (logoChange) await uploadStockLogo(Number(id), logoChange);
				else if (logoChange === null) await removeStockLogo(Number(id));
			} catch (error) {
				logoSaved = false;
				toast.error(
					usersErrorMessage(
						error,
						"Details saved, but the logo could not be changed.",
					),
				);
			}

			queryClient.invalidateQueries({ queryKey: ["stock", id] });
			// The stock list feeds every StockLogo.
			if (logoChange !== undefined)
				queryClient.invalidateQueries({ queryKey: ["stocks"] });
			// A new sector shows up in every sector list.
			queryClient.invalidateQueries({ queryKey: ["sectors"] });
			if (!logoSaved) return;
			toast.success("Stock details updated successfully!");
			setIsEditDialogOpen(false);
		},
	});

	if (stock.isLoading) {
		return <Loading text="Loading stock..." />;
	}
	return (
		<div className="flex min-w-0 flex-col gap-6">
			<PageHeader
				leading={
					stock.data && (
						<StockLogoEditor
							stockId={stock.data.id}
							symbol={stock.data.symbol}
							logoUrl={stock.data.logo_url}
						/>
					)
				}
				title={stock.data?.name ?? "Stock"}
				description={
					stock.data && (
						<span className="font-mono">
							{stock.data.symbol}
							<span className="font-sans"> · {stock.data.sector}</span>
						</span>
					)
				}
				action={
					<Button variant="outline" onClick={() => openEditDialog(true)}>
						<Pen data-icon="inline-start" />
						Edit details
					</Button>
				}
			/>

			<Card>
				<CardContent className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-5">
					<StockCurrentPrice
						stockId={stock.data ? String(stock.data.id) : ""}
						className="col-span-2 md:col-span-2"
					/>
					<Stat label="Sector" value={stock.data?.sector ?? "—"} />
					<Stat
						label="Volatility"
						value={stock.data ? Number(stock.data.volatility).toFixed(2) : "—"}
						hint="Annualised"
					/>
					<Stat
						label="Trading"
						value={
							stock.data?.locked ? (
								<Badge
									variant="outline"
									className="border-loss/30 bg-loss-muted font-sans text-loss"
								>
									Halted
								</Badge>
							) : (
								<Badge
									variant="outline"
									className="border-gain/30 bg-gain-muted font-sans text-gain"
								>
									Open
								</Badge>
							)
						}
						hint={
							stock.data &&
							`Listed ${new Date(stock.data.created_at).toLocaleDateString("en-IN")}`
						}
					/>
				</CardContent>
			</Card>

			{stock.data && (
				<TVChart
					key={stock.data.id}
					stockId={String(stock.data.id)}
					symbol={stock.data.symbol}
				/>
			)}

			<section className="flex min-w-0 flex-col gap-3">
				<SectionTitle
					action={
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsAddRecordDialogOpen(true)}
						>
							<Plus data-icon="inline-start" />
							Add record
						</Button>
					}
				>
					Price history
				</SectionTitle>
				<StockOhlcTable stockId={stock.data ? String(stock.data.id) : ""} />
			</section>
			<Dialog open={isEditDialogOpen} onOpenChange={openEditDialog}>
				<DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							editStockForm.handleSubmit();
						}}
					>
						<DialogHeader>
							<DialogTitle>Edit stock</DialogTitle>
							<DialogDescription>
								Changes reach players as soon as you save.
							</DialogDescription>
						</DialogHeader>
						<FieldGroup className="my-4">
							<FieldSet>
								<FieldGroup>
									{stock.data && (
										<Field>
											<FieldLabel>Logo</FieldLabel>
											<LogoChangePicker
												symbol={stock.data.symbol}
												currentUrl={stock.data.logo_url}
												change={logoChange}
												onChange={setLogoChange}
											/>
											<FieldDescription>
												{STOCK_FIELD_HELP.logo}
											</FieldDescription>
										</Field>
									)}
									<editStockForm.Field name="name">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel htmlFor="edit-stock-name">Name</FieldLabel>
												<Input
													id="edit-stock-name"
													value={state.value}
													onChange={(e) => handleChange(e.target.value)}
													onBlur={handleBlur}
												/>
												<FieldDescription>
													{STOCK_FIELD_HELP.name}
												</FieldDescription>
											</Field>
										)}
									</editStockForm.Field>
									<div className="grid gap-4 sm:grid-cols-2">
										<editStockForm.Field name="symbol">
											{({ state, handleChange, handleBlur }) => (
												<Field>
													<FieldLabel htmlFor="edit-stock-symbol">
														Symbol
													</FieldLabel>
													<Input
														id="edit-stock-symbol"
														maxLength={10}
														value={state.value}
														onChange={(e) => handleChange(e.target.value)}
														onBlur={handleBlur}
													/>
													<FieldDescription>
														{STOCK_FIELD_HELP.symbol}
													</FieldDescription>
												</Field>
											)}
										</editStockForm.Field>
										<editStockForm.Field name="sector">
											{({ state, handleChange, handleBlur }) => (
												<Field>
													<FieldLabel htmlFor="edit-stock-sector">
														Sector
													</FieldLabel>
													<SectorCombobox
														id="edit-stock-sector"
														value={state.value}
														onChange={handleChange}
														onBlur={handleBlur}
														sectors={allSectors.data ?? []}
													/>
													<FieldDescription>
														{STOCK_FIELD_HELP.sector}
													</FieldDescription>
												</Field>
											)}
										</editStockForm.Field>
									</div>
									<editStockForm.Field name="volatility">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel htmlFor="edit-stock-volatility">
													Volatility
												</FieldLabel>
												<Input
													id="edit-stock-volatility"
													type="number"
													step="0.01"
													min="0.05"
													max="1"
													value={state.value}
													onChange={(e) => handleChange(Number(e.target.value))}
													onBlur={handleBlur}
												/>
												<FieldDescription>
													{STOCK_FIELD_HELP.volatility}
												</FieldDescription>
											</Field>
										)}
									</editStockForm.Field>
									<editStockForm.Field name="locked">
										{({ state, handleChange }) => (
											<Field orientation="horizontal">
												<FieldContent>
													<FieldLabel htmlFor="edit-stock-locked">
														Lock trading
													</FieldLabel>
													<FieldDescription>
														{STOCK_FIELD_HELP.lock}
													</FieldDescription>
												</FieldContent>
												<Switch
													id="edit-stock-locked"
													checked={state.value}
													onCheckedChange={(value) => handleChange(!!value)}
												/>
											</Field>
										)}
									</editStockForm.Field>
								</FieldGroup>
							</FieldSet>
						</FieldGroup>
						<DialogFooter>
							<FieldGroup>
								<editStockForm.Subscribe
									selector={(state) => [state.canSubmit, state.isSubmitting]}
								>
									{([canSubmit, isSubmitting]) => (
										<Button type="submit" disabled={!canSubmit || isSubmitting}>
											{isSubmitting && <Spinner className="mr-2" />}
											{isSubmitting ? "Saving..." : "Save Changes"}
										</Button>
									)}
								</editStockForm.Subscribe>
								<DialogTrigger asChild>
									<Button type="button" variant="outline" className="w-full">
										Cancel
									</Button>
								</DialogTrigger>
							</FieldGroup>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
			<Dialog
				open={isAddRecordDialogOpen}
				onOpenChange={setIsAddRecordDialogOpen}
			>
				{/* Implement the dialog for adding/editing OHLC records here */}
				<DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							addRecordForm.handleSubmit();
						}}
					>
						<DialogHeader>
							<DialogTitle>Add OHLC Record</DialogTitle>
							<DialogDescription>
								This will add a new OHLC record for the stock with the current
								timestamp. Please ensure that the data is accurate before
								submitting.
							</DialogDescription>
						</DialogHeader>
						<FieldGroup className="my-4">
							<FieldSet>
								<FieldGroup>
									<addRecordForm.Field name="open_price">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Open Price</FieldLabel>
												<Input
													type="number"
													step="0.01"
													value={state.value}
													onChange={(e) => handleChange(Number(e.target.value))}
													onBlur={handleBlur}
												/>
											</Field>
										)}
									</addRecordForm.Field>
									<addRecordForm.Field name="high_price">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>High Price</FieldLabel>
												<Input
													type="number"
													step="0.01"
													value={state.value}
													onChange={(e) => handleChange(Number(e.target.value))}
													onBlur={handleBlur}
												/>
											</Field>
										)}
									</addRecordForm.Field>
									<addRecordForm.Field name="low_price">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Low Price</FieldLabel>
												<Input
													type="number"
													step="0.01"
													value={state.value}
													onChange={(e) => handleChange(Number(e.target.value))}
													onBlur={handleBlur}
												/>
											</Field>
										)}
									</addRecordForm.Field>
									<addRecordForm.Field name="close_price">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Close Price</FieldLabel>
												<Input
													type="number"
													step="0.01"
													value={state.value}
													onChange={(e) => handleChange(Number(e.target.value))}
													onBlur={handleBlur}
												/>
											</Field>
										)}
									</addRecordForm.Field>
								</FieldGroup>
							</FieldSet>
						</FieldGroup>
						<DialogFooter>
							<FieldGroup>
								<addRecordForm.Subscribe
									selector={(state) => [state.canSubmit, state.isSubmitting]}
								>
									{([canSubmit, isSubmitting]) => (
										<Button type="submit" disabled={!canSubmit || isSubmitting}>
											{isSubmitting && <Spinner className="mr-2" />}
											{isSubmitting ? "Adding..." : "Add Record"}
										</Button>
									)}
								</addRecordForm.Subscribe>

								<DialogTrigger asChild>
									<Button type="button" variant="outline" className="w-full">
										Cancel
									</Button>
								</DialogTrigger>
							</FieldGroup>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
