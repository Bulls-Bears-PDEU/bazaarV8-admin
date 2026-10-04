import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Lock, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { getAllStocks } from "#/api/stocks";
import { StockLogo } from "#/components/stock-logo";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { cn } from "#/lib/utils";

const MAX_RESULTS = 8;

/**
 * Jump to a stock's admin page (Ctrl+K), as in the player app. Filters the
 * stock list in the browser: symbol prefix matches first, then name and sector.
 */
export function StockSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
	const navigate = useNavigate();
	// The same query the stocks and IPO pages share.
	const stocks = useQuery({ queryKey: ["stocks"], queryFn: () => getAllStocks(), enabled: open });
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(0);

	const results = useMemo(() => {
		const q = query.trim().toLowerCase();
		const all = stocks.data ?? [];
		if (!q) return all.slice(0, MAX_RESULTS);
		const bySymbol = all.filter((s) => s.symbol.toLowerCase().startsWith(q));
		const byName = all.filter(
			(s) =>
				!s.symbol.toLowerCase().startsWith(q) &&
				(s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q)),
		);
		return [...bySymbol, ...byName].slice(0, MAX_RESULTS);
	}, [stocks.data, query]);

	const openStock = (stockId: number) => {
		onOpenChange(false);
		setQuery("");
		navigate({ to: "/stock/$id", params: { id: String(stockId) } });
	};

	const onKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setActive((i) => Math.min(i + 1, results.length - 1));
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			setActive((i) => Math.max(i - 1, 0));
		} else if (event.key === "Enter" && results[active]) {
			event.preventDefault();
			openStock(results[active].id);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				onOpenChange(next);
				if (!next) setQuery("");
			}}
		>
			<DialogContent className="top-[15%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
				<DialogHeader className="sr-only">
					<DialogTitle>Jump to a stock</DialogTitle>
					<DialogDescription>Find a stock by symbol, name or sector.</DialogDescription>
				</DialogHeader>
				<div className="flex items-center gap-2 border-b px-3">
					<Search className="size-4 shrink-0 text-muted-foreground" />
					<input
						// biome-ignore lint/a11y/noAutofocus: the dialog exists to type into
						autoFocus
						value={query}
						onChange={(event) => {
							setQuery(event.target.value);
							setActive(0);
						}}
						onKeyDown={onKeyDown}
						placeholder="Symbol, company or sector"
						className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
						aria-label="Search stocks"
					/>
				</div>
				<ul className="max-h-[min(20rem,calc(85svh-6rem))] overflow-y-auto p-1" aria-label="Matching stocks">
					{stocks.isPending && (
						<li className="px-3 py-6 text-center text-sm text-muted-foreground">Loading stocks…</li>
					)}
					{!stocks.isPending && results.length === 0 && (
						<li className="px-3 py-6 text-center text-sm text-muted-foreground">No stocks match “{query}”.</li>
					)}
					{results.map((stock, index) => (
						<li key={stock.id}>
							<button
								type="button"
								onClick={() => openStock(stock.id)}
								onMouseMove={() => setActive(index)}
								aria-current={index === active ? "true" : undefined}
								className={cn(
									"flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm",
									index === active && "bg-accent text-accent-foreground",
								)}
							>
								<StockLogo symbol={stock.symbol} />
								<span className="w-20 shrink-0 font-mono font-medium">{stock.symbol}</span>
								<span className="min-w-0 flex-1 truncate text-muted-foreground">{stock.name}</span>
								{stock.locked && <Lock className="size-3.5 text-muted-foreground" aria-label="Trading halted" />}
								<span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{stock.sector}</span>
							</button>
						</li>
					))}
				</ul>
			</DialogContent>
		</Dialog>
	);
}
