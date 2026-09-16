import axios from "axios";
import type { Stock, StockOHLC, StockPrice } from "#/types/stock";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
axios.defaults.baseURL = BACKEND_URL;
// Allow CORS requests to send cookies for all calls.
axios.defaults.withCredentials = true;

export const getAllStocks = async () => {
	const res = await axios.get("/stocks/getAllStocks");
	return res.data as (Stock & { price: number })[];
};

export const getStockPrice = async (
	stockId: string | number,
	enableIndicator: boolean,
): Promise<StockPrice> => {
	const res = await axios.get(
		`/stocks/getCurrentPrice/${stockId}?enableIndicator=${enableIndicator}`,
	);
	return res.data;
};

export const getAllStockPrices = async () => {
	const res = await axios.get("/stocks/getCurrentPricesForAllStocks");
	return res.data as Record<string, number>;
};

export const getStock = async (stockId: string) => {
	const res = await axios.get(`/stocks/getStockById/${stockId}`);
	return res.data as Stock;
};

/** `limit` asks for only the most recent that many candles, still oldest first. */
export const getStockOhlc = async (stockId: string, limit?: number) => {
	const res = await axios.get(`/stocks/getOHLCByStockId/${stockId}`, {
		params: limit === undefined ? undefined : { limit },
	});
	return res.data as StockOHLC[];
};

export const addStockOhlc = async (ohlcData: StockOHLC) => {
	const res = await axios.post(
		`/stocks/addStockOHLC/${ohlcData.stock_id}`,
		ohlcData,
	);
	return res.data as StockOHLC;
};

export const searchStocks = async (query: string) => {
	const res = await axios.get(
		`/stocks/searchStocks?query=${encodeURIComponent(query)}`,
	);
	return res.data as (Stock & { price: number })[];
};

export const getCurrentPricesForStocks = async (stockIds: string[]) => {
	const url = `/stocks/getCurrentPricesForStocks?${stockIds.map((id) => `stockIds=${encodeURIComponent(id)}`).join("&")}`;
	const res = await axios.get(url);
	return res.data as Record<string, number>;
};

export const updateStock = async (
	stockId: number,
	updatedData: Partial<Stock>,
) => {
	const res = await axios.put(`/stocks/updateStock/${stockId}`, updatedData);
	return res.data as Stock;
};

export const getAllSectors = async () => {
	const res = await axios.get("/stocks/getAllSectors");
	return res.data as string[];
};

export const addStock = async (
	stockData: Omit<Stock, "id" | "created_at" | "locked" | "name_tsv">,
	initPrice: number,
) => {
	const res = await axios.post("/stocks/addStock", { stockData, initPrice });
	return res.data as Stock;
};
