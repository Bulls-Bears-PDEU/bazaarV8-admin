import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
	ChartCandlestick,
	Ellipsis,
	Gauge,
	Info,
	LogOut,
	Megaphone,
	Newspaper,
	Rocket,
	ScrollText,
	Search,
	Trophy,
	Users,
} from "lucide-react";
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { AccessibilityMenu } from "#/components/accessibility-menu";
import { Brand } from "#/components/brand";
import { LiveIndicator } from "#/components/live-indicator";
import { ModeToggle } from "#/components/mode-toggle";
import { StockSearch } from "#/components/stock-search";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from "#/components/ui/sidebar";
import { useSettledPathname } from "#/hooks/use-settled-pathname";
import useSocket from "#/hooks/use-socket";
import { authClient } from "#/lib/auth-client";
import { mediaUrl } from "#/lib/media";
import { cn } from "#/lib/utils";

type NavItem = {
	to:
		| "/market"
		| "/stocks"
		| "/users"
		| "/ipos"
		| "/news"
		| "/ads"
		| "/leaderboard"
		| "/actions"
		| "/about";
	label: string;
	icon: typeof Gauge;
};

const NAV: NavItem[] = [
	{ to: "/market", label: "Market", icon: Gauge },
	{ to: "/stocks", label: "Stocks", icon: ChartCandlestick },
	{ to: "/users", label: "Users", icon: Users },
	{ to: "/ipos", label: "IPOs", icon: Rocket },
	{ to: "/news", label: "News", icon: Newspaper },
	{ to: "/ads", label: "Ads", icon: Megaphone },
	{ to: "/leaderboard", label: "Leaderboard", icon: Trophy },
	{ to: "/actions", label: "Action log", icon: ScrollText },
];

// Phones get the four places organisers go most; the rest live under "More".
const MOBILE_TABS = NAV.filter((item) =>
	["/market", "/stocks", "/users", "/news"].includes(item.to),
);
const MOBILE_MORE: NavItem[] = [
	...NAV.filter((item) => !MOBILE_TABS.includes(item)),
	{ to: "/about", label: "About", icon: Info },
];

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
				<Button
					variant="ghost"
					size="icon"
					aria-label="Account"
					className="rounded-full p-0"
				>
					<Avatar className="size-8">
						{user?.image && <AvatarImage src={mediaUrl(user.image)} alt="" />}
						<AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
							{initials(user?.name)}
						</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="flex flex-col">
					<span className="truncate">{user?.name}</span>
					<span className="truncate text-xs font-normal text-muted-foreground">
						{user?.email}
					</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link to="/about">
						<Info />
						About Bazaar
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem onClick={signOut}>
					<LogOut />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/**
 * Another organiser changed a stock's details or logo: refetch the list every
 * StockLogo reads from. Registered once here rather than in each logo, which
 * would add a socket listener per row of every table.
 */
function useStocksChangedRefresh() {
	const socket = useSocket();
	const queryClient = useQueryClient();
	useEffect(() => {
		if (!socket) return;
		const refresh = () =>
			queryClient.invalidateQueries({ queryKey: ["stocks"], exact: true });
		socket.on("stocksChanged", refresh);
		return () => {
			socket.off("stocksChanged", refresh);
		};
	}, [socket, queryClient]);
}

/** The player app's shell for the admin panel: a rail on desktop, a tab bar on phones. */
/** Does this nav entry cover the page being shown? */
const matches = (pathname: string, to: string) =>
	pathname === to || (to === "/stocks" && pathname.startsWith("/stock/"));

/** The cookie SidebarProvider writes, so a reload opens the rail as it was left. */
const railWasOpen = () =>
	!/(^|;\s*)sidebar_state=false(;|$)/.test(document.cookie);

/**
 * The desktop rail. Folded it is icons alone, with each name back on hover;
 * SidebarProvider keeps that choice in a cookie and binds Ctrl/Cmd+B to it.
 */
function NavRail() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const collapsed = useSidebar().state === "collapsed";

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader className="h-14 justify-center group-data-[collapsible=icon]:items-center">
				<Brand collapsed={collapsed} />
			</SidebarHeader>
			<SidebarContent>
				<SidebarMenu className="px-2">
					{NAV.map(({ to, label, icon: Icon }) => {
						const active = matches(pathname, to);
						return (
							<SidebarMenuItem key={to}>
								<SidebarMenuButton asChild isActive={active} tooltip={label}>
									<Link to={to} aria-current={active ? "page" : undefined}>
										<Icon />
										<span>{label}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</SidebarContent>
			<SidebarFooter className="group-data-[collapsible=icon]:items-center">
				<LiveIndicator
					compact={collapsed}
					className={collapsed ? undefined : "w-fit"}
				/>
			</SidebarFooter>
		</Sidebar>
	);
}

export function AdminShell({ children }: { children: ReactNode }) {
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const [searchOpen, setSearchOpen] = useState(false);
	const [moreOpen, setMoreOpen] = useState(false);
	const settledPathname = useSettledPathname();
	useStocksChangedRefresh();

	// Ctrl+K opens the stock jump from anywhere; "/" too, outside text fields,
	// unless the page has its own search box.
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const typing =
				event.target instanceof HTMLElement &&
				(event.target.isContentEditable ||
					["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName));
			if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				setSearchOpen(true);
			} else if (event.key === "/" && !typing) {
				event.preventDefault();
				// A page with its own search box (marked data-slash-search, and
				// showing a "/" hint) gets the key; elsewhere it opens the jump.
				const pageSearch = document.querySelector<HTMLElement>(
					"[data-slash-search]",
				);
				if (pageSearch) pageSearch.focus();
				else setSearchOpen(true);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const isActive = (to: string) => matches(pathname, to);

	return (
		<SidebarProvider
			defaultOpen={railWasOpen()}
			// 13rem is the width the rail always had. The folded width is left at
			// the primitive's 3rem, which is what centres a size-8 icon button
			// inside the menu's px-2.
			style={{ "--sidebar-width": "13rem" } as CSSProperties}
		>
			{/* The first Tab stop: straight past the navigation to the page. */}
			<a
				href="#main"
				className="fixed top-2 left-2 z-50 -translate-y-16 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-transform focus-visible:translate-y-0"
			>
				Skip to content
			</a>
			<NavRail />

			<SidebarInset className="min-w-0 bg-background">
				{/* Top bar */}
				<header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur md:px-6">
					<Brand className="md:hidden" />
					<SidebarTrigger className="hidden shrink-0 md:flex" />
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setSearchOpen(true)}
						className="ml-auto gap-2 text-muted-foreground md:ml-0 md:h-9 md:w-80 md:justify-start md:border-border md:bg-muted/40 md:px-3"
						aria-label="Jump to a stock"
					>
						<Search className="size-4" />
						<span className="hidden md:inline">Jump to a stock</span>
						<kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] md:inline">
							Ctrl K
						</kbd>
					</Button>
					<div className="hidden flex-1 md:block" />
					<AccessibilityMenu />
					<ModeToggle />
					<div className="hidden md:block">
						<UserMenu />
					</div>
				</header>

				{/* Wider than the player app: admin tables carry more columns. Room
				    for the bottom tab bar on phones. */}
				<div
					id="main"
					tabIndex={-1}
					className="mx-auto w-full max-w-screen-2xl px-4 pt-4 pb-24 outline-none md:px-6 md:pt-6 md:pb-10"
				>
					<div key={settledPathname} className="animate-page-in">
						{children}
					</div>
				</div>
			</SidebarInset>

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
				<Button
					variant="ghost"
					onClick={() => setMoreOpen(true)}
					className={cn(
						"h-auto flex-col gap-1 rounded-none py-2 text-[11px] font-normal text-muted-foreground",
						MOBILE_MORE.some((item) => isActive(item.to)) && "text-primary",
					)}
				>
					<Ellipsis className="size-5" />
					More
				</Button>
			</nav>

			<Sheet open={moreOpen} onOpenChange={setMoreOpen}>
				<SheetContent
					side="bottom"
					className="rounded-t-xl pb-[calc(env(safe-area-inset-bottom)+1rem)]"
				>
					<SheetHeader>
						<SheetTitle>More</SheetTitle>
					</SheetHeader>
					<div className="grid gap-1 px-4">
						{MOBILE_MORE.map(({ to, label, icon: Icon }) => (
							<Button
								variant="ghost"
								key={to}
								onClick={() => {
									setMoreOpen(false);
									navigate({ to });
								}}
								className="h-auto justify-start gap-3 px-3 py-3 font-normal [&_svg]:text-muted-foreground"
							>
								<Icon className="size-4" />
								{label}
							</Button>
						))}
						<Button
							variant="ghost"
							onClick={signOut}
							className="h-auto justify-start gap-3 px-3 py-3 font-normal text-loss hover:text-loss"
						>
							<LogOut className="size-4" />
							Sign out
						</Button>
						<LiveIndicator className="mt-2 w-fit" />
					</div>
				</SheetContent>
			</Sheet>

			<StockSearch open={searchOpen} onOpenChange={setSearchOpen} />
		</SidebarProvider>
	);
}
