import { getToken } from "@/utils/token-utils";
import { config } from "@/utils/config";

const BASE = config.apiBaseUrl;

const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
});

export const exchangeApi = {
    /** Returns the rate: 1 unit of `from` = rate units of `to`. Returns null if not found. */
    async getRate(from: string, to: string): Promise<number | null> {
        if (from === to) return 1;
        const res = await fetch(`${BASE}/exchange-rate?from=${from}&to=${to}`, {
            headers: authHeaders(),
            credentials: "include",
        });
        if (res.status === 404) return null;
        if (!res.ok) throw await res.json();
        return (await res.json()).data.rate as number;
    },
};
