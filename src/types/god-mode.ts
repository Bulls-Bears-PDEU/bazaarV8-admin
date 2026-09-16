export type GodModePosition = {
	stock_id: number;
	symbol: string;
	name: string;
	// Negative for a short.
	volume: number;
	average_price: number;
	last_price: number | null;
	margin_locked: number;
};

export type GodModeOrder = {
	id: number;
	stock_id: number;
	symbol: string;
	action: "buy" | "sell" | "short" | "cover" | null;
	side: "buy" | "sell";
	quantity: number;
	filled_quantity: number;
	limit_price: number | null;
	created_at: string;
};

/** Everything god mode can act on for one player. */
export type GodModeView = {
	user: { id: string; name: string; role: string };
	cash_balance: number;
	frozen_balance: number;
	positions: GodModePosition[];
	open_orders: GodModeOrder[];
};

export type AdminAction = {
	id: number;
	admin_id: string | null;
	admin_name: string;
	action: string;
	target_user_id: string | null;
	target_user_name: string | null;
	summary: string;
	details: Record<string, unknown>;
	created_at: string;
};

export type AdminActionList = {
	actions: AdminAction[];
	total: number;
	page: number;
	page_size: number;
};
