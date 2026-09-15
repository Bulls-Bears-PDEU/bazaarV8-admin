export type LeaderboardEntry = {
	id: string;
	name: string;
	image: string | null;
	rank: number;
	net_worth: number;
	// net_worth minus the starting capital, from the backend.
	pnl: number;
	// The same figure as net_worth, under the name older admin code read.
	total_profit: string;
};
