import axios from "axios";
import type { Ipo, IpoStatus } from "#/types/ipo";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
axios.defaults.baseURL = BACKEND_URL;
axios.defaults.withCredentials = true;

type IpoFilters = {
	status?: IpoStatus;
	sector?: string;
	symbol?: string;
	is_open_to_subscription?: boolean;
};

// Checked by the backend, which answers with what is wrong.
export type AddIpoPayload = Partial<
	Pick<
	Ipo,
	| "name"
	| "symbol"
	| "sector"
	| "min_price"
	| "max_price"
	| "lot_size"
	| "shares_offered"
	| "listing_price"
	| "subscription_rate"
	| "open_date"
	| "close_date"
	| "allotment_date"
	| "status"
	>
>;

const buildIpoQueryParams = (filters?: IpoFilters) => {
	const params = new URLSearchParams();
	if (filters?.status) params.append("status", filters.status);
	if (filters?.sector) params.append("sector", filters.sector);
	if (filters?.symbol) params.append("symbol", filters.symbol);
	if (filters?.is_open_to_subscription !== undefined) {
		params.append(
			"is_open_to_subscription",
			String(filters.is_open_to_subscription),
		);
	}
	const query = params.toString();
	return query ? `?${query}` : "";
};

export const getAllIpos = async (filters?: IpoFilters) => {
	const res = await axios.get(
		`/ipos/getAllIpos${buildIpoQueryParams(filters)}`,
	);
	return res.data as Ipo[];
};

export const getAllIposAdmin = async (filters?: IpoFilters) => {
	const res = await axios.get(
		`/ipos/getAllIposAdmin${buildIpoQueryParams(filters)}`,
	);
	return res.data as Ipo[];
};

export const getIpoById = async (id: number) => {
	const res = await axios.get(`/ipos/getIpoById/${id}`);
	return res.data as Ipo;
};

export const getIpoByIdAdmin = async (id: number) => {
	const res = await axios.get(`/ipos/getIpoByIdAdmin/${id}`);
	return res.data as Ipo;
};

export const addIpo = async (ipoData: AddIpoPayload) => {
	const res = await axios.post("/ipos/addIpo", ipoData);
	return res.data as { message: string; id: number };
};

/**
 * Uploads an IPO's logo. Any PNG, JPEG or WebP up to 8 MB; the backend
 * re-encodes it as it does stock logos, and copies it to the stock on listing.
 */
export const uploadIpoLogo = async (ipoId: number, file: File) =>
	(
		await axios.put<{ logo_url: string; bytes: number }>(
			`/ipos/${ipoId}/logo`,
			file,
			{
				headers: { "Content-Type": file.type },
			},
		)
	).data;

export const removeIpoLogo = async (ipoId: number) => {
	await axios.delete(`/ipos/${ipoId}/logo`);
};

/** Edits an IPO's details (not its status). Answers with the saved IPO. */
export const updateIpo = async (
	id: number,
	updatedData: Omit<AddIpoPayload, "status">,
) => {
	const res = await axios.put(`/ipos/updateIpo/${id}`, updatedData);
	return res.data as Ipo;
};

export const updateIpoStatus = async (
	id: number,
	status: IpoStatus,
	is_open_to_subscription?: boolean,
) => {
	const res = await axios.patch(`/ipos/updateIpoStatus/${id}`, {
		status,
		is_open_to_subscription,
	});
	return res.data as { message: string };
};

/** Demand for one IPO, counted by the backend. */
export type IpoDemand = {
	applications: number;
	lots_applied: number;
	lots_offered: number;
	subscription_rate: number | null;
};

export const getIpoDemand = async (id: number) => {
	const res = await axios.get(`/ipos/getIpoApplicationsAdmin/${id}`);
	return (res.data as { summary: IpoDemand | null }).summary;
};

export type AllotmentResult = {
	ipo_id: number;
	allotment_price: number;
	offered_lots: number;
	applied_lots: number;
	allotted_lots: number;
	allottees: number;
	refunded: number;
};

/**
 * Shares out the IPO among its applicants and refunds the rest. The IPO must
 * be closed; runs once. The price defaults to the top of the band.
 */
export const runIpoAllotment = async (id: number, allotmentPrice?: number) => {
	const res = await axios.post(`/ipos/runAllotment/${id}`, {
		allotment_price: allotmentPrice,
	});
	return res.data as AllotmentResult;
};

export const deleteIpo = async (id: number) => {
	const res = await axios.delete(`/ipos/deleteIpo/${id}`);
	return res.data as { message: string };
};
