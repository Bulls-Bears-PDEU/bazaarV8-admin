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
};

export type StockPrice = {
	price: number;
	indicator?: "up" | "down" | "neutral";
	priceChange?: number;
};
