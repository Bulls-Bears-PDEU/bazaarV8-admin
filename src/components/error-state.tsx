import { useRouter, useRouterState } from "@tanstack/react-router";
import {
	ClipboardCheck,
	ClipboardCopy,
	RotateCw,
	ServerCrash,
	WifiOff,
} from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/ui/empty";
import { cn } from "#/lib/utils";

/** Where the API is meant to be, quoted back when it cannot be reached. */
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

/**
 * Is this the server being unreachable, rather than the server saying no?
 *
 * A dropped connection throws before there is any response to read, and every
 * layer words that differently: fetch (which Better Auth uses) raises
 * "Failed to fetch", axios sets ERR_NETWORK, and ApiError arrives with no
 * status. None of those mean anything to a player, so they are one case here.
 */
export const isOffline = (error: unknown): boolean => {
	if (typeof navigator !== "undefined" && navigator.onLine === false)
		return true;
	if (!(error instanceof Error)) return false;
	const code = (error as { code?: string }).code;
	if (code === "ERR_NETWORK" || code === "ECONNABORTED") return true;
	if (
		error.name === "ApiError" &&
		(error as { status?: number }).status === undefined
	)
		return true;
	return /failed to fetch|networkerror|network error|load failed|cannot reach the server/i.test(
		error.message,
	);
};

/**
 * Everything worth knowing about a failure, in one block that can be pasted
 * into a bug report. The request's own fields come first, then what the app was
 * doing, because the first question is always "which call, to where".
 */
const report = (error: unknown, pathname: string) => {
	const fields: [string, unknown][] = [
		["Page", pathname],
		["API", BACKEND_URL],
	];
	if (error instanceof Error) {
		const extra = error as { status?: number; code?: string; cause?: unknown };
		fields.unshift(["Error", `${error.name}: ${error.message}`]);
		if (extra.status !== undefined) fields.push(["HTTP status", extra.status]);
		if (extra.code) fields.push(["Code", extra.code]);
		if (extra.cause) fields.push(["Cause", String(extra.cause)]);
	} else {
		fields.unshift(["Error", String(error)]);
	}
	fields.push(
		[
			"Online",
			typeof navigator === "undefined" ? "unknown" : String(navigator.onLine),
		],
		["When", new Date().toISOString()],
	);
	if (error instanceof Error && error.stack) {
		// The throw site and its first few frames; the rest is framework noise.
		fields.push(["Stack", error.stack.split("\n").slice(0, 6).join("\n")]);
	}
	return fields;
};

/**
 * What a screen shows when it could not load. An unreachable server is its own
 * case: nothing is wrong with what was asked for, so it says so, offers the one
 * thing that helps, and keeps the detail a developer needs one click away.
 */
export function ErrorState({
	error,
	reset,
	className,
}: {
	error: unknown;
	reset?: () => void;
	className?: string;
}) {
	const router = useRouter();
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const [copied, setCopied] = useState(false);
	const offline = isOffline(error);
	const fields = report(error, pathname);

	const retry = () => {
		reset?.();
		router.invalidate();
	};

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(
				fields.map(([key, value]) => `${key}: ${value}`).join("\n"),
			);
			setCopied(true);
			setTimeout(() => setCopied(false), 2_000);
		} catch {
			// No clipboard permission: the text is on screen to select by hand.
		}
	};

	return (
		<Empty className={cn("min-h-[60svh]", className)}>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					{offline ? (
						<WifiOff aria-hidden="true" />
					) : (
						<ServerCrash aria-hidden="true" />
					)}
				</EmptyMedia>
				<EmptyTitle>
					{offline ? "Cannot reach the server" : "Something went wrong"}
				</EmptyTitle>
				<EmptyDescription>
					{offline
						? `Nothing got through to ${BACKEND_URL}. The market may be fine and this device simply cannot see it.`
						: "The page could not be loaded. Trying again usually clears it."}
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent className="w-full max-w-lg">
				<Button onClick={retry}>
					<RotateCw aria-hidden="true" />
					Try again
				</Button>
				{offline && (
					<ul className="mt-2 list-disc space-y-1 pl-5 text-left text-xs text-muted-foreground">
						<li>Is the backend running and listening on that address?</li>
						<li>
							Does <code className="font-mono">VITE_BACKEND_URL</code> point at
							it? This build uses{" "}
							<code className="font-mono">{BACKEND_URL}</code>.
						</li>
						<li>
							Does the backend allow this origin, with credentials, through
							CORS?
						</li>
						<li>
							Otherwise the connection dropped: check the network and try again.
						</li>
					</ul>
				)}
				<details className="mt-3 w-full text-left text-xs text-muted-foreground">
					<summary className="cursor-pointer select-none">Details</summary>
					<dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border bg-muted/40 p-3 font-mono">
						{fields.map(([key, value]) => (
							<div key={key} className="col-span-2 grid grid-cols-subgrid">
								<dt className="whitespace-nowrap text-muted-foreground">
									{key}
								</dt>
								<dd className="min-w-0 break-words whitespace-pre-wrap text-foreground">
									{String(value)}
								</dd>
							</div>
						))}
					</dl>
					<Button variant="outline" size="xs" className="mt-2" onClick={copy}>
						{copied ? (
							<ClipboardCheck aria-hidden="true" />
						) : (
							<ClipboardCopy aria-hidden="true" />
						)}
						{copied ? "Copied" : "Copy report"}
					</Button>
				</details>
			</EmptyContent>
		</Empty>
	);
}
