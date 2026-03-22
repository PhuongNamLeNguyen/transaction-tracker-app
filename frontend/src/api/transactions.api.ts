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

export interface CreateReceiptTransactionDto {
    type: TransactionType;
    transactionDate: string; // YYYY-MM-DD
    receiptId: string;
    note?: string;
    items: { categoryId: string; amount: number }[];
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

export interface DeletedSplitItem {
    id: string;
    transactionId: string;
    transactionType: TransactionType;
    amount: number;
    currency: string;
    transactionDate: string;
    categoryId: string;
    categoryName: string;
    categoryIcon: string | null;
    deletedAt: string;
    entityType?: "split" | "transaction";
}

/* ─── API ─── */
export const transactionsApi = {
    /** GET /transactions?year=&month=&type=&category_id= — year/month optional */
    async list(params: {
        year?: number;
        month?: number;
        type?: string;
        category_id?: string;
    }): Promise<TxListItem[]> {
        const qs = new URLSearchParams({
            ...(params.year  != null ? { year:  String(params.year)  } : {}),
            ...(params.month != null ? { month: String(params.month) } : {}),
            ...(params.type        ? { type:        params.type        } : {}),
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

    /** POST /transactions — manual entry */
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

    /** POST /transactions — receipt scan (multi-split) */
    async createFromReceipt(dto: CreateReceiptTransactionDto): Promise<CreateTransactionResponse> {
        const res = await fetch(`${BASE}/transactions`, {
            method: "POST",
            headers: authHeaders(),
            credentials: "include",
            body: JSON.stringify(dto),
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data;
    },

    /** DELETE /transactions/:id — soft-delete entire transaction */
    async deleteTransaction(id: string): Promise<void> {
        const res = await fetch(`${BASE}/transactions/${id}`, {
            method: "DELETE",
            headers: authHeaders(),
            credentials: "include",
        });
        if (!res.ok) throw await res.json();
    },

    /** DELETE /transactions/:id/splits/:splitId — soft-delete */
    async deleteSplit(transactionId: string, splitId: string): Promise<void> {
        const res = await fetch(`${BASE}/transactions/${transactionId}/splits/${splitId}`, {
            method: "DELETE",
            headers: authHeaders(),
            credentials: "include",
        });
        if (!res.ok) throw await res.json();
    },

    /** DELETE /transactions/:id/splits/:splitId/permanent — hard-delete */
    async hardDeleteSplit(transactionId: string, splitId: string): Promise<void> {
        const res = await fetch(`${BASE}/transactions/${transactionId}/splits/${splitId}/permanent`, {
            method: "DELETE",
            headers: authHeaders(),
            credentials: "include",
        });
        if (!res.ok) throw await res.json();
    },

    /** DELETE /transactions/splits/permanent — bulk hard-delete */
    async bulkHardDeleteSplits(splitIds: string[]): Promise<{ deleted: number }> {
        const res = await fetch(`${BASE}/transactions/splits/permanent`, {
            method: "DELETE",
            headers: authHeaders(),
            credentials: "include",
            body: JSON.stringify({ splitIds }),
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data;
    },

    /** PATCH /transactions/:id/splits/:splitId/restore — restore */
    async restoreSplit(transactionId: string, splitId: string): Promise<void> {
        const res = await fetch(`${BASE}/transactions/${transactionId}/splits/${splitId}/restore`, {
            method: "PATCH",
            headers: authHeaders(),
            credentials: "include",
        });
        if (!res.ok) throw await res.json();
    },

    /** PATCH /transactions/splits/restore — bulk restore */
    async bulkRestoreSplits(splitIds: string[]): Promise<{ restored: number }> {
        const res = await fetch(`${BASE}/transactions/splits/restore`, {
            method: "PATCH",
            headers: authHeaders(),
            credentials: "include",
            body: JSON.stringify({ splitIds }),
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data;
    },

    /** GET /transactions/splits/deleted */
    async getDeletedSplits(): Promise<DeletedSplitItem[]> {
        const res = await fetch(`${BASE}/transactions/splits/deleted`, {
            headers: authHeaders(),
            credentials: "include",
        });
        if (!res.ok) throw await res.json();
        const splits: DeletedSplitItem[] = (await res.json()).data.splits;
        return splits.map((s) => ({ ...s, entityType: "split" as const }));
    },

    /** GET /transactions/deleted — soft-deleted transactions */
    async getDeletedTransactions(): Promise<DeletedSplitItem[]> {
        const res = await fetch(`${BASE}/transactions/deleted`, {
            headers: authHeaders(),
            credentials: "include",
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data;
    },

    /** PATCH /transactions/:id/restore */
    async restoreTransaction(id: string): Promise<void> {
        const res = await fetch(`${BASE}/transactions/${id}/restore`, {
            method: "PATCH",
            headers: authHeaders(),
            credentials: "include",
        });
        if (!res.ok) throw await res.json();
    },

    /** DELETE /transactions/:id/permanent */
    async hardDeleteTransaction(id: string): Promise<void> {
        const res = await fetch(`${BASE}/transactions/${id}/permanent`, {
            method: "DELETE",
            headers: authHeaders(),
            credentials: "include",
        });
        if (!res.ok) throw await res.json();
    },
};
