import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";
import { userRepo } from "../repositories/user.repo";
import { sessionRepo } from "../repositories/session.repo";
import { AppError } from "../utils/AppError";
import { emailService } from "./email.service";

// ─── Token helpers ───────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30 ngày — có tích
const REFRESH_TOKEN_TTL_NO_REMEMBER_MS = 24 * 60 * 60 * 1000; // 1 ngày  — không tích

export interface JwtPayload {
    sub: string;
    email: string;
    isVerified: boolean;
    iat: number;
    exp: number;
}

const signAccessToken = (user: {
    id: string;
    email: string;
    is_verified: boolean;
}) =>
    jwt.sign(
        { sub: user.id, email: user.email, isVerified: user.is_verified },
        env.jwtSecret,
        { expiresIn: ACCESS_TOKEN_TTL },
    );

const generateRawToken = () => crypto.randomBytes(32).toString("hex");

// ─── Auth service ────────────────────────────────────────────

export const authService = {
    // Register → tạo user + settings + verification token
    // Trả về { id, email } — KHÔNG trả token (phải verify email trước)
    register: async (email: string, password: string, name: string) => {
        const existing = await userRepo.findByEmail(email);
        if (existing) {
            throw new AppError("Email already in use", 400, "VALIDATION_ERROR");
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const user = await userRepo.create(email, passwordHash, name); // ← thêm name

        await userRepo.createSettings(user.id);

        const rawToken = generateRawToken();
        const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
        await sessionRepo.createVerificationToken(user.id, tokenHash);

        await emailService.sendVerificationEmail(email, name, rawToken);

        return { id: user.id, email: user.email, name: user.name };
    },

    // Verify email → set is_verified = true
    verifyEmail: async (rawToken: string) => {
        // bỏ userId
        // Lấy tất cả token còn hạn
        const tokens = await sessionRepo.findVerificationTokenByHash(rawToken);
        if (!tokens.length) {
            throw new AppError(
                "Token invalid or expired",
                400,
                "VALIDATION_ERROR",
            );
        }

        // So sánh bcrypt từng token
        let matched = null;
        for (const t of tokens) {
            const valid = await bcrypt.compare(rawToken, t.token_hash);
            if (valid) {
                matched = t;
                break;
            }
        }

        if (!matched) {
            throw new AppError(
                "Token invalid or expired",
                400,
                "VALIDATION_ERROR",
            );
        }

        await userRepo.setVerified(matched.user_id);
        await sessionRepo.expireVerificationToken(matched.id);
    },

    // Login → trả access token (body) + refresh token (cookie)
    login: async (
        email: string,
        password: string,
        rememberMe: boolean = false,
        deviceInfo?: string,
        ipAddress?: string,
    ) => {
        const user = await userRepo.findByEmail(email);
        if (!user) {
            throw new AppError("Invalid credentials", 401, "UNAUTHORIZED");
        }

        if (!user.password_hash) {
            // OAuth-only account — no password set
            throw new AppError("Invalid credentials", 401, "UNAUTHORIZED");
        }

        const validPassword = await bcrypt.compare(
            password,
            user.password_hash,
        );
        if (!validPassword) {
            throw new AppError("Invalid credentials", 401, "UNAUTHORIZED");
        }

        if (!user.is_verified) {
            throw new AppError("Email not verified", 403, "EMAIL_NOT_VERIFIED");
        }

        const accessToken = signAccessToken(user);
        const rawRefreshToken = generateRawToken();
        const refreshTokenHash = await bcrypt.hash(
            rawRefreshToken,
            BCRYPT_ROUNDS,
        );
        const ttl = rememberMe
            ? REFRESH_TOKEN_TTL_REMEMBER_MS
            : REFRESH_TOKEN_TTL_NO_REMEMBER_MS;
        const expiredAt = new Date(Date.now() + ttl); // ← dùng ttl

        await sessionRepo.createSession(
            user.id,
            refreshTokenHash,
            expiredAt,
            deviceInfo,
            ipAddress,
        );

        return {
            accessToken,
            refreshToken: rawRefreshToken, // raw token → set vào cookie
            rememberMe,
            user: {
                id: user.id,
                email: user.email,
                name: user.name ?? "",
                isVerified: user.is_verified,
            },
        };
    },

    // Refresh → verify cookie token, rotate session, trả access token mới
    refresh: async (rawRefreshToken: string) => {
        const session = await sessionRepo.findActiveSessionByToken(rawRefreshToken);
        if (!session) {
            throw new AppError("Invalid refresh token", 401, "UNAUTHORIZED");
        }

        const user = await userRepo.findById(session.user_id);
        if (!user) {
            throw new AppError("User not found", 401, "UNAUTHORIZED");
        }

        // Session rotation — revoke cũ, tạo mới
        await sessionRepo.revokeSession(session.id);

        const accessToken = signAccessToken(user);
        const rawNewToken = generateRawToken();
        const newTokenHash = await bcrypt.hash(rawNewToken, BCRYPT_ROUNDS);
        const expiredAt = new Date(Date.now() + REFRESH_TOKEN_TTL_REMEMBER_MS);

        await sessionRepo.createSession(user.id, newTokenHash, expiredAt);

        return {
            accessToken,
            refreshToken: rawNewToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name ?? "",
                isVerified: user.is_verified,
            },
        };
    },

    // Logout → revoke session, clear cookie
    logout: async (userId: string) => {
        await sessionRepo.revokeAllUserSessions(userId);
    },

    // Google OAuth → exchange code for user info, find/create user, issue tokens
    handleGoogleOAuth: async (
        code: string,
        deviceInfo?: string,
        ipAddress?: string,
    ) => {
        const oauth2Client = new OAuth2Client(
            env.googleClientId,
            env.googleClientSecret,
            env.googleRedirectUri,
        );

        const { tokens } = await oauth2Client.getToken(code);
        if (!tokens.id_token) {
            throw new AppError("Google authentication failed", 401, "UNAUTHORIZED");
        }

        const ticket = await oauth2Client.verifyIdToken({
            idToken: tokens.id_token,
            audience: env.googleClientId,
        });
        const payload = ticket.getPayload();
        if (!payload?.sub || !payload.email) {
            throw new AppError("Google authentication failed", 401, "UNAUTHORIZED");
        }

        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name ?? email.split("@")[0];

        // Find existing user by google_id, then by email (for account linking)
        let user = await userRepo.findByGoogleId(googleId);

        if (!user) {
            user = await userRepo.findByEmail(email);
            if (user) {
                // Link Google to existing email account
                await userRepo.linkGoogleId(user.id, googleId);
                user = await userRepo.findById(user.id);
            } else {
                // Brand new user via Google
                user = await userRepo.createOAuthUser(email, name, googleId);
                await userRepo.createSettings(user.id);
            }
        }

        const accessToken = signAccessToken({
            id: user.id,
            email: user.email,
            is_verified: true,
        });
        const rawRefreshToken = generateRawToken();
        const refreshTokenHash = await bcrypt.hash(rawRefreshToken, BCRYPT_ROUNDS);
        const expiredAt = new Date(Date.now() + REFRESH_TOKEN_TTL_REMEMBER_MS);

        await sessionRepo.createSession(
            user.id,
            refreshTokenHash,
            expiredAt,
            deviceInfo,
            ipAddress,
        );

        return {
            accessToken,
            refreshToken: rawRefreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name ?? "",
                isVerified: true,
            },
        };
    },

    // Forgot password → tạo reset token, gửi email
    forgotPassword: async (email: string) => {
        const user = await userRepo.findByEmail(email);

        // Luôn trả 200 dù email không tồn tại — tránh email enumeration
        if (!user) return;

        const rawToken = generateRawToken();
        const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
        await sessionRepo.createPasswordResetToken(user.id, tokenHash);

        await emailService.sendPasswordResetEmail(email, user.name ?? email.split("@")[0], rawToken);
    },

    // Reset password → verify token, update password, revoke tất cả sessions
    resetPassword: async (rawToken: string, newPassword: string) => {
        // bỏ userId
        // Tìm tất cả token còn hạn rồi bcrypt.compare từng cái
        const tokens = await sessionRepo.findAllActivePasswordResetTokens();
        if (!tokens.length) {
            throw new AppError(
                "Token invalid or expired",
                400,
                "VALIDATION_ERROR",
            );
        }

        let matched = null;
        for (const t of tokens) {
            const valid = await bcrypt.compare(rawToken, t.token_hash);
            if (valid) {
                matched = t;
                break;
            }
        }

        if (!matched) {
            throw new AppError(
                "Token invalid or expired",
                400,
                "VALIDATION_ERROR",
            );
        }

        const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await userRepo.updatePassword(matched.user_id, passwordHash);
        await sessionRepo.markResetTokenUsed(matched.id);
        await sessionRepo.revokeAllUserSessions(matched.user_id);
    },
};
