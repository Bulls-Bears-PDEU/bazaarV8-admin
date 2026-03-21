import axios from "axios";
import type { News } from "#/types/news";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
axios.defaults.baseURL = BACKEND_URL;
axios.defaults.withCredentials = true;

export type NewsPayload = Omit<News, "id" | "created_at">;

export const getAllNews = async () => {
	const res = await axios.get("/news/getAllNewsAdmin");
	return res.data as News[];
};

export const addNews = async (newsData: NewsPayload) => {
	const res = await axios.post("/news/addNews", { newsData });
	return res.data as News;
};

export const updateNews = async (
	newsId: number,
	updatedData: Partial<NewsPayload>,
) => {
	const res = await axios.put(`/news/updateNews/${newsId}`, updatedData);
	return res.data as News;
};
