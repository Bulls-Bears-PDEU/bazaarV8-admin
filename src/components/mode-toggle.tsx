import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "#/components/theme-provider";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

export function ModeToggle() {
	const { theme, setTheme } = useTheme();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon">
					<Sun className="size-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
					<Moon className="absolute size-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
					<span className="sr-only">Toggle theme</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{/* Radio items, so the theme in force carries a check mark. */}
				<DropdownMenuRadioGroup
					value={theme}
					onValueChange={(value) => setTheme(value as typeof theme)}
				>
					<DropdownMenuRadioItem value="light">
						<Sun />
						Light
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="dark">
						<Moon />
						Dark
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="system">
						<Monitor />
						System
					</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
