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
        const { name, theme, targetCurrency, cycleStartDay, systemLanguage, timeZone } = req.body;

        if (name !== undefined) {
            const trimmed = String(name).trim();
            if (!trimmed || trimmed.length > 100) {
                return sendSuccess(res, { updated: false });
            }
            await settingsRepo.updateUserName(userId, trimmed);
        }

        const ALLOWED_THEMES = ["light", "dark"];
        if (theme !== undefined && !ALLOWED_THEMES.includes(theme)) {
            return sendSuccess(res, { updated: false });
        }

        const parsedCycleStartDay = cycleStartDay !== undefined ? Number(cycleStartDay) : undefined;

        await settingsRepo.updateSettings(userId, {
            ...(theme                 !== undefined && { theme }),
            ...(targetCurrency        !== undefined && { targetCurrency }),
            ...(parsedCycleStartDay   !== undefined && { cycleStartDay: parsedCycleStartDay }),
            ...(systemLanguage        !== undefined && { systemLanguage }),
            ...(timeZone              !== undefined && { timeZone }),
        });

        if (parsedCycleStartDay !== undefined) {
            await settingsRepo.updateMostRecentPeriodDates(userId, parsedCycleStartDay);
        }

        sendSuccess(res, { updated: true });
    }),
};
