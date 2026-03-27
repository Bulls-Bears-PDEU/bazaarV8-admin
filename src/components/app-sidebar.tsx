import {
	CandlestickChart,
	Cog,
	GalleryVerticalEnd,
	Megaphone,
	Newspaper,
	UserCog2,
	Users2,
} from "lucide-react";
import type { ComponentProps } from "react";
import { NavProjects } from "#/components/nav-projects";
import { TeamSwitcher } from "#/components/team-switcher"
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "#/components/ui/sidebar";
import { NavUser } from "./nav-user";

// This is sample data.
const data = {
	teams: [
		{
			name: "Bazaar",
			logo: GalleryVerticalEnd,
			plan: "Admin",
		},
	],
	projects: [
		{
			name: "Stocks",
			url: "/stocks",
			icon: CandlestickChart,
		},
		{
			name: "Users",
			url: "/users",
			icon: UserCog2,
		},
		{
			name: "Market",
			url: "/market",
			icon: Cog,
		},
		{
			name: "IPOs",
			url: "/ipos",
			icon: Megaphone,
		},
		{
			name: "News",
			url: "/news",
			icon: Newspaper,
		},
		{
			name: "Leaderboard",
			url: "/leaderboard",
			icon: Users2,
		},
	],
};

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar
			className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
			collapsible="icon"
			{...props}
		>
			<SidebarHeader>
				<TeamSwitcher teams={data.teams} />
			</SidebarHeader>
			<SidebarContent>
				<NavProjects projects={data.projects} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
