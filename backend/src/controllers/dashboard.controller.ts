import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";
import { dashboardRepo } from "../repositories/dashboard.repo";

export const dashboardController = {
    /** GET /dashboard — aggregated home screen data */
    getDashboard: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;

        // Active budget period (null if not set up yet)
        const period = await dashboardRepo.getActivePeriod(userId);

        // Account balance (null if account not created yet)
        const account = await dashboardRepo.getAccountBalance(userId);

        if (!period) {
            // No active period → return empty dashboard
            return sendSuccess(res, {
                period: null,
                summary: { income: 0, expense: 0, investment: 0, saving: 0, balance: account?.balance ?? 0, currency: account?.currency ?? "VND" },
                categoryBreakdown: { income: [], expense: [], investment: [], saving: [] },
                budgetProgress: [],
                transactions: [],
            });
        }

        // Fetch all data in parallel
        const [summaryRows, breakdownRows, budgetRows, txRows] = await Promise.all([
            dashboardRepo.getSummary(userId, period.id),
            dashboardRepo.getCategoryBreakdown(userId, period.id),
            dashboardRepo.getBudgetProgress(userId, period.id),
            dashboardRepo.getRecentTransactions(userId, period.id),
        ]);

        // Build summary object
        const summary = {
            income: 0, expense: 0, investment: 0, saving: 0,
            balance: account ? Number(account.balance) : 0,
            currency: account?.currency ?? "VND",
        };
        for (const row of summaryRows) {
            const key = row.type as keyof typeof summary;
            if (key in summary) (summary as Record<string, number>)[key] = Number(row.total);
        }

        // Group category breakdown by type
        const categoryBreakdown: Record<string, unknown[]> = {
            income: [], expense: [], investment: [], saving: [],
        };
        for (const row of breakdownRows) {
            const bucket = categoryBreakdown[row.type as string];
            if (bucket) {
                bucket.push({
                    categoryId: row.category_id,
                    name: row.category_name,
                    icon: row.category_icon,
                    total: Number(row.total),
                });
            }
        }

        // Compute percentages per type
        for (const type of Object.keys(categoryBreakdown)) {
            const items = categoryBreakdown[type] as Array<{ total: number; percentage?: number }>;
            const typeTotal = items.reduce((s, i) => s + i.total, 0);
            for (const item of items) {
                item.percentage = typeTotal > 0 ? Math.round((item.total / typeTotal) * 1000) / 10 : 0;
            }
        }

        // Budget progress
        const budgetProgress = budgetRows.map((row) => ({
            categoryId: row.category_id,
            name: row.category_name,
            icon: row.category_icon,
            budgetAmount: Number(row.budget_amount),
            actualAmount: Number(row.actual_amount),
            utilisationPct: row.budget_amount > 0
                ? Math.round((Number(row.actual_amount) / Number(row.budget_amount)) * 1000) / 10
                : 0,
            currency: row.budget_currency,
        }));

        // Transactions
        const transactions = txRows.map((row) => ({
            transactionId: row.id,
            transactionDate: row.transaction_date,
            type: row.type,
            amount: Number(row.amount),
            currency: row.currency,
            merchantName: row.merchant_name ?? null,
            note: row.note ?? null,
            source: row.source,
            splitCount: Number(row.split_count),
            categoryName: row.category_name ?? null,
            categoryIcon: row.category_icon ?? null,
        }));

        sendSuccess(res, {
            period: {
                id: period.id,
                startDate: period.start_date,
                endDate: period.end_date,
            },
            summary,
            categoryBreakdown,
            budgetProgress,
            transactions,
        });
    }),

    /** GET /dashboard/expense-breakdown?year=&month= */
    getExpenseBreakdown: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const now = new Date();
        const year  = parseInt(req.query.year  as string) || now.getFullYear();
        const month = parseInt(req.query.month as string) || now.getMonth() + 1;

        if (month < 1 || month > 12) throw new AppError("Invalid month", 400, "VALIDATION_ERROR");

        const [rows, account] = await Promise.all([
            dashboardRepo.getExpenseBreakdownByMonth(userId, year, month),
            dashboardRepo.getAccountBalance(userId),
        ]);

        const currency = account?.currency ?? "VND";
        const categories = rows.map((r) => ({
            categoryId: r.category_id,
            name:       r.category_name,
            icon:       r.category_icon ?? null,
            amount:     Number(r.total),
            currency,
        }));

        sendSuccess(res, { categories, currency });
    }),

    /** GET /dashboard/cashflow?year=&month= */
    getCashflow: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const now = new Date();
        const year  = parseInt(req.query.year  as string) || now.getFullYear();
        const month = parseInt(req.query.month as string) || now.getMonth() + 1;

        if (month < 1 || month > 12) throw new AppError("Invalid month", 400, "VALIDATION_ERROR");

        const [summaryRows, account] = await Promise.all([
            dashboardRepo.getSummaryByMonth(userId, year, month),
            dashboardRepo.getAccountBalance(userId),
        ]);

        const cashflow = { income: 0, expense: 0, investment: 0, saving: 0, currency: account?.currency ?? "VND" };
        for (const row of summaryRows) {
            if (row.type in cashflow) (cashflow as Record<string, number>)[row.type] = Number(row.total);
        }

        sendSuccess(res, cashflow);
    }),
};
