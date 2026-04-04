const KEY = "tt_access_token";

// Use sessionStorage so the token survives SPA navigation and page reloads
// within the same browser tab, but is cleared when the tab is closed.
// Falls back to no-op in environments where sessionStorage is unavailable
// (e.g. private browsing with strict settings).

export const setToken = (t: string) => {
    try { sessionStorage.setItem(KEY, t); } catch { /* unavailable */ }
};
export const getToken = (): string | null => {
    try { return sessionStorage.getItem(KEY); } catch { return null; }
};
export const clearToken = () => {
    try { sessionStorage.removeItem(KEY); } catch { /* unavailable */ }
};
