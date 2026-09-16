const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

/**
 * Uploaded images (profile photos, company logos) are stored as backend paths
 * such as "/users/avatar/abc?v=1", resolved here against the API address this
 * app actually reaches. The backend's own idea of its public URL can be a
 * tunnel that changes on every restart. Full URLs, like a sign-in provider's
 * photo, pass through untouched.
 */
export const mediaUrl = (url: string | null | undefined) =>
	!url ? undefined : url.startsWith("/") ? `${API_URL}${url}` : url;
