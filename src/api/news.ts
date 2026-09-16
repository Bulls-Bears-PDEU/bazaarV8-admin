import axios from "axios";
import type { News, NewsPayload } from "#/types/news";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
axios.defaults.baseURL = BACKEND_URL;
axios.defaults.withCredentials = true;

/** The backend's own sentence for a failed request, when it sent one. */
export const newsErrorMessage = (error: unknown, fallback: string) => {
	if (axios.isAxiosError(error)) {
		const message = error.response?.data?.error;
		if (typeof message === "string" && message) return message;
	}
	return fallback;
};

export const getAllNews = async () => {
	const res = await axios.get("/news/getAllNewsAdmin");
	return res.data as News[];
};

export const addNews = async (newsData: NewsPayload) => {
	const res = await axios.post("/news/addNews", { newsData });
	return res.data as News;
};

export const updateNews = async (newsId: number, newsData: NewsPayload) => {
	const res = await axios.put(`/news/updateNews/${newsId}`, { newsData });
	return res.data as News;
};

/** Releasing starts a story's price impact the first time only. */
export const setNewsReleased = async (newsId: number, isReleased: boolean) => {
	await axios.patch(`/news/updateReleaseStatus/${newsId}`, { isReleased });
};

export const deleteNews = async (newsId: number) => {
	await axios.delete(`/news/deleteNews/${newsId}`);
};
