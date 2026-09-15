import type { ReactNode } from "react";
import { cn } from "#/lib/utils";

/** A labelled figure: the building block of every summary row. */
export function Stat({
	label,
	value,
	hint,
	className,
}: {
	label: ReactNode;
	value: ReactNode;
	hint?: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex min-w-0 flex-col gap-1", className)}>
			<span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
				{label}
			</span>
			<span className="truncate font-mono text-lg tabular-nums leading-tight">
				{value}
			</span>
			{hint && (
				<span className="truncate text-xs text-muted-foreground">{hint}</span>
			)}
		</div>
	);
}

/** Section heading used inside cards and pages. */
export function SectionTitle({
	children,
	action,
	className,
}: {
	children: ReactNode;
	action?: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex items-center justify-between gap-3", className)}>
			<h2 className="text-sm font-semibold tracking-tight">{children}</h2>
			{action}
		</div>
	);
}
