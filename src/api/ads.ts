import axios from "axios";
import type { Ad, AdsAdmin } from "#/types/ads";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
axios.defaults.baseURL = BACKEND_URL;
// Allow CORS requests to send cookies for all calls.
axios.defaults.withCredentials = true;

export const getAdsAdmin = async () =>
	(await axios.get<AdsAdmin>("/ads/getAdsAdmin")).data;

/** Shows or hides every ad in the player app at once. */
export const setAdsEnabled = async (enabled: boolean) =>
	(await axios.patch<{ enabled: boolean }>("/ads/setAdsEnabled", { enabled }))
		.data;

/**
 * Uploads a slot's image. Any PNG, JPEG or WebP up to 8 MB; the backend
 * re-encodes it to a WebP at twice the slot's size. Uploading to an empty slot
 * creates its ad, live straight away.
 */
export const uploadAdImage = async (slot: string, file: File) =>
	(
		await axios.put<{ ad: Ad; bytes: number }>(
			`/ads/${encodeURIComponent(slot)}/image`,
			file,
			{ headers: { "Content-Type": file.type } },
		)
	).data;

export const updateAd = async (
	slot: string,
	changes: Partial<Pick<Ad, "sponsor" | "link_url" | "is_active">>,
) => (await axios.patch<Ad>(`/ads/${encodeURIComponent(slot)}`, changes)).data;

export const removeAd = async (slot: string) => {
	await axios.delete(`/ads/${encodeURIComponent(slot)}`);
};
