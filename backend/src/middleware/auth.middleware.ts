import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { JwtPayload } from "../services/auth.service";

// Verify JWT — gắn req.user
export const authenticate = (
    req: Request,
    _res: Response,
    next: NextFunction,
) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        return next(
            new AppError("Token not found or invalid", 401, "UNAUTHORIZED"),
        );
    }

    try {
        const token = header.split(" ")[1];
        const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
        req.user = {
            id: payload.sub,
            email: payload.email,
            isVerified: payload.isVerified,
        };
        next();
    } catch {
        next(new AppError("Token not found or invalid", 401, "UNAUTHORIZED"));
    }
};

// Check email verified — dùng sau authenticate
export const requireVerified = (
    req: Request,
    _res: Response,
    next: NextFunction,
) => {
    if (!req.user?.isVerified) {
        return next(
            new AppError("Email not verified", 403, "EMAIL_NOT_VERIFIED"),
        );
    }
    next();
};
