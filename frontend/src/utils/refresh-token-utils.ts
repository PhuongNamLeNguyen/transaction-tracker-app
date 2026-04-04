const KEY = "tt_refresh_token";

// Stores the refresh token in localStorage as a fallback for browsers that
// block cross-site HttpOnly cookies (e.g. iOS Safari with ITP enabled).
// The backend still sets the HttpOnly cookie for browsers that support it.
// localStorage persists across browser restarts (unlike sessionStorage).

export const setRefreshToken = (t: string) => {
    try { localStorage.setItem(KEY, t); } catch { /* unavailable */ }
};
export const getRefreshToken = (): string | null => {
    try { return localStorage.getItem(KEY); } catch { return null; }
};
export const clearRefreshToken = () => {
    try { localStorage.removeItem(KEY); } catch { /* unavailable */ }
};
