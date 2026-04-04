import { getToken } from "@/utils/token-utils";
import { config } from "@/utils/config";

const BASE = config.apiBaseUrl;

const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
});

/* ─── Response shapes ─── */

export interface DashboardPeriod {
    id: string;
    startDate: string;
    endDate: string;
}

export interface DashboardSummary {
    income: number;
    expense: number;
    investment: number;
    saving: number;
    balance: number;
    currency: string;
}

export interface CategoryBreakdownItem {
    categoryId: string;
    name: string;
    icon: string;
    total: number;
    percentage: number;
}

export interface CategoryBreakdown {
    income: CategoryBreakdownItem[];
    expense: CategoryBreakdownItem[];
    investment: CategoryBreakdownItem[];
    saving: CategoryBreakdownItem[];
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

export interface DashboardTransaction {
    transactionId: string;
    transactionDate: string;
    createdAt: string;
    type: "income" | "expense" | "investment" | "saving";
    amount: number;
    currency: string;
    merchantName: string | null;
    note: string | null;
    source: string;
    splitCount: number;
    categoryName: string | null;
    categoryIcon: string | null;
}

export interface DashboardResponse {
    period: DashboardPeriod | null;
    summary: DashboardSummary;
    categoryBreakdown: CategoryBreakdown;
    planProgress: PlanProgressItem[];
    transactions: DashboardTransaction[];
    displayCurrency: string;
}

export interface ExpenseBreakdownItem {
    categoryId: string;
    name: string;
    icon: string | null;
    amount: number;
    currency: string;
}

export interface ExpenseBreakdown {
    categories: ExpenseBreakdownItem[];
    currency: string;
}

export interface CashflowSummary {
    income: number;
    expense: number;
    investment: number;
    saving: number;
    currency: string;
}

/* ─── Dashboard API ─── */
export const dashboardApi = {
    async getDashboard(): Promise<DashboardResponse> {
        const res = await fetch(`${BASE}/dashboard`, {
            headers: authHeaders(),
            credentials: "include",
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data;
    },

    async getExpenseBreakdown(startDate: string, endDate: string): Promise<ExpenseBreakdown> {
        const res = await fetch(`${BASE}/dashboard/expense-breakdown?startDate=${startDate}&endDate=${endDate}`, {
            headers: authHeaders(),
            credentials: "include",
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data;
    },

    async getCashflow(startDate: string, endDate: string): Promise<CashflowSummary> {
        const res = await fetch(`${BASE}/dashboard/cashflow?startDate=${startDate}&endDate=${endDate}`, {
            headers: authHeaders(),
            credentials: "include",
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data;
    },
};
