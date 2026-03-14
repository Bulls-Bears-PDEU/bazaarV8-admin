import { useEffect, useState } from "react";
import { authClient, type Session } from "#/lib/auth-client";

const useSession = () => {
	const [session, setSession] = useState<Session | null>(null);
	useEffect(() => {
		async function fetchSession() {
			const session = await authClient.getSession();
			setSession(session.data);
		}
		fetchSession();
	}, []);
	return session;
};

export default useSession;
