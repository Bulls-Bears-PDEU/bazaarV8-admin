import type { ReactNode } from "react";
import { cn } from "#/lib/utils";

/** The title row of every page: the title, a line of context and its main action. */
export function PageHeader({
	title,
	description,
	action,
	leading,
	className,
}: {
	title: ReactNode;
	description?: ReactNode;
	action?: ReactNode;
	/** Shown before the title, such as a logo. */
	leading?: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
			<div className="flex min-w-0 items-center gap-3">
				{leading}
				<div className="flex min-w-0 flex-col">
					<h1 className="truncate text-2xl leading-tight font-semibold tracking-tight">{title}</h1>
					{description && <p className="text-sm text-pretty text-muted-foreground">{description}</p>}
				</div>
			</div>
			{action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
		</div>
	);
}
