export type Stock = {
	id: 1;
	symbol: string;
	name: string;
	// TODO: Remove price and volume from stock and move to a separate table
	price: number;
	volume: number;
	drift: number;
	volatility: number;
	sector: string;
	created_at: Date;
	isLocked: boolean;
};
