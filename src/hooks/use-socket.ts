import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";

let socketInstance: Socket | null = null;
let activeConnections = 0;

const useSocket = () => {
	if (!socketInstance) {
		socketInstance = io(import.meta.env.VITE_BACKEND_URL, {
			transports: ["websocket"],
			autoConnect: false,
			// The backend authenticates sockets from the session cookie and refuses
			// connections without one.
			withCredentials: true,
		});

		socketInstance.on("connect", () => {
			console.log("Connected to socket server");
		});
		socketInstance.on("disconnect", () => {
			console.log("Disconnected from socket server");
		});
	}

	useEffect(() => {
		activeConnections++;
		if (!socketInstance?.connected) {
			socketInstance?.connect();
		}

		return () => {
			activeConnections--;
			// Delay disconnect to prevent React 18 Strict Mode double-render
			// from closing the websocket immediately before it establishes connection,
			// which throws the "WebSocket is closed before the connection is established" warning.
			setTimeout(() => {
				if (activeConnections === 0 && socketInstance) {
					socketInstance.disconnect();
				}
			}, 100);
		};
	}, []);

	return socketInstance;
};

export default useSocket;
