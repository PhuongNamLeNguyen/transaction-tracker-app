import { getToken } from "@/utils/token-utils";
import { config } from "@/utils/config";

const BASE = config.apiBaseUrl;

const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
});

export interface PlanPeriod {
    id: string;
    startDate: string;
    endDate: string;
}

export interface PlanSummary {
    income: number;
    expense: number;
    investment: number;
    saving: number;
    currency: string;
}

export interface PlanProgressItem {
    categoryId: string;
    name: string;
    icon: string;
    planAmount: number;
    actualAmount: number;
    utilisationPct: number;
    currency: string;
}

export interface PlanResponse {
    period: PlanPeriod | null;
    summary: PlanSummary;
    planProgress: PlanProgressItem[];
}

export const planApi = {
    async getPlan(): Promise<PlanResponse> {
        const res = await fetch(`${BASE}/budget`, {
            headers: authHeaders(),
            credentials: "include",
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data;
    },
};
