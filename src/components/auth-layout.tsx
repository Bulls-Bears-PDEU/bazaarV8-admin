import type { ReactNode } from "react";
import { AccessibilityMenu } from "#/components/accessibility-menu";
import { MarketStrip } from "#/components/auth/market-strip";
import { Brand } from "#/components/brand";
import { ModeToggle } from "#/components/mode-toggle";
import { cn } from "#/lib/utils";

/**
 * The same split screen as the player app's sign in, with an organiser's
 * pitch: the form on the left, and on wide screens candlestick charts drifting
 * above it. Display settings are reachable before signing in.
 */
export function AuthLayout({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]",
				className,
			)}
		>
			<div className="flex flex-col px-6 py-5 sm:px-10">
				<header className="flex items-center justify-between gap-3">
					<Brand />
					<div className="flex items-center gap-1">
						<AccessibilityMenu />
						<ModeToggle />
					</div>
				</header>
				<main
					id="main"
					className="flex flex-1 items-center justify-center py-10"
				>
					<div className="w-full max-w-[25rem]">{children}</div>
				</main>
			</div>

			<div className="hidden min-h-0 flex-col gap-10 overflow-hidden border-l bg-muted/40 p-10 lg:flex xl:p-14">
				<MarketStrip className="-mx-10 min-h-0 flex-1 px-10 xl:-mx-14 xl:px-14" />
				<div className="flex flex-col gap-4">
					<p className="max-w-[18ch] text-5xl leading-[1.02] font-semibold tracking-tight text-balance">
						Run the market from one place.
					</p>
					<p className="max-w-[44ch] text-lg text-pretty text-muted-foreground">
						Steer sentiment, pause trading, release news, list IPOs and approve
						players while the leaderboard moves live.
					</p>
				</div>
			</div>
		</div>
	);
}
