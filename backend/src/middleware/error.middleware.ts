import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { ZodError, ZodIssue } from "zod";

export const errorMiddleware = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction,
) => {
    // Zod validation error
    if (err instanceof ZodError) {
        return res.status(422).json({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "Invalid input",
                details: err.issues.map((e: ZodIssue) => ({
                    // ← errors → issues, thêm ZodIssue type
                    field: e.path.join("."),
                    issue: e.message,
                })),
                timestamp: new Date().toISOString(),
            },
        });
    }

    // Known AppError
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code,
                message: err.message,
                timestamp: new Date().toISOString(),
            },
        });
    }

    // Unknown error
    console.error("[Unhandled Error]", err);
    res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "System error, please try again",
            timestamp: new Date().toISOString(),
        },
    });
};
