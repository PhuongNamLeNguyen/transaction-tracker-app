import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";
import { onboardingRepo } from "../repositories/onboarding.repo";

export const onboardingController = {
    /* GET /onboarding/status — check if user needs setup */
    getStatus: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const [hasPeriod, settings] = await Promise.all([
            onboardingRepo.hasBudgetPeriod(userId),
            onboardingRepo.getUserSettings(userId),
        ]);
        const needsSetup =
            !hasPeriod ||
            !settings?.cycle_start_day ||
            !settings?.target_currency;
        sendSuccess(res, { needsSetup });
    }),

    /* GET /onboarding/categories — expense categories list */
    getCategories: asyncHandler(async (_req: Request, res: Response) => {
        const categories = await onboardingRepo.getExpenseCategories();
        sendSuccess(res, categories);
    }),

    /* POST /onboarding/budget-setup — save settings + create budget period */
    setup: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { cycleStartDay, targetCurrency, budgets } = req.body;

        // ─── Validate ───────────────────────────────────────────────
        const day = Number(cycleStartDay);
        if (!Number.isInteger(day) || day < 1 || day > 28) {
            throw new AppError(
                "cycleStartDay phải là số nguyên từ 1 đến 28",
                400,
                "VALIDATION_ERROR",
            );
        }
        if (!targetCurrency || typeof targetCurrency !== "string") {
            throw new AppError(
                "targetCurrency là bắt buộc",
                400,
                "VALIDATION_ERROR",
            );
        }
        if (!Array.isArray(budgets) || budgets.length === 0) {
            throw new AppError(
                "Phải có ít nhất một khoản chi tiêu",
                400,
                "VALIDATION_ERROR",
            );
        }
        for (const b of budgets) {
            if (!b.categoryId || typeof b.categoryId !== "string") {
                throw new AppError(
                    "categoryId không hợp lệ",
                    400,
                    "VALIDATION_ERROR",
                );
            }
            if (typeof b.amount !== "number" || b.amount <= 0) {
                throw new AppError(
                    "Số tiền phải lớn hơn 0",
                    400,
                    "VALIDATION_ERROR",
                );
            }
        }

        // Verify all category IDs exist
        const categoryIds: string[] = budgets.map(
            (b: { categoryId: string }) => b.categoryId,
        );
        const validIds = await onboardingRepo.verifyCategoryIds(categoryIds);
        if (validIds.length !== categoryIds.length) {
            throw new AppError(
                "Một hoặc nhiều categoryId không tồn tại",
                400,
                "VALIDATION_ERROR",
            );
        }

        // ─── Write ───────────────────────────────────────────────────
        try {
            // 1. Update user_settings
            await onboardingRepo.updateUserSettings(userId, day, targetCurrency);

            // 2. Create budget_period
            const period = await onboardingRepo.createBudgetPeriod(userId, day);

            // 3. Create budgets
            await onboardingRepo.createBudgets(period.id, budgets, targetCurrency);
        } catch (dbErr: unknown) {
            const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
            console.error("[onboarding.setup] DB error:", msg);
            throw new AppError(
                `DB error: ${msg}`,
                500,
                "INTERNAL_SERVER_ERROR",
            );
        }

        sendSuccess(res, { success: true }, 201);
    }),
};
