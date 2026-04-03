import { query } from "../db/client";

export const sessionRepo = {
    // ─── Sessions (refresh tokens) ───────────────────────────

    createSession: async (
        userId: string,
        refreshTokenHash: string,
        expiredAt: Date,
        deviceInfo?: string,
        ipAddress?: string,
    ) => {
        const result = await query(
            `INSERT INTO sessions
         (user_id, refresh_token_hash, expired_at, device_info, ip_address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
            [
                userId,
                refreshTokenHash,
                expiredAt,
                deviceInfo ?? null,
                ipAddress ?? null,
            ],
        );
        return result.rows[0];
    },

    // Tìm session active theo hash — dùng để verify refresh token
    findActiveSession: async (userId: string) => {
        const result = await query(
            `SELECT * FROM sessions
       WHERE user_id = $1
         AND revoked_at IS NULL
         AND expired_at > now()
       ORDER BY created_at DESC
       LIMIT 1`,
            [userId],
        );
        return result.rows[0] ?? null;
    },
    findActiveSessionByToken: async (rawToken: string) => {
        const bcrypt = await import("bcryptjs");
        // Limit scan to sessions created within the longest TTL (30 days)
        // to avoid scanning all sessions in the database
        const result = await query(
            `SELECT * FROM sessions
         WHERE revoked_at IS NULL
           AND expired_at > now()
           AND created_at > now() - interval '31 days'
         ORDER BY created_at DESC
         LIMIT 500`,
        );

        for (const session of result.rows) {
            const valid = await bcrypt.compare(
                rawToken,
                session.refresh_token_hash,
            );
            if (valid) return session;
        }

        return null;
    },

    revokeSession: async (sessionId: string) => {
        await query(`UPDATE sessions SET revoked_at = now() WHERE id = $1`, [
            sessionId,
        ]);
    },

    revokeAllUserSessions: async (userId: string) => {
        await query(
            `UPDATE sessions SET revoked_at = now()
       WHERE user_id = $1 AND revoked_at IS NULL`,
            [userId],
        );
    },

    // ─── Verification tokens ─────────────────────────────────

    createVerificationToken: async (userId: string, tokenHash: string) => {
        // 24 hour expiry
        await query(
            `INSERT INTO verification_tokens (user_id, token_hash, expired_at)
       VALUES ($1, $2, now() + interval '24 hours')`,
            [userId, tokenHash],
        );
    },

    findVerificationToken: async (userId: string) => {
        const result = await query(
            `SELECT * FROM verification_tokens
       WHERE user_id = $1
         AND expired_at > now()
       ORDER BY created_at DESC
       LIMIT 1`,
            [userId],
        );
        return result.rows[0] ?? null;
    },

    expireVerificationToken: async (id: string) => {
        await query(
            `UPDATE verification_tokens SET expired_at = now() WHERE id = $1`,
            [id],
        );
    },

    expireAllVerificationTokens: async (userId: string) => {
        await query(
            `UPDATE verification_tokens SET expired_at = now() WHERE user_id = $1`,
            [userId],
        );
    },

    findVerificationTokenByHash: async (rawToken: string) => {
        // Lấy token còn hạn trong 24h (đúng với TTL) — giới hạn scan
        const result = await query(
            `SELECT * FROM verification_tokens
     WHERE expired_at > now()
       AND created_at > now() - interval '25 hours'
     ORDER BY created_at DESC
     LIMIT 200`,
        );
        return result.rows; // trả về array để service tự bcrypt.compare
    },
    findAllActivePasswordResetTokens: async () => {
        const result = await query(
            `SELECT * FROM password_reset_tokens
     WHERE expired_at > now()
       AND used_at IS NULL
       AND created_at > now() - interval '2 hours'
     ORDER BY created_at DESC
     LIMIT 200`,
        );
        return result.rows;
    },

    // ─── Password reset tokens ───────────────────────────────

    createPasswordResetToken: async (userId: string, tokenHash: string) => {
        // 1 hour expiry
        await query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expired_at)
       VALUES ($1, $2, now() + interval '1 hour')`,
            [userId, tokenHash],
        );
    },

    findPasswordResetToken: async (userId: string) => {
        const result = await query(
            `SELECT * FROM password_reset_tokens
       WHERE user_id = $1
         AND expired_at > now()
         AND used_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
            [userId],
        );
        return result.rows[0] ?? null;
    },

    markResetTokenUsed: async (id: string) => {
        await query(
            `UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`,
            [id],
        );
    },
};
