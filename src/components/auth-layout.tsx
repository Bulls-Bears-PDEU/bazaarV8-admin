import type { ReactNode } from "react";
import { Brand } from "#/components/brand";
import { cn } from "#/lib/utils";

// A stylised session: enough shape to read as a market, not a real chart.
const BARS = [
	[40, 62, 36, 58],
	[58, 70, 52, 54],
	[54, 66, 48, 64],
	[64, 72, 60, 61],
	[61, 64, 44, 47],
	[47, 55, 40, 52],
	[52, 68, 50, 66],
	[66, 80, 63, 77],
	[77, 79, 64, 68],
	[68, 74, 58, 72],
	[72, 88, 70, 85],
	[85, 92, 78, 81],
];

function MarketArt() {
	const width = 12 * 24;
	const y = (v: number) => 100 - v;
	return (
		<svg viewBox={`0 0 ${width} 100`} className="w-full max-w-md" aria-hidden="true">
			{BARS.map(([open, high, low, close], i) => {
				const x = i * 24 + 12;
				const up = close >= open;
				const color = up ? "var(--gain)" : "var(--loss)";
				return (
					<g key={x}>
						<line x1={x} x2={x} y1={y(high)} y2={y(low)} stroke={color} strokeWidth="1.5" />
						<rect
							x={x - 6}
							width="12"
							y={y(Math.max(open, close))}
							height={Math.max(Math.abs(close - open), 1.5)}
							rx="1.5"
							fill={up ? color : "none"}
							stroke={color}
							strokeWidth="1.5"
						/>
					</g>
				);
			})}
		</svg>
	);
}

/** The same split screen as the player app's sign in, with an organiser's pitch. */
export function AuthLayout({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<div className={cn("grid min-h-svh lg:grid-cols-2", className)}>
			<div className="flex flex-col gap-4 p-6 md:p-10">
				<div className="flex justify-center md:justify-start">
					<Brand />
				</div>
				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-sm">{children}</div>
				</div>
			</div>
			<div className="relative hidden flex-col justify-between overflow-hidden border-l bg-muted/40 p-10 lg:flex">
				<p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
					Bulls &amp; Bears PDEU · Control room
				</p>
				<MarketArt />
				<div className="max-w-md space-y-2">
					<p className="text-2xl font-semibold tracking-tight text-balance">Run the market from one place.</p>
					<p className="text-sm text-pretty text-muted-foreground">
						Steer sentiment, pause trading, release news, list IPOs and approve players while the
						leaderboard moves live.
					</p>
				</div>
			</div>
		</div>
	);
}
