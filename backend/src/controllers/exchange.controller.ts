import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";
import { exchangeRepo } from "../repositories/exchange.repo";

export const exchangeController = {
    /** GET /exchange-rate?from=JPY&to=VND */
    getRate: asyncHandler(async (req: Request, res: Response) => {
        const from = String(req.query.from ?? "").toUpperCase();
        const to   = String(req.query.to   ?? "").toUpperCase();

        if (!from || !to) throw new AppError("from and to query params are required", 400, "VALIDATION_ERROR");
        if (from === to) return sendSuccess(res, { from, to, rate: 1 });

        const rate = await exchangeRepo.getRate(from, to);
        if (rate === null) throw new AppError(`No exchange rate for ${from} → ${to}`, 404, "NOT_FOUND");

        sendSuccess(res, { from, to, rate });
    }),
};
