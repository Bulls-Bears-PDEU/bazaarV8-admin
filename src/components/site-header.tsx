import { PanelLeftIcon } from "lucide-react";
import { LiveIndicator } from "#/components/live-indicator";
import { ModeToggle } from "#/components/mode-toggle";
import { SearchForm } from "#/components/search-form";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#/components/ui/breadcrumb";
import { Button } from "#/components/ui/button";
import { Separator } from "#/components/ui/separator";
import { useSidebar } from "#/components/ui/sidebar";

export function SiteHeader() {
	const { toggleSidebar } = useSidebar();

	return (
		<header className="sticky top-0 z-50 flex w-full items-center border-b dark:bg-black/50 backdrop-blur-sm bg-white/50">
			<div className="flex h-(--header-height) w-full items-center gap-2 px-4">
				<Button
					className="h-8 w-8"
					variant="ghost"
					size="icon"
					onClick={toggleSidebar}
				>
					<PanelLeftIcon />
				</Button>
				<Separator
					orientation="vertical"
					className="mr-2 data-vertical:h-4 data-vertical:self-auto"
				/>

				<div className="ml-auto w-full sm:w-auto flex items-center justify-end gap-3">
					<LiveIndicator />
					<ModeToggle />
				</div>
			</div>
		</header>
	);
}
