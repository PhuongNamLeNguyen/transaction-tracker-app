import { getToken } from "@/utils/token-utils";
import { config } from "@/utils/config";

const BASE = config.apiBaseUrl;

const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
});

/* ─── Types ─── */
export type TransactionType = "income" | "expense" | "investment" | "saving";

export interface TxListItem {
    id: string;
    type: TransactionType;
    amount: number;
    currency: string;
    transactionDate: string;
    createdAt: string;
    note: string | null;
    source: string;
    merchantName: string | null;
    splitCount: number;
    categoryName: string | null;
    categoryIcon: string | null;
}

export interface TxSplit {
    id: string;
    amount: number;
    categoryId: string;
    categoryName: string;
    categoryIcon: string | null;
}

export interface TxDetail {
    id: string;
    type: TransactionType;
    amount: number;
    currency: string;
    transactionDate: string;
    createdAt: string;
    note: string | null;
    source: string;
    merchantName: string | null;
    receiptImageUrl: string | null;
    splits: TxSplit[];
}

export interface TxCategory {
    id: string;
    name: string;
    icon: string | null;
    type: string;
}

export interface CreateTransactionDto {
    type: TransactionType;
    amount: number;
    transactionDate: string; // YYYY-MM-DD
    categoryId: string;
    note?: string;
}

export interface CreateTransactionResponse {
    id: string;
    type: TransactionType;
    amount: number;
    currency: string;
    transactionDate: string;
    note: string | null;
    createdAt: string;
}

/* ─── API ─── */
export const transactionsApi = {
    /** GET /transactions?year=&month=&type=&category_id= */
    async list(params: {
        year: number;
        month: number;
        type?: string;
        category_id?: string;
    }): Promise<TxListItem[]> {
        const qs = new URLSearchParams({
            year: String(params.year),
            month: String(params.month),
            ...(params.type ? { type: params.type } : {}),
            ...(params.category_id ? { category_id: params.category_id } : {}),
        });
        const res = await fetch(`${BASE}/transactions?${qs}`, {
            headers: authHeaders(),
            credentials: "include",
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data.transactions;
    },

    /** GET /transactions/categories?type= */
    async getCategories(type: TransactionType): Promise<TxCategory[]> {
        const res = await fetch(`${BASE}/transactions/categories?type=${type}`, {
            headers: authHeaders(),
            credentials: "include",
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data;
    },

    /** GET /transactions/:id */
    async getById(id: string): Promise<TxDetail> {
        const res = await fetch(`${BASE}/transactions/${id}`, {
            headers: authHeaders(),
            credentials: "include",
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data;
    },

    /** POST /transactions */
    async create(dto: CreateTransactionDto): Promise<CreateTransactionResponse> {
        const res = await fetch(`${BASE}/transactions`, {
            method: "POST",
            headers: authHeaders(),
            credentials: "include",
            body: JSON.stringify(dto),
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data;
    },
};
