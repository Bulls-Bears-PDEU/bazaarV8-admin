import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Badge } from "#/components/ui/badge";
import { cn } from "#/lib/utils";
import type { AdminUser } from "#/types/users";

export const initials = (name: string | null | undefined) =>
	(name ?? "")
		.split(/\s+/)
		.filter(Boolean)
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase() || "?";

/** Photo or initials, with a dot while they are connected. */
export function UserAvatar({
	user,
	className,
}: {
	user: Pick<AdminUser, "name" | "image" | "online">;
	className?: string;
}) {
	return (
		<span className="relative inline-flex shrink-0">
			<Avatar className={cn("size-9", className)}>
				{user.image && <AvatarImage src={user.image} alt="" />}
				<AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(user.name)}</AvatarFallback>
			</Avatar>
			{user.online && (
				<span
					role="img"
					aria-label="Online"
					className="absolute right-0 bottom-0 size-2.5 rounded-full bg-gain ring-2 ring-background"
				/>
			)}
		</span>
	);
}

/** Status first, then anything else worth knowing at a glance. */
export function StatusBadges({ user, className }: { user: AdminUser; className?: string }) {
	return (
		<span className={cn("flex flex-wrap items-center gap-1.5", className)}>
			{user.status === "pending" && (
				<Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
					Waiting for approval
				</Badge>
			)}
			{user.status === "active" && (
				<Badge variant="outline" className="border-gain/30 bg-gain-muted text-gain">
					Active
				</Badge>
			)}
			{user.status === "banned" && (
				<Badge variant="outline" className="border-loss/30 bg-loss-muted text-loss">
					Banned
				</Badge>
			)}
			{user.role === "admin" && (
				<Badge variant="outline" className="border-primary/20 bg-primary/10 text-foreground">
					Organiser
				</Badge>
			)}
			{user.status === "active" && user.role === "user" && !user.onboarded_at && (
				<Badge variant="outline" className="border-dashed text-muted-foreground">
					Profile not set up
				</Badge>
			)}
		</span>
	);
}
