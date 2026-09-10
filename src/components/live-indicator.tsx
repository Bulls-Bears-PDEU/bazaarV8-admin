import { useEffect, useState } from "react";
import useSocket from "#/hooks/use-socket";
import { cn } from "#/lib/utils";
import type { MarketState } from "#/types/market";

export function LiveIndicator() {
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
	const label = isConnected ? (isPaused ? "Paused" : "Live") : "Disconnected";

	return (
		<div className="flex items-center gap-2 rounded-full border bg-background/50 px-3 py-1.5 text-xs font-medium">
			<span className="relative flex size-2">
				{isLive && (
					<span className="absolute inline-flex size-full animate-ping rounded-full bg-gain opacity-75" />
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
			{label}
		</div>
	);
}
