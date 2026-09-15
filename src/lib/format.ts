const inr = new Intl.NumberFormat("en-IN", {
	style: "currency",
	currency: "INR",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

// Always two decimals: every player starts at ₹5L, so "₹5L" hides all the
// movement that "₹5.01L" shows.
const inrCompact = new Intl.NumberFormat("en-IN", {
	style: "currency",
	currency: "INR",
	notation: "compact",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

const inrWhole = new Intl.NumberFormat("en-IN", {
	style: "currency",
	currency: "INR",
	maximumFractionDigits: 0,
});

const quantity = new Intl.NumberFormat("en-IN");

const isNumber = (value: number | null | undefined): value is number =>
	typeof value === "number" && Number.isFinite(value);

// A real minus sign lines up with the plus in tabular figures.
const sign = (value: number) => (value > 0 ? "+" : value < 0 ? "−" : "");

export const formatINR = (value: number | null | undefined) =>
	isNumber(value) ? inr.format(value) : "—";

export const formatCompactINR = (value: number | null | undefined) =>
	isNumber(value) ? inrCompact.format(value) : "—";

/** Whole rupees, for chart axes where paise are noise but digits matter. */
export const formatWholeINR = (value: number | null | undefined) =>
	isNumber(value) ? inrWhole.format(value) : "—";

/** "1 player", "3 players". */
export const plural = (count: number, noun: string) =>
	`${quantity.format(count)} ${noun}${count === 1 ? "" : "s"}`;

/** +₹1,234.50 / −₹12.00; no sign on zero. */
export const formatSignedINR = (value: number | null | undefined) =>
	isNumber(value) ? `${sign(value)}${inr.format(Math.abs(value))}` : "—";

export const formatPct = (value: number | null | undefined, digits = 2) =>
	isNumber(value) ? `${sign(value)}${Math.abs(value).toFixed(digits)}%` : "—";

export const formatQty = (value: number | null | undefined) =>
	isNumber(value) ? quantity.format(value) : "—";

export const formatTime = (value: string | Date | null | undefined) =>
	value
		? new Date(value).toLocaleTimeString("en-IN", {
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
			})
		: "—";

export const formatDateTime = (value: string | Date | null | undefined) =>
	value
		? new Date(value).toLocaleString("en-IN", {
				day: "numeric",
				month: "short",
				hour: "2-digit",
				minute: "2-digit",
			})
		: "—";

/** Text colour for a signed value. Market direction is never raw green/red. */
export const trendText = (value: number | null | undefined) =>
	!isNumber(value) || value === 0
		? "text-muted-foreground"
		: value > 0
			? "text-gain"
			: "text-loss";

/** Badge colours for a signed value. */
export const trendBadge = (value: number | null | undefined) =>
	!isNumber(value) || value === 0
		? "bg-muted text-muted-foreground"
		: value > 0
			? "bg-gain-muted text-gain"
			: "bg-loss-muted text-loss";

/** "just now", "4m ago", "2h ago", then a date. */
export const formatRelative = (value: string | Date | null | undefined, now = Date.now()) => {
	if (!value) return "—";
	const seconds = Math.round((now - new Date(value).getTime()) / 1000);
	if (seconds < 45) return "just now";
	if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
	if (seconds < 86_400) return `${Math.round(seconds / 3600)}h ago`;
	return formatDateTime(value);
};
