/**
 * What each stock field means, shown under it in the Add stock and Edit stock
 * dialogs so both explain a field the same way.
 */
export const STOCK_FIELD_HELP = {
	name: "The full company name. Players see it on the stock's page and can search by it.",
	symbol:
		"The short ticker shown everywhere prices are, in capitals. Up to 10 characters, and no two stocks can share one.",
	sector:
		"Pick one or type a new name to start a sector. Stocks in the same sector move together, and players' allocation charts group and colour holdings by sector.",
	volatility:
		"How much the price jumps around. In a typical hour of play a stock moves by about a tenth of this: 0.25 is roughly 2.5% an hour, 0.5 roughly 5%. Steady stocks sit at 0.15 to 0.25, lively ones at 0.4 or more. Between 0.05 and 1.",
	initialPrice:
		'The price in rupees it starts trading at. Every "since start" change players see is measured from it.',
	lock: "Halts buying, selling, shorting and covering in this stock. Its price keeps moving, and waiting limit orders fill once it is unlocked.",
	logo: "Shown next to the stock wherever players see it. A new logo replaces the old one when you save.",
} as const;
