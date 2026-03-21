import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { settingsRepo } from "../repositories/settings.repo";

export const settingsController = {
    /** GET /settings */
    getSettings: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { preferences, account } = await settingsRepo.getSettings(userId);

        sendSuccess(res, {
            preferences: preferences
                ? {
                    theme:         preferences.theme ?? "light",
                    targetCurrency: preferences.target_currency ?? "VND",
                    cycleStartDay:  preferences.cycle_start_day ?? null,
                    systemLanguage: preferences.system_language ?? "vi",
                    timeZone:       preferences.time_zone ?? "Asia/Ho_Chi_Minh",
                }
                : null,
            account: account
                ? {
                    id:       account.id,
                    name:     account.name,
                    currency: account.currency,
                    balance:  Number(account.balance),
                }
                : null,
        });
    }),

    /** PATCH /settings */
    updateSettings: asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { theme, targetCurrency, cycleStartDay, systemLanguage, timeZone } = req.body;

        const ALLOWED_THEMES = ["light", "dark"];
        if (theme !== undefined && !ALLOWED_THEMES.includes(theme)) {
            return sendSuccess(res, { updated: false });
        }

        await settingsRepo.updateSettings(userId, {
            ...(theme            !== undefined && { theme }),
            ...(targetCurrency   !== undefined && { targetCurrency }),
            ...(cycleStartDay    !== undefined && { cycleStartDay: Number(cycleStartDay) }),
            ...(systemLanguage   !== undefined && { systemLanguage }),
            ...(timeZone         !== undefined && { timeZone }),
        });

        sendSuccess(res, { updated: true });
    }),
};
