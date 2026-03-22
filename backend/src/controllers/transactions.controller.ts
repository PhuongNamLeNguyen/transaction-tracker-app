import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";
import { transactionsRepo } from "../repositories/transactions.repo";

const createManualSchema = z.object({
    type: z.enum(["income", "expense", "investment", "saving"]),
    amount: z.number().positive(),
    transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    categoryId: z.string().uuid(),
    note: z.string().max(500).optional(),
});

const createReceiptSchema = z.object({
    type: z.enum(["income", "expense", "investment", "saving"]),
    transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    receiptId: z.string().uuid(),
    note: z.string().max(500).optional(),
    items: z
        .array(z.object({ categoryId: z.string().uuid(), amount: z.number().positive() }))
        .min(1),
});

export const transactionsController = {
    /** GET /transactions?year=&month=&type=&category_id= — year/month optional */
    list: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;

        const yearStr  = req.query.year  as string | undefined;
        const monthStr = req.query.month as string | undefined;
        const year     = yearStr  ? (parseInt(yearStr)  || undefined) : undefined;
        const month    = monthStr ? (parseInt(monthStr) || undefined) : undefined;
        const type = (req.query.type as string) || undefined;
        const categoryId = (req.query.category_id as string) || undefined;

        if (month != null && (month < 1 || month > 12))
            throw new AppError("Invalid month", 400, "VALIDATION_ERROR");

        const rows = await transactionsRepo.list(userId, year, month, type, categoryId);

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

    /** POST /transactions — supports manual entry and receipt_scan */
    create: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;

        // Receipt-scan path: body contains receiptId + items[]
        if (req.body.receiptId) {
            const parsed = createReceiptSchema.safeParse(req.body);
            if (!parsed.success) {
                throw new AppError(
                    parsed.error.issues[0]?.message ?? "Invalid input",
                    400,
                    "VALIDATION_ERROR",
                );
            }
            const { type, transactionDate, receiptId, note, items } = parsed.data;
            const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

            const account = await transactionsRepo.getUserAccount(userId);
            const tx = await transactionsRepo.createFromReceipt({
                userId,
                accountId: account.id,
                type,
                amount: totalAmount,
                currency: account.currency,
                transactionDate,
                receiptId,
                note,
                items,
            });

            res.status(201).json({
                success: true,
                data: {
                    id: tx.id,
                    type: tx.type,
                    amount: Number(tx.amount),
                    currency: tx.currency,
                    transactionDate: tx.transaction_date,
                    note: tx.note ?? null,
                    createdAt: tx.created_at,
                },
            });
            return;
        }

        // Manual entry path
        const parsed = createManualSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input", 400, "VALIDATION_ERROR");
        }
        const { type, amount, transactionDate, categoryId, note } = parsed.data;

        const account = await transactionsRepo.getUserAccount(userId);
        const tx = await transactionsRepo.create({
            userId,
            accountId: account.id,
            type,
            amount,
            currency: account.currency,
            transactionDate,
            categoryId,
            note,
        });

        res.status(201).json({
            success: true,
            data: {
                id: tx.id,
                type: tx.type,
                amount: Number(tx.amount),
                currency: tx.currency,
                transactionDate: tx.transaction_date,
                note: tx.note ?? null,
                createdAt: tx.created_at,
            },
        });
    }),

    /** DELETE /transactions/:id — soft-delete entire transaction */
    deleteTransaction: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { id } = req.params;
        const deleted = await transactionsRepo.softDeleteTransaction(userId, id);
        if (!deleted) throw new AppError("Transaction not found", 404, "RESOURCE_NOT_FOUND");
        sendSuccess(res, { success: true });
    }),

    /** DELETE /transactions/:id/splits/:splitId — soft-delete */
    deleteSplit: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { id: transactionId, splitId } = req.params;
        const deleted = await transactionsRepo.softDeleteSplit(userId, transactionId, splitId);
        if (!deleted) throw new AppError("Split not found", 404, "RESOURCE_NOT_FOUND");
        sendSuccess(res, { success: true });
    }),

    /** DELETE /transactions/:id/splits/:splitId/permanent — hard-delete */
    hardDeleteSplit: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { id: transactionId, splitId } = req.params;
        const deleted = await transactionsRepo.hardDeleteSplit(userId, transactionId, splitId);
        if (!deleted) throw new AppError("Split not found or not deleted", 404, "RESOURCE_NOT_FOUND");
        sendSuccess(res, { success: true });
    }),

    /** DELETE /transactions/splits/permanent — bulk hard-delete */
    bulkHardDeleteSplits: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { splitIds } = req.body as { splitIds?: unknown };
        if (!Array.isArray(splitIds) || splitIds.length === 0) {
            throw new AppError("splitIds must be a non-empty array", 400, "VALIDATION_ERROR");
        }
        const count = await transactionsRepo.bulkHardDeleteSplits(userId, splitIds as string[]);
        sendSuccess(res, { deleted: count });
    }),

    /** PATCH /transactions/:id/splits/:splitId/restore — restore */
    restoreSplit: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { id: transactionId, splitId } = req.params;
        const restored = await transactionsRepo.restoreSplit(userId, transactionId, splitId);
        if (!restored) throw new AppError("Split not found or not deleted", 404, "RESOURCE_NOT_FOUND");
        sendSuccess(res, { success: true });
    }),

    /** PATCH /transactions/splits/restore — bulk restore */
    bulkRestoreSplits: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { splitIds } = req.body as { splitIds?: unknown };
        if (!Array.isArray(splitIds) || splitIds.length === 0) {
            throw new AppError("splitIds must be a non-empty array", 400, "VALIDATION_ERROR");
        }
        const count = await transactionsRepo.bulkRestoreSplits(userId, splitIds as string[]);
        sendSuccess(res, { restored: count });
    }),

    /** GET /transactions/deleted — list soft-deleted transactions */
    getDeletedTransactions: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const rows = await transactionsRepo.getDeletedTransactions(userId);
        sendSuccess(res, rows.map((r) => ({
            id: r.id,
            transactionId: r.id,
            transactionType: r.transaction_type,
            amount: Number(r.amount),
            currency: r.currency,
            transactionDate: r.transaction_date,
            categoryId: "",
            categoryName: r.note ?? "",
            categoryIcon: null,
            deletedAt: r.deleted_at,
            entityType: "transaction",
        })));
    }),

    /** PATCH /transactions/:id/restore — restore soft-deleted transaction */
    restoreTransaction: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { id } = req.params;
        const restored = await transactionsRepo.restoreTransaction(userId, id);
        if (!restored) throw new AppError("Transaction not found", 404, "RESOURCE_NOT_FOUND");
        sendSuccess(res, { success: true });
    }),

    /** DELETE /transactions/:id/permanent — hard-delete soft-deleted transaction */
    hardDeleteTransaction: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { id } = req.params;
        const deleted = await transactionsRepo.hardDeleteTransaction(userId, id);
        if (!deleted) throw new AppError("Transaction not found", 404, "RESOURCE_NOT_FOUND");
        sendSuccess(res, { success: true });
    }),

    /** GET /transactions/splits/deleted — list soft-deleted splits */
    getDeletedSplits: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const rows = await transactionsRepo.getDeletedSplits(userId);
        const splits = rows.map((r) => ({
            id: r.id,
            transactionId: r.transaction_id,
            transactionType: r.transaction_type,
            amount: Number(r.amount),
            currency: r.currency,
            transactionDate: r.transaction_date,
            categoryId: r.category_id,
            categoryName: r.category_name,
            categoryIcon: r.category_icon ?? null,
            deletedAt: r.deleted_at,
        }));
        sendSuccess(res, { splits });
    }),

    /** GET /transactions/:id */
    getById: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { id } = req.params;

        const tx = await transactionsRepo.getById(userId, String(id));
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
