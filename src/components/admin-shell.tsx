import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
	ChartCandlestick,
	Ellipsis,
	Gauge,
	LogOut,
	Newspaper,
	Rocket,
	Search,
	Trophy,
	Users,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { AccessibilityMenu } from "#/components/accessibility-menu";
import { Brand } from "#/components/brand";
import { LiveIndicator } from "#/components/live-indicator";
import { ModeToggle } from "#/components/mode-toggle";
import { StockSearch } from "#/components/stock-search";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "#/components/ui/sheet";
import { authClient } from "#/lib/auth-client";
import { cn } from "#/lib/utils";

type NavItem = {
	to: "/market" | "/stocks" | "/users" | "/ipos" | "/news" | "/leaderboard";
	label: string;
	icon: typeof Gauge;
};

const NAV: NavItem[] = [
	{ to: "/market", label: "Market", icon: Gauge },
	{ to: "/stocks", label: "Stocks", icon: ChartCandlestick },
	{ to: "/users", label: "Users", icon: Users },
	{ to: "/ipos", label: "IPOs", icon: Rocket },
	{ to: "/news", label: "News", icon: Newspaper },
	{ to: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

// Phones get the four places organisers go most; the rest live under "More".
const MOBILE_TABS = NAV.filter((item) => ["/market", "/stocks", "/users", "/news"].includes(item.to));
const MOBILE_MORE = NAV.filter((item) => !MOBILE_TABS.includes(item));

const initials = (name: string | undefined) =>
	(name ?? "")
		.split(/\s+/)
		.filter(Boolean)
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase() || "?";

const signOut = async () => {
	await authClient.signOut();
	window.location.assign("/auth/signin");
};

function UserMenu() {
	const session = authClient.useSession();
	const user = session.data?.user;
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label="Account"
					className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					<Avatar className="size-8">
						{user?.image && <AvatarImage src={user.image} alt="" />}
						<AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
							{initials(user?.name)}
						</AvatarFallback>
					</Avatar>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="flex flex-col">
					<span className="truncate">{user?.name}</span>
					<span className="truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={signOut}>
					<LogOut />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/** The player app's shell for the admin panel: a rail on desktop, a tab bar on phones. */
export function AdminShell({ children }: { children: ReactNode }) {
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const [searchOpen, setSearchOpen] = useState(false);
	const [moreOpen, setMoreOpen] = useState(false);

	// Ctrl+K opens the stock jump from anywhere; "/" too, outside text fields.
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const typing =
				event.target instanceof HTMLElement &&
				(event.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName));
			if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
				event.preventDefault();
				setSearchOpen(true);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const isActive = (to: string) => pathname === to || (to === "/stocks" && pathname.startsWith("/stock/"));

	return (
		<div className="min-h-svh bg-background">
			{/* The first Tab stop: straight past the navigation to the page. */}
			<a
				href="#main"
				className="fixed top-2 left-2 z-50 -translate-y-16 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-transform focus-visible:translate-y-0"
			>
				Skip to content
			</a>
			{/* Desktop rail */}
			<aside className="fixed inset-y-0 left-0 z-30 hidden w-52 flex-col border-r bg-sidebar md:flex">
				<div className="flex h-14 items-center px-4">
					<Brand />
				</div>
				<nav className="flex flex-1 flex-col gap-0.5 p-2" aria-label="Main">
					{NAV.map(({ to, label, icon: Icon }) => {
						const active = isActive(to);
						return (
							<Link
								key={to}
								to={to}
								aria-current={active ? "page" : undefined}
								className={cn(
									"group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
									active && "bg-primary/10 font-medium text-foreground hover:bg-primary/15",
								)}
							>
								<span
									aria-hidden="true"
									className={cn(
										"absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-transform duration-200",
										active ? "scale-y-100" : "scale-y-0",
									)}
								/>
								<Icon
									className={cn(
										"size-4 transition-transform duration-200 group-hover:scale-110",
										active && "text-primary",
									)}
								/>
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="border-t p-3">
					<LiveIndicator className="w-fit" />
				</div>
			</aside>

			<div className="md:pl-52">
				{/* Top bar */}
				<header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur md:px-6">
					<Brand className="md:hidden" />
					<button
						type="button"
						onClick={() => setSearchOpen(true)}
						className="ml-auto flex size-8 items-center justify-center gap-2 rounded-lg text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:ml-0 md:h-9 md:w-80 md:justify-start md:border md:bg-muted/40 md:px-3"
						aria-label="Jump to a stock"
					>
						<Search className="size-4" />
						<span className="hidden md:inline">Jump to a stock</span>
						<kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] md:inline">
							Ctrl K
						</kbd>
					</button>
					<div className="hidden flex-1 md:block" />
					<AccessibilityMenu />
					<ModeToggle />
					<div className="hidden md:block">
						<UserMenu />
					</div>
				</header>

				{/* Wider than the player app: admin tables carry more columns. Room
				    for the bottom tab bar on phones. */}
				<main
					id="main"
					tabIndex={-1}
					className="mx-auto w-full max-w-screen-2xl px-4 pt-4 pb-24 outline-none md:px-6 md:pt-6 md:pb-10"
				>
					{children}
				</main>
			</div>

			{/* Mobile tab bar */}
			<nav
				className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
				aria-label="Main"
			>
				{MOBILE_TABS.map(({ to, label, icon: Icon }) => (
					<Link
						key={to}
						to={to}
						aria-current={isActive(to) ? "page" : undefined}
						className={cn(
							"flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground",
							isActive(to) && "text-primary",
						)}
					>
						<Icon className="size-5" />
						{label}
					</Link>
				))}
				<button
					type="button"
					onClick={() => setMoreOpen(true)}
					className={cn(
						"flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground",
						MOBILE_MORE.some((item) => isActive(item.to)) && "text-primary",
					)}
				>
					<Ellipsis className="size-5" />
					More
				</button>
			</nav>

			<Sheet open={moreOpen} onOpenChange={setMoreOpen}>
				<SheetContent side="bottom" className="rounded-t-xl pb-[calc(env(safe-area-inset-bottom)+1rem)]">
					<SheetHeader>
						<SheetTitle>More</SheetTitle>
					</SheetHeader>
					<div className="grid gap-1 px-4">
						{MOBILE_MORE.map(({ to, label, icon: Icon }) => (
							<button
								type="button"
								key={to}
								onClick={() => {
									setMoreOpen(false);
									navigate({ to });
								}}
								className="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-muted"
							>
								<Icon className="size-4 text-muted-foreground" />
								{label}
							</button>
						))}
						<button
							type="button"
							onClick={signOut}
							className="flex items-center gap-3 rounded-md px-3 py-3 text-sm text-loss hover:bg-muted"
						>
							<LogOut className="size-4" />
							Sign out
						</button>
						<LiveIndicator className="mt-2 w-fit" />
					</div>
				</SheetContent>
			</Sheet>

			<StockSearch open={searchOpen} onOpenChange={setSearchOpen} />
		</div>
	);
}
