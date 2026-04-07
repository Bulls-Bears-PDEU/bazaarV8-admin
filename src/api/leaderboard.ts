import axios from "axios";
import type { LeaderboardEntry } from "#/types/leaderboard";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
axios.defaults.baseURL = BACKEND_URL;
axios.defaults.withCredentials = true;

export const getLeaderboard = async () => {
	const res = await axios.get("/leaderboard");
	return res.data as LeaderboardEntry[];
};
