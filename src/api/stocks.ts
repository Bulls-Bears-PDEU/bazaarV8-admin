import axios from "axios";
import type { Stock } from "#/types/stock";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
axios.defaults.baseURL = BACKEND_URL;
//Allow cors requests to send cookies
// axios.defaults.withCredentials = true;

export const getAllStocks = async () => {
	const res = await axios.get("/stocks/getAllStocks");
	return res.data as Stock[];
};
