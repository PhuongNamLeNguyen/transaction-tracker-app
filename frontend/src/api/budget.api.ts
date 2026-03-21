import { getToken } from "@/utils/token-utils";
import { config } from "@/utils/config";

const BASE = config.apiBaseUrl;

const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
});

export interface BudgetPeriod {
    id: string;
    startDate: string;
    endDate: string;
}

export interface BudgetSummary {
    income: number;
    expense: number;
    investment: number;
    saving: number;
    currency: string;
}

export interface BudgetProgressItem {
    categoryId: string;
    name: string;
    icon: string;
    budgetAmount: number;
    actualAmount: number;
    utilisationPct: number;
    currency: string;
}

export interface BudgetResponse {
    period: BudgetPeriod | null;
    summary: BudgetSummary;
    budgetProgress: BudgetProgressItem[];
}

export const budgetApi = {
    async getBudget(): Promise<BudgetResponse> {
        const res = await fetch(`${BASE}/budget`, {
            headers: authHeaders(),
            credentials: "include",
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data;
    },
};
