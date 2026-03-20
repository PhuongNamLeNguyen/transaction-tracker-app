import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { userRepo } from "../repositories/user.repo";
import { sessionRepo } from "../repositories/session.repo";
import { AppError } from "../utils/AppError";

// ─── Token helpers ───────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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
    register: async (email: string, password: string) => {
        const existing = await userRepo.findByEmail(email);
        if (existing) {
            throw new AppError("Email already in use", 400, "VALIDATION_ERROR");
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const user = await userRepo.create(email, passwordHash);

        // Tạo user_settings mặc định
        await userRepo.createSettings(user.id);

        // Tạo verification token
        const rawToken = generateRawToken();
        const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
        await sessionRepo.createVerificationToken(user.id, tokenHash);

        // TODO: Gửi email verification — sẽ implement khi có email service
        // emailService.sendVerification(email, rawToken)
        console.log(`[DEV] Verification token for ${email}: ${rawToken}`);

        return { id: user.id, email: user.email };
    },

    // Verify email → set is_verified = true
    verifyEmail: async (rawToken: string, userId: string) => {
        const tokenRecord = await sessionRepo.findVerificationToken(userId);
        if (!tokenRecord) {
            throw new AppError(
                "Token invalid or expired",
                400,
                "VALIDATION_ERROR",
            );
        }

        const valid = await bcrypt.compare(rawToken, tokenRecord.token_hash);
        if (!valid) {
            throw new AppError(
                "Token invalid or expired",
                400,
                "VALIDATION_ERROR",
            );
        }

        await userRepo.setVerified(userId);
        await sessionRepo.expireVerificationToken(tokenRecord.id);
    },

    // Login → trả access token (body) + refresh token (cookie)
    login: async (
        email: string,
        password: string,
        deviceInfo?: string,
        ipAddress?: string,
    ) => {
        const user = await userRepo.findByEmail(email);
        if (!user) {
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
        const expiredAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

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
            user: {
                id: user.id,
                email: user.email,
                isVerified: user.is_verified,
            },
        };
    },

    // Refresh → verify cookie token, rotate session, trả access token mới
    refresh: async (rawRefreshToken: string, userId: string) => {
        const session = await sessionRepo.findActiveSession(userId);
        if (!session) {
            throw new AppError("Invalid refresh token", 401, "UNAUTHORIZED");
        }

        const valid = await bcrypt.compare(
            rawRefreshToken,
            session.refresh_token_hash,
        );
        if (!valid) {
            throw new AppError("Invalid refresh token", 401, "UNAUTHORIZED");
        }

        const user = await userRepo.findById(userId);
        if (!user) {
            throw new AppError("User not found", 401, "UNAUTHORIZED");
        }

        // Session rotation — revoke cũ, tạo mới
        await sessionRepo.revokeSession(session.id);

        const accessToken = signAccessToken(user);
        const rawNewToken = generateRawToken();
        const newTokenHash = await bcrypt.hash(rawNewToken, BCRYPT_ROUNDS);
        const expiredAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

        await sessionRepo.createSession(user.id, newTokenHash, expiredAt);

        return {
            accessToken,
            refreshToken: rawNewToken,
        };
    },

    // Logout → revoke session, clear cookie
    logout: async (userId: string) => {
        await sessionRepo.revokeAllUserSessions(userId);
    },

    // Forgot password → tạo reset token, gửi email
    forgotPassword: async (email: string) => {
        const user = await userRepo.findByEmail(email);

        // Luôn trả 200 dù email không tồn tại — tránh email enumeration
        if (!user) return;

        const rawToken = generateRawToken();
        const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
        await sessionRepo.createPasswordResetToken(user.id, tokenHash);

        // TODO: Gửi email
        console.log(`[DEV] Password reset token for ${email}: ${rawToken}`);
    },

    // Reset password → verify token, update password, revoke tất cả sessions
    resetPassword: async (
        rawToken: string,
        userId: string,
        newPassword: string,
    ) => {
        const tokenRecord = await sessionRepo.findPasswordResetToken(userId);
        if (!tokenRecord) {
            throw new AppError(
                "Token invalid or expired",
                400,
                "VALIDATION_ERROR",
            );
        }

        const valid = await bcrypt.compare(rawToken, tokenRecord.token_hash);
        if (!valid) {
            throw new AppError(
                "Token invalid or expired",
                400,
                "VALIDATION_ERROR",
            );
        }

        const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await userRepo.updatePassword(userId, passwordHash);
        await sessionRepo.markResetTokenUsed(tokenRecord.id);

        // Revoke tất cả sessions — bắt re-login ở tất cả thiết bị
        await sessionRepo.revokeAllUserSessions(userId);
    },
};
