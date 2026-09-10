import { formOptions, useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowDown,
	ArrowDownUp,
	ArrowUp,
	IndianRupee,
	Landmark,
	Pen,
	Plus,
	TrendingDown,
	TrendingUp,
	TrendingUpDown,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	addStockOhlc,
	getAllSectors,
	getStock,
	getStockOhlc,
	getStockPrice,
	updateStock,
} from "#/api/stocks";
import StockCurrentPrice from "#/components/current-price";
import StockOhlcTable from "#/components/stock-ohlc-table";
import TVChart from "#/components/tv-chart";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
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
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import { Spinner } from "#/components/ui/spinner";
import { Switch } from "#/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import useSocket from "#/hooks/use-socket";
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
			isLocked: stock.data?.isLocked || false,
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
					isLocked: value.isLocked,
				};
				console.log("Updating stock with data:", updatedData);
				const result = await updateStock(Number(id), updatedData);
				console.info("Result from API:", result);
				queryClient.invalidateQueries({ queryKey: ["stock", id] });
				toast.success("Stock details updated successfully!");
				setIsEditDialogOpen(false);
			} catch (error) {
				console.error("Error updating stock details:", error);
				toast.error("Failed to update stock details. Please try again.");
			}
		},
	});

	if (stock.isLoading) {
		return <Loading text="Loading stock..." />;
	}
	return (
		<div className="p-4 w-full max-w-full overflow-hidden">
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-4">
					<Landmark className="p-4 bg-indigo-900 size-20 rounded-md" />
					<div className="flex items-start flex-col gap-2">
						<h1 className="text-3xl font-bold flex items-center">
							{stock.data?.name}
						</h1>
						<Badge variant="default">{stock.data?.symbol}</Badge>
					</div>
				</div>
				<StockCurrentPrice stockId={String(stock.data?.id) || ""} />
			</div>
			<div className="flex items-stretch gap-4 mb-4">
				<div className="rounded-md bg-secondary p-4 w-full">
					<p>
						<span className="font-semibold">Sector:</span> {stock.data?.sector}
					</p>
					<p>
						<span className="font-semibold">Volatility:</span>{" "}
						{stock.data?.volatility}
					</p>
					<p>
						<span className="font-semibold">Created At:</span>{" "}
						{new Date(stock.data?.created_at || "").toLocaleString()}
					</p>
					<p>
						<span className="font-semibold">Status:</span>{" "}
						{stock.data?.isLocked ? (
							<Badge variant="destructive">Locked</Badge>
						) : (
							<Badge variant="default">Unlocked</Badge>
						)}
					</p>
				</div>
				<div className="self-stretch aspect-square shrink-0">
					<Button
						onClick={() => setIsEditDialogOpen(true)}
						className="h-full w-full"
					>
						<Pen />
					</Button>
				</div>
			</div>
			<div className="w-full">
				<TVChart stockId={String(stock.data?.id) || ""} />
				<FieldDescription className="mt-2 ml-2">
					The chart above shows the historical price data for this stock,
					including the open, high, low, and close prices for each time period.
				</FieldDescription>
			</div>

			<div className="mt-8 max-w-full">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-2xl font-bold">Historical Price Data</h2>
					<Button size="lg" onClick={() => setIsAddRecordDialogOpen(true)}>
						Add Record <Plus />
					</Button>
				</div>
				<StockOhlcTable stockId={String(stock.data?.id) || ""} />
			</div>
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				{/* Implement the dialog for editing stock details here */}
				<DialogContent>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							editStockForm.handleSubmit();
						}}
					>
						<DialogHeader>
							<DialogTitle>Edit Stock Details</DialogTitle>
							<DialogDescription>
								Update the stock information below. Make sure to save your
								changes before closing the dialog.
							</DialogDescription>
						</DialogHeader>
						<FieldGroup className="my-4">
							<FieldSet>
								<FieldGroup>
									<editStockForm.Field name="name">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Name</FieldLabel>
												<Input
													value={state.value}
													onChange={(e) => handleChange(e.target.value)}
													onBlur={handleBlur}
												/>
											</Field>
										)}
									</editStockForm.Field>
									<editStockForm.Field name="symbol">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Symbol</FieldLabel>
												<Input
													value={state.value}
													onChange={(e) => handleChange(e.target.value)}
													onBlur={handleBlur}
												/>
											</Field>
										)}
									</editStockForm.Field>
									<editStockForm.Field name="sector">
										{({ state, handleChange }) => (
											<Field>
												<FieldLabel>Sector</FieldLabel>
												<Select
													value={state.value}
													onValueChange={(value) => handleChange(value)}
												>
													<SelectTrigger className="w-[180px]">
														<SelectValue placeholder="Sector" />
													</SelectTrigger>
													<SelectContent>
														<SelectGroup>
															{allSectors.data?.map((sector) => (
																<SelectItem key={sector} value={sector}>
																	{sector}
																</SelectItem>
															))}
														</SelectGroup>
													</SelectContent>
												</Select>
											</Field>
										)}
									</editStockForm.Field>
									<editStockForm.Field name="volatility">
										{({ state, handleChange, handleBlur }) => (
											<Field>
												<FieldLabel>Volatility</FieldLabel>
												<Input
													type="number"
													step="0.01"
													value={state.value}
													onChange={(e) => handleChange(Number(e.target.value))}
													onBlur={handleBlur}
												/>
											</Field>
										)}
									</editStockForm.Field>
									<editStockForm.Field name="isLocked">
										{({ state, handleChange }) => (
											<Field orientation="horizontal">
												<FieldContent>
													<FieldLabel>Lock</FieldLabel>
													<FieldDescription>
														Locking the stock prevents further edits
													</FieldDescription>
												</FieldContent>
												<Switch
													checked={state.value}
													onCheckedChange={(value) => handleChange(!!value)}
												>
													{state.value ? "Locked" : "Unlocked"}
												</Switch>
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
				<DialogContent>
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
