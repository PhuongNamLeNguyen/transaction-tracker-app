import { getToken } from "@/utils/token-utils";
import { config } from "@/utils/config";

const BASE = config.apiBaseUrl;

const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
});

/* ─── Types ─── */
export interface Category {
    id: string;
    name: string;
}

export interface OnboardingSetupDto {
    cycleStartDay: number;
    targetCurrency: string;
    budgets: Array<{ categoryId: string; amount: number }>;
}

/* ─── API ─── */
export const onboardingApi = {
    /** GET /onboarding/status → { needsSetup: boolean } */
    async getStatus(): Promise<{ needsSetup: boolean }> {
        const res = await fetch(`${BASE}/onboarding/status`, {
            headers: authHeaders(),
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data;
    },

    /** GET /onboarding/categories → Category[] */
    async getCategories(): Promise<Category[]> {
        const res = await fetch(`${BASE}/onboarding/categories`, {
            headers: authHeaders(),
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data;
    },

    /** POST /onboarding/budget-setup */
    async setup(dto: OnboardingSetupDto): Promise<void> {
        const res = await fetch(`${BASE}/onboarding/budget-setup`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(dto),
        });
        if (!res.ok) throw await res.json();
    },
};
