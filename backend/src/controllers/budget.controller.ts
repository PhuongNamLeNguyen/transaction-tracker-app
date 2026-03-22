import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { dashboardRepo } from "../repositories/dashboard.repo";
import { exchangeRepo } from "../repositories/exchange.repo";

function conv(amount: number, rate: number): number {
    if (rate === 1) return amount;
    return parseFloat((amount * rate).toFixed(2));
}

export const budgetController = {
    /** GET /budget — active period with budget progress + period totals */
    getBudget: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;

        const [period, displayCurrency] = await Promise.all([
            dashboardRepo.getActivePeriod(userId),
            dashboardRepo.getDisplayCurrency(userId),
        ]);

        // Fetch VND → displayCurrency rate
        const rate = displayCurrency === "VND"
            ? 1
            : (await exchangeRepo.getRate("VND", displayCurrency)) ?? 1;

        if (!period) {
            return sendSuccess(res, {
                period:       null,
                summary:      { income: 0, expense: 0, investment: 0, saving: 0, currency: displayCurrency },
                planProgress: [],
            });
        }

        const [summaryRows, budgetRows] = await Promise.all([
            dashboardRepo.getSummary(userId, period.id),
            dashboardRepo.getBudgetProgress(userId, period.id),
        ]);

        const summary = { income: 0, expense: 0, investment: 0, saving: 0, currency: displayCurrency };
        for (const row of summaryRows) {
            const key = row.type as keyof typeof summary;
            if (key in summary) (summary as unknown as Record<string, number>)[key] = conv(Number(row.total), rate);
        }

        const planProgress = budgetRows.map((row) => {
            const planAmount   = conv(Number(row.budget_amount),  rate);
            const actualAmount = conv(Number(row.actual_amount),  rate);
            return {
                categoryId:     row.category_id,
                name:           row.category_name,
                icon:           row.category_icon,
                planAmount,
                actualAmount,
                utilisationPct: planAmount > 0
                    ? Math.round((actualAmount / planAmount) * 1000) / 10
                    : 0,
                currency: displayCurrency,
            };
        });

        sendSuccess(res, {
            period: {
                id:        period.id,
                startDate: period.start_date,
                endDate:   period.end_date,
            },
            summary,
            planProgress,
        });
    }),
};
