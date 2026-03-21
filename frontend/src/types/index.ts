/* frontend/src/types/index.ts */

// ─── Enums ───
export enum TransactionType {
    INCOME = "income",
    EXPENSE = "expense",
    INVESTMENT = "investment",
    SAVING = "saving",
}

export enum TransactionStatus {
    PROCESSING = "processing",
    READY = "ready",
    CONFIRMED = "confirmed",
}

export enum TransactionSource {
    MANUAL = "manual",
    RECEIPT_SCAN = "receipt_scan",
}

export enum Theme {
    LIGHT = "light",
    DARK = "dark",
}

// ─── Core Entities ───
export interface User {
    id: string;
    email: string;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UserSettings {
    userId: string;
    theme: Theme;
    cycleStartDay: string;
    targetCurrency: string;
    systemLanguage: string;
    timeZone: string;
    createdAt: string;
    updatedAt: string;
}

export interface Account {
    id: string;
    userId: string;
    name: string;
    type: string;
    currency: string;
    balance: number;
    createdAt: string;
    updatedAt: string;
}

export interface Category {
    id: string;
    name: string;
    type: TransactionType;
    icon: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Transaction {
    id: string;
    userId: string;
    accountId: string;
    type: TransactionType;
    amount: number;
    currency: string;
    merchantId: string | null;
    status: TransactionStatus;
    source: TransactionSource;
    transactionDate: string;
    note: string | null;
    createdAt: string;
    updatedAt: string;
    splits?: TransactionSplit[];
    merchant?: Merchant | null;
}

export interface TransactionSplit {
    id: string;
    transactionId: string;
    categoryId: string;
    amount: number;
    createdAt: string;
    updatedAt: string;
    category?: Category;
}

export interface Merchant {
    id: string;
    name: string;
    normalizedName: string;
    defaultCategoryId: string | null;
    country: string | null;
    logoUrl: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface BudgetPeriod {
    id: string;
    userId: string;
    startDate: string;
    endDate: string;
    createdAt: string;
    budgets?: Budget[];
}

export interface Budget {
    id: string;
    periodId: string;
    categoryId: string;
    amount: number;
    currency: string;
    createdAt: string;
    category?: Category;
}

export interface TransactionSuggestion {
    merchantName: string | null;
    totalAmount: number;
    currency: string;
    transactionDate: string;
    aiSuggestedCategory: {
        id: string | null;
        name: string;
        confidence: number;
    } | null;
    items: { name: string; qty: number; price: number }[];
}

// ─── API Shapes ───
export interface ApiResponse<T> {
    success: true;
    data: T;
}

export interface PaginatedResponse<T> {
    success: true;
    data: T[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: { field: string; issue: string }[];
        timestamp: string;
    };
}

// ─── DTOs ───
export interface CreateTransactionDto {
    type: TransactionType;
    amount: number;
    currency: string;
    accountId: string;
    categoryId: string;
    merchantId?: string;
    note?: string;
    transactionDate: string;
    imageUrl?: string;
}

export interface UpdateTransactionDto {
    type?: TransactionType;
    amount?: number;
    currency?: string;
    accountId?: string;
    categoryId?: string;
    merchantId?: string;
    note?: string;
    transactionDate?: string;
}

export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterDto {
    email: string;
    password: string;
}
