import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";

const REFRESH_COOKIE_NAME = "refresh_token";
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/api/v1/auth/refresh",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

export const authController = {
    register: asyncHandler(async (req: Request, res: Response) => {
        const { email, password, name } = req.body; // ← thêm name
        const data = await authService.register(email, password, name);
        sendSuccess(res, data, 201);
    }),

    verifyEmail: asyncHandler(async (req: Request, res: Response) => {
        const { token } = req.query as { token: string }; // bỏ userId
        await authService.verifyEmail(token);
        sendSuccess(res, { message: "Email verified. You may now log in." });
    }),

    login: asyncHandler(async (req: Request, res: Response) => {
        const { email, password, rememberMe = false } = req.body;
        const deviceInfo = req.headers["user-agent"];
        const ipAddress = req.ip;

        const result = await authService.login(
            email,
            password,
            rememberMe,
            deviceInfo,
            ipAddress,
        );

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict" as const,
            path: "/api/v1/auth/refresh",
            ...(result.rememberMe ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
        };

        res.cookie("refresh_token", result.refreshToken, cookieOptions);
        sendSuccess(res, {
            accessToken: result.accessToken,
            user: result.user,
            rememberMe: result.rememberMe,
        });
    }),

    refresh: asyncHandler(async (req: Request, res: Response) => {
        const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
        if (!rawToken) {
            throw Object.assign(new Error("Refresh token missing"), {
                statusCode: 401,
                code: "UNAUTHORIZED",
            });
        }

        // Cần userId — decode token để lấy (không verify vì có thể expired)
        // Dùng session repo tìm theo cookie token
        // Tạm thời: decode không verify để lấy sub
        const decoded = JSON.parse(
            Buffer.from(rawToken.split(".")[1] ?? "", "base64").toString(),
        ) as { sub?: string };

        if (!decoded.sub) {
            throw Object.assign(new Error("Invalid refresh token"), {
                statusCode: 401,
                code: "UNAUTHORIZED",
            });
        }

        const { accessToken, refreshToken } = await authService.refresh(
            rawToken,
            decoded.sub,
        );

        // Rotate cookie
        res.cookie(REFRESH_COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
        sendSuccess(res, { accessToken });
    }),

    logout: asyncHandler(async (req: Request, res: Response) => {
        if (req.user?.id) {
            await authService.logout(req.user.id);
        }

        // Clear cookie
        res.clearCookie(REFRESH_COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: 0 });
        sendSuccess(res, { message: "Logged out" });
    }),

    forgotPassword: asyncHandler(async (req: Request, res: Response) => {
        const { email } = req.body;
        await authService.forgotPassword(email);
        // Luôn 200 dù email không tồn tại
        sendSuccess(res, {
            message: "If that email exists, a reset link has been sent.",
        });
    }),

    resetPassword: asyncHandler(async (req: Request, res: Response) => {
        const { token, newPassword } = req.body; // bỏ userId
        await authService.resetPassword(token, newPassword);
        sendSuccess(res, { message: "Password reset. Please log in again." });
    }),
};
