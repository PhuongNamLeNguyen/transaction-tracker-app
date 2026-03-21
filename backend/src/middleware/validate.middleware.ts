import { Request, Response, NextFunction } from "express";
import { ZodType, ZodError } from "zod";

export const validate =
    (schema: ZodType) =>
    (req: Request, res: Response, next: NextFunction) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(422).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid input",
                        details: error.issues.map((e) => ({
                            field: e.path.join("."),
                            issue: e.message,
                        })),
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            next(error);
        }
    };
