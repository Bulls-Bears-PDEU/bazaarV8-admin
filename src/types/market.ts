export type MarketSentiment = "bullish" | "bearish" | "neutral";

export type MarketState = {
	id: number;
	is_paused: boolean;
	sentiment: MarketSentiment;
	paused_at: string | null;
	updated_at: string;
};

export type StockSnapshot = {
	id: number;
	symbol: string;
	name: string;
	sector: string;
	locked: boolean;
	current_price: number | null;
	reference_price: number | null;
	change: number | null;
	change_pct: number | null;
	window_high: number | null;
	window_low: number | null;
	candle_count: number;
};

export type SectorSnapshot = {
	sector: string;
	stock_count: number;
	advancing: number;
	declining: number;
	change_pct: number | null;
};

export type MarketOverview = {
	state: MarketState;
	generated_at: string;
	window_candles: number;
	index: {
		// The Bazaar index: 100 where the market started, as players see it.
		level: number | null;
		change_pct: number | null;
		basis: "start";
		// The index's move over the window of candles alone.
		window_change_pct: number | null;
		average_price: number | null;
		priced_stocks: number;
	};
	breadth: {
		advancing: number;
		declining: number;
		unchanged: number;
		total: number;
	};
	stocks: StockSnapshot[];
	top_gainers: StockSnapshot[];
	top_losers: StockSnapshot[];
	sectors: SectorSnapshot[];
	activity: {
		trade_count: number;
		traders: number;
		total_volume: number;
		total_value: number;
		buy_volume: number;
		sell_volume: number;
	};
	participants: {
		total_users: number;
		approved_users: number;
		pending_users: number;
		investors: number;
		total_cash: number;
		total_frozen: number;
		holdings_value: number;
		shares_held: number;
		net_worth: number;
	};
	news: {
		released: number;
		scheduled: number;
		next_release_at: string | null;
	};
	ipos: {
		total: number;
		open: number;
		upcoming: number;
		listed: number;
	};
};

/** The Bazaar index now, as calculated by the backend. */
export type IndexSnapshot = {
	level: number | null;
	change_pct: number | null;
	// Stocks above, below and at their starting price.
	advancing: number;
	declining: number;
	unchanged: number;
	priced_stocks: number;
	timestamp: string;
};

export type IndexHistory = {
	points: { timestamp: string; value: number; change_pct: number }[];
	basis?: "window" | "start";
	window_candles: number;
	stock_count: number;
};
