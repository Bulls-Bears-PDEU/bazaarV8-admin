import {
	adminClient,
	emailOTPClient,
	inferAdditionalFields,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
	baseURL: "http://localhost:3000", // The base URL of your auth server
	plugins: [
		adminClient(),
		emailOTPClient(),
		inferAdditionalFields<{ cash_balance: number }>(),
	], // Add the admin client plugin
});

export type Session = typeof authClient.$Infer.Session;
