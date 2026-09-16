import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getAllStocks } from "#/api/stocks";
import { mediaUrl } from "#/lib/media";
import { cn } from "#/lib/utils";

/** The stock list this app already caches, for looking logos up. */
const useStockList = () =>
	useQuery({
		queryKey: ["stocks"],
		queryFn: () => getAllStocks(),
		staleTime: 60_000,
	}).data;

/**
 * Sizes, one step larger than they were: at the old 28px a real company mark
 * was too small to recognise. Padding grows with the tile so the mark keeps
 * the same margin inside its white ground at every size.
 */
const SIZES = {
	xs: { box: "size-6 rounded-md text-[9px]", pad: "p-px" },
	sm: { box: "size-9 rounded-lg text-xs", pad: "p-0.5" },
	md: { box: "size-11 rounded-xl text-sm", pad: "p-1" },
	lg: { box: "size-16 rounded-2xl text-lg", pad: "p-1.5" },
} as const;

// A stable hue per symbol, so a stock keeps its colour everywhere it appears.
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

/**
 * A stock's logo, or a tinted monogram of its symbol until one is set (or if
 * the image fails to load). Looked up by id or by symbol when it is not passed
 * in, so a row that only carries a symbol still shows the right picture.
 */
export function StockLogo({
	symbol,
	stockId,
	logoUrl,
	size = "sm",
	className,
}: {
	symbol: string;
	stockId?: number;
	logoUrl?: string | null;
	size?: keyof typeof SIZES;
	className?: string;
}) {
	const stocks = useStockList();
	const listed =
		(stockId === undefined
			? undefined
			: stocks?.find((s) => s.id === stockId)) ??
		stocks?.find((s) => s.symbol === symbol);
	const src = mediaUrl(logoUrl ?? listed?.logo_url);
	const [failed, setFailed] = useState<string | null>(null);

	if (src && failed !== src) {
		return (
			<img
				src={src}
				alt=""
				loading="lazy"
				decoding="async"
				onError={() => setFailed(src)}
				className={cn(
					// A white ground whatever the theme: company marks are drawn for one.
					"shrink-0 bg-white object-contain ring-1 ring-border",
					SIZES[size].box,
					SIZES[size].pad,
					className,
				)}
			/>
		);
	}

	return (
		<span
			aria-hidden="true"
			className={cn(
				"stock-monogram inline-flex shrink-0 items-center justify-center font-mono font-semibold tracking-tight select-none",
				SIZES[size].box,
				className,
			)}
			style={{ "--logo-hue": hueOf(symbol) } as React.CSSProperties}
		>
			{monogram(symbol)}
		</span>
	);
}
