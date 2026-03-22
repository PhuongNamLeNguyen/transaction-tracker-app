import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { authService } from "../services/auth.service";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

const REFRESH_COOKIE_NAME = "refresh_token";
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

export const authController = {
    register: asyncHandler(async (req: Request, res: Response) => {
        const { email, password, name } = req.body; // ← thêm name
        const data = await authService.register(email, password, name);
        sendSuccess(res, data, 201);
    }),

    verifyEmail: asyncHandler(async (req: Request, res: Response) => {
        const rawToken = req.body?.rawToken;

        if (!rawToken) {
            throw Object.assign(new Error("rawToken is required"), {
                statusCode: 400,
                code: "BAD_REQUEST",
            });
        }
        await authService.verifyEmail(rawToken);
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
            sameSite: "lax" as const,
            path: "/",
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

        const { accessToken, refreshToken, user } = await authService.refresh(rawToken);

        res.cookie(REFRESH_COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
        sendSuccess(res, { accessToken, user });
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

    googleRedirect: asyncHandler(async (_req: Request, res: Response) => {
        if (!env.googleClientId) {
            throw new AppError("Google OAuth is not configured", 501, "NOT_IMPLEMENTED");
        }
        const oauth2Client = new OAuth2Client(
            env.googleClientId,
            env.googleClientSecret,
            env.googleRedirectUri,
        );
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: ["email", "profile"],
            prompt: "select_account",
        });
        res.redirect(authUrl);
    }),

    googleCallback: asyncHandler(async (req: Request, res: Response) => {
        const { code, error } = req.query;

        if (error || !code) {
            return res.redirect(`${env.frontendUrl}/login?error=oauth_cancelled`);
        }

        try {
            const result = await authService.handleGoogleOAuth(
                code as string,
                req.headers["user-agent"],
                req.ip,
            );

            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax" as const,
                path: "/",
                maxAge: 30 * 24 * 60 * 60 * 1000,
            };

            res.cookie("refresh_token", result.refreshToken, cookieOptions);

            const userEncoded = Buffer.from(JSON.stringify(result.user)).toString("base64url");
            res.redirect(
                `${env.frontendUrl}/oauth/callback#access_token=${result.accessToken}&user=${userEncoded}`,
            );
        } catch {
            res.redirect(`${env.frontendUrl}/login?error=oauth_failed`);
        }
    }),
};
