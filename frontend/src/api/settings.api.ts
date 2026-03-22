import { getToken } from "@/utils/token-utils";
import { config } from "@/utils/config";

const BASE = config.apiBaseUrl;

const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
});

export interface UserPreferences {
    theme: "light" | "dark";
    targetCurrency: string;
    cycleStartDay: number | null;
    systemLanguage: string;
    timeZone: string;
}

export interface UserAccount {
    id: string;
    name: string;
    currency: string;
    balance: number;
}

export interface SettingsResponse {
    preferences: UserPreferences | null;
    account: UserAccount | null;
}

export type UpdateSettingsDto = Partial<{
    theme: "light" | "dark";
    targetCurrency: string;
    cycleStartDay: number;
    systemLanguage: string;
    timeZone: string;
}>;

export const settingsApi = {
    async getSettings(): Promise<SettingsResponse> {
        const res = await fetch(`${BASE}/settings`, {
            headers: authHeaders(),
            credentials: "include",
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data;
    },

    async updateSettings(dto: UpdateSettingsDto): Promise<void> {
        const res = await fetch(`${BASE}/settings`, {
            method: "PATCH",
            headers: authHeaders(),
            credentials: "include",
            body: JSON.stringify(dto),
        });
        if (!res.ok) throw await res.json();
    },

    async updateName(name: string): Promise<void> {
        const res = await fetch(`${BASE}/settings`, {
            method: "PATCH",
            headers: authHeaders(),
            credentials: "include",
            body: JSON.stringify({ name }),
        });
        if (!res.ok) throw await res.json();
    },
};
