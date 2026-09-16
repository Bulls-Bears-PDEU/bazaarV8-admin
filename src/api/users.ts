import axios from "axios";
import type { BulkAction, BulkResult, UserDetail, UserList, UserListQuery, UserStats } from "#/types/users";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
axios.defaults.baseURL = BACKEND_URL;
axios.defaults.withCredentials = true;

/** The backend's own sentence for a failed request, when it sent one. */
export const usersErrorMessage = (error: unknown, fallback: string) => {
	if (axios.isAxiosError(error)) {
		const message = error.response?.data?.error ?? error.response?.data?.message;
		if (typeof message === "string" && message) return message;
	}
	return fallback;
};

export const listUsers = async (query: UserListQuery) =>
	(await axios.get<UserList>("/admin/users", { params: query })).data;

export const getUserStats = async () => (await axios.get<UserStats>("/admin/users/stats")).data;

export const getUserDetail = async (userId: string) =>
	(await axios.get<UserDetail>(`/admin/users/${encodeURIComponent(userId)}`)).data;

export const updateUser = async (
	userId: string,
	data: { name?: string; remove_avatar?: boolean; cash_balance?: number },
) => (await axios.patch<UserDetail>(`/admin/users/${encodeURIComponent(userId)}`, data)).data;

export const runBulkAction = async (input: {
	action: BulkAction;
	user_ids: string[];
	reason?: string;
	// Omitted for a permanent ban.
	duration_seconds?: number;
}) => (await axios.post<BulkResult>("/admin/users/bulk", input)).data;
