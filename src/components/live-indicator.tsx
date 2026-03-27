import { useEffect, useState } from "react";
import useSocket from "#/hooks/use-socket";

export function LiveIndicator() {
	const socket = useSocket();
	const [isConnected, setIsConnected] = useState(socket?.connected || false);

	useEffect(() => {
		if (!socket) return;

		const onConnect = () => setIsConnected(true);
		const onDisconnect = () => setIsConnected(false);

		// Always sync state when socket reference changes or mounts
		setIsConnected(socket.connected);

		socket.on("connect", onConnect);
		socket.on("disconnect", onDisconnect);

		return () => {
			socket.off("connect", onConnect);
			socket.off("disconnect", onDisconnect);
		};
	}, [socket]);

	return (
		<div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background/50 text-xs font-medium">
			<span className="relative flex h-2.5 w-2.5">
				{isConnected && (
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
				)}
				<span
					className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
						isConnected ? "bg-green-500" : "bg-red-500"
					}`}
				/>
			</span>
			{isConnected ? "Live Market" : "Market Offline"}
		</div>
	);
}
