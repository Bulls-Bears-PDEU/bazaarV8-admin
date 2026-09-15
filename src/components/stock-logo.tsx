import { cn } from "#/lib/utils";

const SIZES = {
	xs: "size-5 rounded-[5px] text-[8px]",
	sm: "size-7 rounded-md text-[10px]",
	md: "size-9 rounded-lg text-xs",
	lg: "size-14 rounded-xl text-base",
} as const;

// A stable hue per symbol, so a stock keeps its colour everywhere it appears,
// and the same one as in the player app.
const hueOf = (symbol: string) => {
	let hash = 0;
	for (const char of symbol) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return hash % 360;
};

const monogram = (symbol: string) =>
	symbol
		.replace(/[^A-Za-z0-9]/g, "")
		.slice(0, 2)
		.toUpperCase();

/** A tinted monogram of a stock's symbol, matching the player app. */
export function StockLogo({
	symbol,
	size = "sm",
	className,
}: {
	symbol: string;
	size?: keyof typeof SIZES;
	className?: string;
}) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"stock-monogram inline-flex shrink-0 items-center justify-center font-mono font-semibold tracking-tight select-none",
				SIZES[size],
				className,
			)}
			style={{ "--logo-hue": hueOf(symbol) } as React.CSSProperties}
		>
			{monogram(symbol)}
		</span>
	);
}
