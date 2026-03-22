import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";
import { dashboardRepo } from "../repositories/dashboard.repo";
import { exchangeRepo } from "../repositories/exchange.repo";

/** Convert a VND amount to the display currency using the given rate. */
function conv(amount: number, rate: number): number {
    if (rate === 1) return amount;
    return parseFloat((amount * rate).toFixed(2));
}

/** Fetch the VND → displayCurrency rate (1 if same or not found). */
async function getRate(accountCurrency: string, displayCurrency: string): Promise<number> {
    if (accountCurrency === displayCurrency) return 1;
    const rate = await exchangeRepo.getRate(accountCurrency, displayCurrency);
    return rate ?? 1;
}

export const dashboardController = {
    /** GET /dashboard — aggregated home screen data */
    getDashboard: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;

        const [period, account, displayCurrency] = await Promise.all([
            dashboardRepo.getActivePeriod(userId),
            dashboardRepo.getAccountBalance(userId),
            dashboardRepo.getDisplayCurrency(userId),
        ]);

        const accountCurrency: string = account?.currency ?? "VND";
        const rate = await getRate(accountCurrency, displayCurrency);

        if (!period) {
            return sendSuccess(res, {
                period: null,
                summary: {
                    income: 0, expense: 0, investment: 0, saving: 0,
                    balance: conv(Number(account?.balance ?? 0), rate),
                    currency: displayCurrency,
                },
                categoryBreakdown: { income: [], expense: [], investment: [], saving: [] },
                budgetProgress: [],
                transactions: [],
                displayCurrency,
            });
        }

        const [summaryRows, breakdownRows, budgetRows, txRows] = await Promise.all([
            dashboardRepo.getSummary(userId, period.id),
            dashboardRepo.getCategoryBreakdown(userId, period.id),
            dashboardRepo.getBudgetProgress(userId, period.id),
            dashboardRepo.getRecentTransactions(userId, period.id),
        ]);

        // Build summary — all amounts converted
        const summaryAmounts: Record<string, number> = { income: 0, expense: 0, investment: 0, saving: 0 };
        for (const row of summaryRows) {
            if (row.type in summaryAmounts) summaryAmounts[row.type] = conv(Number(row.total), rate);
        }
        const summary = {
            ...summaryAmounts,
            balance: conv(account ? Number(account.balance) : 0, rate),
            currency: displayCurrency,
        };

        // Category breakdown — convert totals, recompute percentages after conversion
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
                    total: conv(Number(row.total), rate),
                });
            }
        }

        // Recompute percentages after conversion (ratios are unchanged, but keeps consistency)
        for (const type of Object.keys(categoryBreakdown)) {
            const items = categoryBreakdown[type] as Array<{ total: number; percentage?: number }>;
            const typeTotal = items.reduce((s, i) => s + i.total, 0);
            for (const item of items) {
                item.percentage = typeTotal > 0 ? Math.round((item.total / typeTotal) * 1000) / 10 : 0;
            }
        }

        // Budget progress — convert budgetAmount and actualAmount
        const budgetProgress = budgetRows.map((row) => {
            const budgetAmount = conv(Number(row.budget_amount), rate);
            const actualAmount = conv(Number(row.actual_amount), rate);
            return {
                categoryId: row.category_id,
                name: row.category_name,
                icon: row.category_icon,
                budgetAmount,
                actualAmount,
                utilisationPct: budgetAmount > 0
                    ? Math.round((actualAmount / budgetAmount) * 1000) / 10
                    : 0,
                currency: displayCurrency,
            };
        });

        // Recent transactions — convert amounts
        const transactions = txRows.map((row) => ({
            transactionId: row.id,
            transactionDate: row.transaction_date,
            createdAt: row.created_at,
            type: row.type,
            amount: conv(Number(row.amount), rate),
            currency: displayCurrency,
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
            displayCurrency,
        });
    }),

    /** GET /dashboard/expense-breakdown?year=&month= */
    getExpenseBreakdown: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const now = new Date();
        const year  = parseInt(req.query.year  as string) || now.getFullYear();
        const month = parseInt(req.query.month as string) || now.getMonth() + 1;

        if (month < 1 || month > 12) throw new AppError("Invalid month", 400, "VALIDATION_ERROR");

        const [rows, displayCurrency] = await Promise.all([
            dashboardRepo.getExpenseBreakdownByMonth(userId, year, month),
            dashboardRepo.getDisplayCurrency(userId),
        ]);

        const rate = await getRate("VND", displayCurrency);

        const categories = rows.map((r) => ({
            categoryId: r.category_id,
            name:       r.category_name,
            icon:       r.category_icon ?? null,
            amount:     conv(Number(r.total), rate),
            currency:   displayCurrency,
        }));

        sendSuccess(res, { categories, currency: displayCurrency });
    }),

    /** GET /dashboard/cashflow?year=&month= */
    getCashflow: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const now = new Date();
        const year  = parseInt(req.query.year  as string) || now.getFullYear();
        const month = parseInt(req.query.month as string) || now.getMonth() + 1;

        if (month < 1 || month > 12) throw new AppError("Invalid month", 400, "VALIDATION_ERROR");

        const [summaryRows, displayCurrency] = await Promise.all([
            dashboardRepo.getSummaryByMonth(userId, year, month),
            dashboardRepo.getDisplayCurrency(userId),
        ]);

        const rate = await getRate("VND", displayCurrency);

        const cashflow: Record<string, number | string> = {
            income: 0, expense: 0, investment: 0, saving: 0, currency: displayCurrency,
        };
        for (const row of summaryRows) {
            if (row.type in cashflow) cashflow[row.type] = conv(Number(row.total), rate);
        }

        sendSuccess(res, cashflow);
    }),
};
