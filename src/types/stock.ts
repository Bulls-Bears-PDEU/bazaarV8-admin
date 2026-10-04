export type Stock = {
	id: number;
	name: string;
	symbol: string;
	sector: string;
	volatility: number;
	created_at: string;
	// Trading halted for this stock. The API returns `locked`; this type used
	// to say `isLocked`, which is why the lock badge always read "Unlocked".
	locked: boolean;
	last_price?: number | null;
	// A backend path such as /stocks/logo/4?v=..., or null until one is uploaded.
	logo_url?: string | null;
	name_tsv: string;
};

export type StockOHLC = {
	id: number;
	stock_id: number;
	open_price: number;
	high_price: number;
	low_price: number;
	close_price: number;
	timestamp: string;
	// The close measured from the starting price. The backend adds it to the
	// candles it sends; it is never sent back.
	change_pct?: number | null;
};

export type StockPrice = {
	price: number;
	indicator?: "up" | "down" | "neutral";
	priceChange?: number;
};
