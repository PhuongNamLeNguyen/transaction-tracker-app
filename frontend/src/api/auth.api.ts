import { getToken } from "@/utils/token-utils";
import { config } from "@/utils/config";

const BASE = config.apiBaseUrl;

/* ─── Headers ─── */
const jsonHeaders = () => ({
    "Content-Type": "application/json",
});

const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
});

/* ────────────────────────────────────────────────────────────
   DTOs — khớp với backend authService params
───────────────────────────────────────────────────────────── */

export interface LoginDto {
    email: string;
    password: string;
    rememberMe: boolean; // backend dùng để set cookie TTL: true=30d / false=1d
}

export interface RegisterDto {
    email: string;
    password: string;
    name: string; // backend authService.register nhận name
}

/* ────────────────────────────────────────────────────────────
   Response shapes — khớp với những gì backend trả về
───────────────────────────────────────────────────────────── */

/** Trả về sau login / refresh — có accessToken */
export interface LoginResponse {
    accessToken: string;
    refreshToken: string; // raw token đã được set vào HttpOnly cookie, FE không cần dùng trực tiếp
    rememberMe: boolean;
    user: {
        id: string;
        email: string;
        isVerified: boolean;
    };
}

/** Trả về sau register — KHÔNG có accessToken (phải verify email trước) */
export interface RegisterResponse {
    id: string;
    email: string;
    name: string;
}

/** Trả về sau refresh — backend KHÔNG trả rememberMe trong refresh */
export interface RefreshResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        isVerified: boolean;
    };
}

/* ────────────────────────────────────────────────────────────
   Auth API
───────────────────────────────────────────────────────────── */
export const authApi = {
    /**
     * POST /auth/login
     * Backend: authService.login(email, password, rememberMe, deviceInfo, ipAddress)
     * - rememberMe=true  → refresh token TTL 30 ngày
     * - rememberMe=false → refresh token TTL 1 ngày
     * Returns: { accessToken, refreshToken, rememberMe, user }
     * Refresh token được set vào HttpOnly cookie bởi controller
     */
    async login(dto: LoginDto): Promise<LoginResponse> {
        const res = await fetch(`${BASE}/auth/login`, {
            method: "POST",
            headers: jsonHeaders(),
            credentials: "include", // gửi & nhận cookie (refresh token)
            body: JSON.stringify({
                email: dto.email,
                password: dto.password,
                rememberMe: dto.rememberMe,
            }),
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data;
    },

    /**
     * POST /auth/register
     * Backend: authService.register(email, password, name)
     * Returns: { id, email, name } — KHÔNG trả token
     * User phải verify email trước khi login
     */
    async register(dto: RegisterDto): Promise<RegisterResponse> {
        const res = await fetch(`${BASE}/auth/register`, {
            method: "POST",
            headers: jsonHeaders(),
            body: JSON.stringify({
                email: dto.email,
                password: dto.password,
                name: dto.name,
            }),
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data;
    },

    /**
     * POST /auth/refresh
     * Backend: authService.refresh(rawRefreshToken, userId)
     * Cookie HttpOnly tự động gửi lên — FE không cần đọc refresh token
     * Returns: { accessToken, refreshToken, user }
     */
    async refresh(): Promise<RefreshResponse> {
        const res = await fetch(`${BASE}/auth/refresh`, {
            method: "POST",
            headers: jsonHeaders(),
            credentials: "include", // gửi cookie chứa refresh token
        });
        if (!res.ok) throw await res.json();
        return (await res.json()).data;
    },

    /**
     * POST /auth/logout
     * Backend: authService.logout(userId) → revokeAllUserSessions
     * Xoá tất cả sessions của user
     */
    async logout(): Promise<void> {
        const res = await fetch(`${BASE}/auth/logout`, {
            method: "POST",
            headers: authHeaders(),
            credentials: "include",
        });
        if (!res.ok) throw await res.json();
    },

    /**
     * POST /auth/forgot-password
     * Backend: authService.forgotPassword(email)
     * Luôn trả 200 dù email không tồn tại (tránh email enumeration)
     */
    async forgotPassword(email: string): Promise<void> {
        const res = await fetch(`${BASE}/auth/forgot-password`, {
            method: "POST",
            headers: jsonHeaders(),
            body: JSON.stringify({ email }),
        });
        if (!res.ok) throw await res.json();
    },

    /**
     * POST /auth/reset-password
     * Backend: authService.resetPassword(rawToken, newPassword)
     * Sau reset → revoke tất cả sessions → user phải login lại
     */
    async resetPassword(token: string, newPassword: string): Promise<void> {
        const res = await fetch(`${BASE}/auth/reset-password`, {
            method: "POST",
            headers: jsonHeaders(),
            body: JSON.stringify({ token, newPassword }),
        });
        if (!res.ok) throw await res.json();
    },

    /**
     * POST /auth/verify-email
     * Backend: authService.verifyEmail(rawToken)
     */
    async verifyEmail(rawToken: string): Promise<void> {
        const res = await fetch(`${BASE}/auth/verify-email`, {
            method: "POST",
            headers: jsonHeaders(),
            // field name 'rawToken' khớp với backend authService.verifyEmail(rawToken)
            body: JSON.stringify({ rawToken }),
        });
        if (!res.ok) throw await res.json();
    },
};
