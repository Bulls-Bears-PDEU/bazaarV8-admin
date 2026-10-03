export type UserStatus = "pending" | "active" | "banned";
export type StatusFilter = UserStatus | "online" | "all";
export type RoleFilter = "all" | "user" | "admin" | "pending";
export type UserSort = "joined" | "name" | "cash" | "net_worth";
export type SortDirection = "asc" | "desc";

export const PAGE_SIZES = [10, 25, 50, 100] as const;

export type AdminUser = {
	id: string;
	name: string;
	email: string;
	image: string | null;
	role: string;
	status: UserStatus;
	ban_reason: string | null;
	ban_expires: string | null;
	created_at: string;
	// Null until a newly approved player confirms their profile.
	onboarded_at: string | null;
	email_verified: boolean;
	cash_balance: number;
	// Marked to the last price by the backend.
	net_worth: number;
	pnl: number;
	online: boolean;
	// Left out of the ranking by an organiser; still plays as normal.
	hidden_from_leaderboard: boolean;
};

export type UserListQuery = {
	search?: string;
	status?: StatusFilter;
	role?: RoleFilter;
	sort?: UserSort;
	direction?: SortDirection;
	page?: number;
	page_size?: number;
};

export type UserList = {
	users: AdminUser[];
	total: number;
	page: number;
	page_size: number;
};

export type UserStats = {
	total: number;
	pending: number;
	active: number;
	banned: number;
	admins: number;
	online: number;
	not_onboarded: number;
};

export type UserPosition = {
	stock_id: number;
	symbol: string;
	name: string;
	side: "long" | "short";
	quantity: number;
	average_price: number;
	last_price: number;
	market_value: number;
	unrealized_pnl: number;
	unrealized_pnl_pct: number;
};

export type UserOrder = {
	id: number;
	symbol: string;
	action: string | null;
	side: string;
	order_type: string;
	quantity: number;
	filled_quantity: number;
	limit_price: number | null;
	average_fill_price: number | null;
	status: string;
	reject_reason: string | null;
	created_at: string;
};

export type UserDetail = {
	user: AdminUser & { last_session_at: string | null };
	money: {
		cash_balance: number;
		frozen_balance: number;
		net_worth: number;
		total_pnl: number;
		return_pct: number;
		unrealized_pnl: number;
		realized_pnl: number;
	};
	rank: { rank: number; total_players: number } | null;
	positions: UserPosition[];
	recent_orders: UserOrder[];
	order_count: number;
};

export type BulkAction = "approve" | "reject" | "ban" | "unban" | "make_admin" | "make_player";

export type BulkResult = { succeeded: number; failed: { id: string; error: string }[] };
