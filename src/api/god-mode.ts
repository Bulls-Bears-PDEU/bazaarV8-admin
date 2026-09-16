import axios from "axios";
import type { AdminActionList, GodModeView } from "#/types/god-mode";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
axios.defaults.baseURL = BACKEND_URL;
axios.defaults.withCredentials = true;

const forUser = (userId: string) =>
	`/admin/god/users/${encodeURIComponent(userId)}`;

export const getGodModeView = async (userId: string) =>
	(await axios.get<GodModeView>(forUser(userId))).data;

/** Exactly one of delta (add or subtract) or absolute (set outright). */
export const adjustCash = async (
	userId: string,
	body: { delta?: number; absolute?: number; note?: string },
) =>
	(
		await axios.post<{ cash_balance: number; change: number }>(
			`${forUser(userId)}/cash`,
			body,
		)
	).data;

export const openPosition = async (
	userId: string,
	body: { stock_id: number; action: "buy" | "short"; quantity: number },
) => (await axios.post(`${forUser(userId)}/positions`, body)).data;

/** Omit quantity to close the whole position. */
export const closePosition = async (
	userId: string,
	stockId: number,
	quantity?: number,
) =>
	(
		await axios.post(`${forUser(userId)}/positions/${stockId}/close`, {
			quantity,
		})
	).data;

export const flattenUser = async (userId: string) =>
	(
		await axios.post<{ cancelled: number; realized_pnl: number }>(
			`${forUser(userId)}/flatten`,
		)
	).data;

export const cancelUserOrders = async (userId: string) =>
	(await axios.post<{ cancelled: number }>(`${forUser(userId)}/cancel-orders`))
		.data;

export const resetAccount = async (userId: string, wipeHistory: boolean) =>
	(await axios.post(`${forUser(userId)}/reset`, { wipe_history: wipeHistory }))
		.data;

export const cancelAllOrders = async () =>
	(await axios.post<{ cancelled: number }>("/admin/god/orders/cancel-all"))
		.data;

export const listAdminActions = async (query: {
	page?: number;
	page_size?: number;
	user_id?: string;
}) =>
	(await axios.get<AdminActionList>("/admin/god/actions", { params: query }))
		.data;
