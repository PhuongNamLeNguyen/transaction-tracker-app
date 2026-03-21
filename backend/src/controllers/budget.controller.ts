import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { dashboardRepo } from "../repositories/dashboard.repo";

export const budgetController = {
    /** GET /budget — active period with budget progress + period totals */
    getBudget: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;

        const period = await dashboardRepo.getActivePeriod(userId);

        if (!period) {
            return sendSuccess(res, {
                period:         null,
                summary:        { income: 0, expense: 0, investment: 0, saving: 0, currency: "VND" },
                budgetProgress: [],
            });
        }

        const [summaryRows, budgetRows] = await Promise.all([
            dashboardRepo.getSummary(userId, period.id),
            dashboardRepo.getBudgetProgress(userId, period.id),
        ]);

        const summary = { income: 0, expense: 0, investment: 0, saving: 0, currency: "VND" };
        for (const row of summaryRows) {
            const key = row.type as keyof typeof summary;
            if (key in summary) (summary as Record<string, number>)[key] = Number(row.total);
        }

        const budgetProgress = budgetRows.map((row) => ({
            categoryId:    row.category_id,
            name:          row.category_name,
            icon:          row.category_icon,
            budgetAmount:  Number(row.budget_amount),
            actualAmount:  Number(row.actual_amount),
            utilisationPct: row.budget_amount > 0
                ? Math.round((Number(row.actual_amount) / Number(row.budget_amount)) * 1000) / 10
                : 0,
            currency: row.budget_currency,
        }));

        // Use currency from first budget row if available
        if (budgetRows.length > 0) summary.currency = budgetRows[0].budget_currency;

        sendSuccess(res, {
            period: {
                id:        period.id,
                startDate: period.start_date,
                endDate:   period.end_date,
            },
            summary,
            budgetProgress,
        });
    }),
};
