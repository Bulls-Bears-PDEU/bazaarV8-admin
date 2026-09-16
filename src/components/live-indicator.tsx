import { useEffect, useState } from "react";
import useSocket from "#/hooks/use-socket";
import { cn } from "#/lib/utils";
import type { MarketState } from "#/types/market";

export function LiveIndicator({
	className,
	compact = false,
}: {
	className?: string;
	compact?: boolean;
}) {
	const socket = useSocket();
	const [isConnected, setIsConnected] = useState(socket?.connected || false);
	const [isPaused, setIsPaused] = useState(false);

	useEffect(() => {
		if (!socket) return;

		const onConnect = () => setIsConnected(true);
		const onDisconnect = () => setIsConnected(false);
		// The server sends the market state on connect and on every admin change.
		const onMarketStateUpdate = (state: MarketState) =>
			setIsPaused(state.is_paused);

		// Always sync state when socket reference changes or mounts
		setIsConnected(socket.connected);

		socket.on("connect", onConnect);
		socket.on("disconnect", onDisconnect);
		socket.on("marketStateUpdate", onMarketStateUpdate);

		return () => {
			socket.off("connect", onConnect);
			socket.off("disconnect", onDisconnect);
			socket.off("marketStateUpdate", onMarketStateUpdate);
		};
	}, [socket]);

	const isLive = isConnected && !isPaused;
	const label = isConnected ? (isPaused ? "Paused" : "Live") : "Reconnecting";

	return (
		<div
			className={cn(
				"flex items-center gap-2 rounded-full border text-xs font-medium",
				// Collapsed to a dot on the icon rail; the label is read out instead.
				compact ? "size-6 justify-center p-0" : "px-2.5 py-1",
				className,
			)}
			role="status"
		>
			<span className="relative flex size-2">
				{isLive && (
					<span className="absolute inline-flex size-full animate-ping rounded-full bg-gain opacity-75 motion-reduce:animate-none" />
				)}
				<span
					className={cn(
						"relative inline-flex size-2 rounded-full",
						isLive && "bg-gain",
						isConnected && isPaused && "bg-muted-foreground",
						!isConnected && "bg-loss",
					)}
				/>
			</span>
			{compact ? <span className="sr-only">{label}</span> : label}
		</div>
	);
}
