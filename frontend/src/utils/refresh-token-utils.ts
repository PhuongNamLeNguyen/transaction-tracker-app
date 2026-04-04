const KEY = "tt_refresh_token";

// Stores the refresh token in sessionStorage as a fallback for browsers that
// block cross-site HttpOnly cookies (e.g. iOS Safari with ITP enabled).
// The backend still sets the HttpOnly cookie for browsers that support it.

export const setRefreshToken = (t: string) => {
    try { sessionStorage.setItem(KEY, t); } catch { /* unavailable */ }
};
export const getRefreshToken = (): string | null => {
    try { return sessionStorage.getItem(KEY); } catch { return null; }
};
export const clearRefreshToken = () => {
    try { sessionStorage.removeItem(KEY); } catch { /* unavailable */ }
};
