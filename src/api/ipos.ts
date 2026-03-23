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

export type AddIpoPayload = Omit<Ipo, "id" | "created_at" | "updated_at"> & {
	store_as_dormant?: boolean;
};

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
	return res.data as { message: string };
};

export const updateIpo = async (
	id: number,
	updatedData: Partial<Omit<Ipo, "id" | "created_at" | "updated_at">>,
) => {
	const res = await axios.put(`/ipos/updateIpo/${id}`, updatedData);
	return res.data as { message: string };
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

export const deleteIpo = async (id: number) => {
	const res = await axios.delete(`/ipos/deleteIpo/${id}`);
	return res.data as { message: string };
};
