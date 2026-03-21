import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";
import { transactionsRepo } from "../repositories/transactions.repo";

export const transactionsController = {
    /** GET /transactions?year=&month=&type=&category_id= */
    list: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;

        const now = new Date();
        const year = parseInt(req.query.year as string) || now.getFullYear();
        const month = parseInt(req.query.month as string) || now.getMonth() + 1;
        const type = (req.query.type as string) || undefined;
        const categoryId = (req.query.category_id as string) || undefined;

        if (month < 1 || month > 12) throw new AppError("Invalid month", 400, "VALIDATION_ERROR");

        const rows = await transactionsRepo.listByMonth(userId, year, month, type, categoryId);

        const transactions = rows.map((row) => ({
            id: row.id,
            type: row.type,
            amount: Number(row.amount),
            currency: row.currency,
            transactionDate: row.transaction_date,
            createdAt: row.created_at,
            note: row.note ?? null,
            source: row.source,
            merchantName: row.merchant_name ?? null,
            splitCount: Number(row.split_count),
            categoryName: row.category_name ?? null,
            categoryIcon: row.category_icon ?? null,
        }));

        sendSuccess(res, { transactions });
    }),

    /** GET /transactions/categories?type= */
    getCategories: asyncHandler(async (req: Request, res: Response) => {
        const type = (req.query.type as string) || "expense";
        const allowed = ["income", "expense", "investment", "saving"];
        if (!allowed.includes(type)) throw new AppError("Invalid type", 400, "VALIDATION_ERROR");

        const rows = await transactionsRepo.getCategoriesByType(type);
        const categories = rows.map((r) => ({
            id: r.id,
            name: r.name,
            icon: r.icon ?? null,
            type: r.type,
        }));

        sendSuccess(res, categories);
    }),

    /** GET /transactions/:id */
    getById: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { id } = req.params;

        const tx = await transactionsRepo.getById(userId, id);
        if (!tx) throw new AppError("Transaction not found", 404, "RESOURCE_NOT_FOUND");

        sendSuccess(res, {
            id: tx.id,
            type: tx.type,
            amount: Number(tx.amount),
            currency: tx.currency,
            transactionDate: tx.transaction_date,
            createdAt: tx.created_at,
            note: tx.note ?? null,
            source: tx.source,
            merchantName: tx.merchant_name ?? null,
            receiptImageUrl: tx.receipt_image_url ?? null,
            splits: tx.splits.map((s: Record<string, unknown>) => ({
                id: s.id,
                amount: Number(s.amount),
                categoryId: s.category_id,
                categoryName: s.category_name,
                categoryIcon: s.category_icon,
            })),
        });
    }),
};
