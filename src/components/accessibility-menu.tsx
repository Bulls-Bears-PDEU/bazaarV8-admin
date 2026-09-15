import {
	Accessibility,
	ALargeSmall,
	Contrast,
	Eye,
	Keyboard,
	Link2,
	type LucideIcon,
	CirclePause,
	RotateCcw,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { Label } from "#/components/ui/label";
import { Switch } from "#/components/ui/switch";
import { type A11yPrefs, resetA11yPrefs, setA11yPrefs, type TextSize, useA11yPrefs } from "#/lib/a11y";
import { cn } from "#/lib/utils";

const TEXT_SIZES: { value: TextSize; label: string; sample: string }[] = [
	{ value: "default", label: "Default text size", sample: "text-xs" },
	{ value: "large", label: "Large text", sample: "text-sm" },
	{ value: "larger", label: "Largest text", sample: "text-base" },
];

type Toggle = { key: Exclude<keyof A11yPrefs, "textSize">; label: string; hint: string; icon: LucideIcon };

const TOGGLES: Toggle[] = [
	{
		key: "reduceMotion",
		label: "Reduce motion",
		hint: "Stops the live pulse and other movement",
		icon: CirclePause,
	},
	{
		key: "colorSafe",
		label: "Colour-blind friendly",
		hint: "Blue for rises, orange for falls",
		icon: Eye,
	},
	{
		key: "highContrast",
		label: "High contrast",
		hint: "Stronger text, borders and focus rings",
		icon: Contrast,
	},
	{
		key: "underlineLinks",
		label: "Underline links",
		hint: "Links do not rely on colour alone",
		icon: Link2,
	},
];

const SHORTCUTS: { keys: string[]; action: string }[] = [
	{ keys: ["Ctrl", "K"], action: "Jump to a stock" },
	{ keys: ["/"], action: "Jump to a stock" },
	{ keys: ["?"], action: "Show these shortcuts" },
	{ keys: ["Tab"], action: "Move to the next control; the first stop skips to the content" },
	{ keys: ["←", "→"], action: "Scroll a focused chart back or forward" },
	{ keys: ["+", "−"], action: "Zoom a focused chart in or out" },
	{ keys: ["0"], action: "Show a focused chart's whole history" },
	{ keys: ["T"], action: "Show a focused chart's data as a table" },
	{ keys: ["F"], action: "Show a focused chart full screen" },
	{ keys: ["Esc"], action: "Close a dialog, menu or full screen chart" },
];

/** Settings that make the app easier to read and use, in the top bar. */
export function AccessibilityMenu() {
	const prefs = useA11yPrefs();
	const [shortcutsOpen, setShortcutsOpen] = useState(false);
	const sizeLabel = useId();

	// "?" opens the shortcuts from anywhere outside a text field.
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const typing =
				event.target instanceof HTMLElement &&
				(event.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName));
			if (event.key === "?" && !typing) {
				event.preventDefault();
				setShortcutsOpen(true);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const changed =
		prefs.textSize !== "default" || TOGGLES.some((toggle) => prefs[toggle.key]);

	return (
		<>
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="ghost" size="icon" className="relative" aria-label="Accessibility settings">
						<Accessibility className="size-[18px]" />
						{changed && (
							<span
								aria-hidden="true"
								className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-background"
							/>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))] gap-0 p-0">
					<div className="flex items-center gap-2 border-b px-4 py-3">
						<Accessibility className="size-4 text-primary" />
						<span className="font-medium">Accessibility</span>
					</div>

					<div className="flex flex-col gap-2 border-b px-4 py-3">
						<span id={sizeLabel} className="flex items-center gap-2 text-sm font-medium">
							<ALargeSmall className="size-4 text-muted-foreground" />
							Text size
						</span>
						<fieldset aria-labelledby={sizeLabel} className="m-0 grid grid-cols-3 gap-1 rounded-lg border-0 bg-muted p-1">
							{TEXT_SIZES.map((size) => (
								<label
									key={size.value}
									className={cn(
										"flex h-8 cursor-pointer items-center justify-center rounded-md font-semibold text-muted-foreground transition-colors hover:text-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
										size.sample,
										prefs.textSize === size.value && "bg-background text-foreground shadow-sm",
									)}
								>
									<input
										type="radio"
										name="text-size"
										value={size.value}
										checked={prefs.textSize === size.value}
										onChange={() => setA11yPrefs({ textSize: size.value })}
										aria-label={size.label}
										className="sr-only"
									/>
									<span aria-hidden="true">Aa</span>
								</label>
							))}
						</fieldset>
					</div>

					<ul className="flex flex-col py-1">
						{TOGGLES.map((toggle) => (
							<li key={toggle.key} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60">
								<toggle.icon className="size-4 shrink-0 text-muted-foreground" />
								<Label
									htmlFor={`a11y-${toggle.key}`}
									className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-0.5"
								>
									<span className="text-sm font-medium">{toggle.label}</span>
									<span className="text-xs font-normal text-muted-foreground">{toggle.hint}</span>
								</Label>
								<Switch
									id={`a11y-${toggle.key}`}
									checked={prefs[toggle.key]}
									onCheckedChange={(checked) => setA11yPrefs({ [toggle.key]: checked })}
								/>
							</li>
						))}
					</ul>

					<div className="flex items-center gap-2 border-t px-2 py-2">
						<Button variant="ghost" size="sm" onClick={() => setShortcutsOpen(true)}>
							<Keyboard data-icon="inline-start" />
							Keyboard shortcuts
						</Button>
						<Button variant="ghost" size="sm" className="ml-auto" onClick={resetA11yPrefs} disabled={!changed}>
							<RotateCcw data-icon="inline-start" />
							Reset
						</Button>
					</div>
				</PopoverContent>
			</Popover>

			<Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Keyboard className="size-5 text-primary" />
							Keyboard shortcuts
						</DialogTitle>
						<DialogDescription>Everything in the admin panel can be reached without a mouse.</DialogDescription>
					</DialogHeader>
					<dl className="flex flex-col divide-y text-sm">
						{SHORTCUTS.map((shortcut) => (
							<div key={shortcut.action + shortcut.keys.join()} className="flex items-center gap-4 py-2">
								<dt className="flex shrink-0 gap-1">
									{shortcut.keys.map((key) => (
										<kbd
											key={key}
											className="min-w-7 rounded-md border bg-muted px-1.5 py-0.5 text-center font-mono text-xs"
										>
											{key}
										</kbd>
									))}
								</dt>
								<dd className="text-muted-foreground">{shortcut.action}</dd>
							</div>
						))}
					</dl>
				</DialogContent>
			</Dialog>
		</>
	);
}
