import { Response } from "express";

export const sendSuccess = (
    res: Response,
    data: unknown,
    statusCode: number = 200,
) => {
    res.status(statusCode).json({ success: true, data });
};

export const sendError = (
    res: Response,
    code: string,
    message: string,
    statusCode: number,
    details?: unknown[],
) => {
    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            details,
            timestamp: new Date().toISOString(),
        },
    });
};
