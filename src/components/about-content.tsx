import { ChartCandlestick, Code, ExternalLink, UsersRound } from "lucide-react";
import { PageHeader } from "#/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

const GITHUB = "https://github.com/prayag17";
const TRADINGVIEW = "https://www.tradingview.com/";

/**
 * Who made Bazaar and what it is built on. Shared by both apps, so the credits
 * read the same wherever they are shown.
 *
 * TradingView's licence asks for its attribution notice and a link to
 * tradingview.com. The charts carry the link as their logo (attributionLogo);
 * the notice, verbatim from the project's NOTICE file, is here.
 */
export function AboutContent() {
	return (
		<div className="flex max-w-3xl flex-col gap-6">
			<PageHeader
				title="About Bazaar"
				description="A stock market game: trade live prices, apply for IPOs and climb the leaderboard."
			/>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Code className="size-4 text-muted-foreground" />
						Built by
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-wrap items-center gap-4">
					<Avatar className="size-14">
						<AvatarImage src={`${GITHUB}.png?size=112`} alt="" />
						<AvatarFallback className="bg-primary/10 font-semibold text-primary">
							PP
						</AvatarFallback>
					</Avatar>
					<div className="flex min-w-0 flex-1 basis-40 flex-col">
						<span className="text-base font-semibold">Prayag Prajapati</span>
						<span className="text-sm text-muted-foreground">Lead developer</span>
					</div>
					<Button asChild variant="outline" size="sm">
						<a href={GITHUB} target="_blank" rel="noreferrer">
							@prayag17 on GitHub
							<ExternalLink data-icon="inline-end" />
						</a>
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<UsersRound className="size-4 text-muted-foreground" />
						Maintained by
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-base font-semibold">
						The Bulls and Bears Tech and IT team
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<ChartCandlestick className="size-4 text-muted-foreground" />
						Charts
					</CardTitle>
					<CardDescription>
						Every price chart in Bazaar is drawn with TradingView Lightweight
						Charts, an open-source charting library.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-wrap items-end justify-between gap-4">
					<p className="text-sm leading-relaxed">
						TradingView Lightweight Charts™
						<br />
						<span className="text-muted-foreground">
							Copyright (c) 2025 TradingView, Inc.{" "}
							<a
								href={TRADINGVIEW}
								target="_blank"
								rel="noreferrer"
								className="underline underline-offset-4 hover:text-foreground"
							>
								https://www.tradingview.com/
							</a>
						</span>
					</p>
					<Button asChild variant="outline" size="sm">
						<a href={TRADINGVIEW} target="_blank" rel="noreferrer">
							Visit TradingView
							<ExternalLink data-icon="inline-end" />
						</a>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
