import axios from "axios";
import type {
	IndexHistory,
	IndexSnapshot,
	MarketOverview,
	MarketSentiment,
	MarketState,
} from "#/types/market";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
axios.defaults.baseURL = BACKEND_URL;
axios.defaults.withCredentials = true;

export const getMarketState = async () => {
	const res = await axios.get("/market/getMarketState");
	return res.data as MarketState;
};

export const getMarketOverview = async (candles?: number) => {
	const res = await axios.get("/market/getMarketOverview", {
		params: candles ? { candles } : undefined,
	});
	return res.data as MarketOverview;
};

/** The Bazaar index now; "indexTick" on the socket keeps it live. */
export const getIndex = async () => {
	const res = await axios.get("/market/getIndex");
	return res.data as IndexSnapshot;
};

/** basis "start": every stock measured from its starting price, as players see it. */
export const getIndexHistory = async (
	points?: number,
	basis: "window" | "start" = "start",
) => {
	const res = await axios.get("/market/getIndexHistory", {
		params: { points, basis },
	});
	return res.data as IndexHistory;
};

export const setMarketPaused = async (isPaused: boolean) => {
	const res = await axios.patch("/market/setPauseState", { isPaused });
	return res.data as MarketState;
};

export const setMarketSentiment = async (sentiment: MarketSentiment) => {
	const res = await axios.patch("/market/setSentiment", { sentiment });
	return res.data as MarketState;
};
