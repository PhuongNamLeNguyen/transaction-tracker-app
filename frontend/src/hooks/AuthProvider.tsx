import { useState, useEffect, useCallback } from "react";
import {
    AuthContext,
    type AuthUser,
    type AuthStatus,
} from "@/hooks/AuthContext";
import { authApi, type RefreshResponse } from "@/api/auth.api";
import { setToken, clearToken } from "@/utils/token-utils";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [status, setStatus] = useState<AuthStatus>("loading");

    /* ── Silent refresh khi app khởi động ──
     Backend: authService.refresh(rawRefreshToken, userId)
     - Đọc HttpOnly cookie tự động (credentials: include)
     - Trả: { accessToken, refreshToken, user } — KHÔNG có rememberMe
  */
    useEffect(() => {
        let cancelled = false;

        const silentRefresh = async () => {
            try {
                const res: RefreshResponse = await authApi.refresh();
                if (cancelled) return;
                setToken(res.accessToken);
                setUser({
                    id: res.user.id,
                    email: res.user.email,
                    isVerified: res.user.isVerified,
                });
                setStatus("authenticated");
            } catch {
                // Cookie hết hạn / không tồn tại → backend throw UNAUTHORIZED
                if (cancelled) return;
                clearToken();
                setUser(null);
                setStatus("unauthenticated");
            }
        };

        silentRefresh();
        return () => {
            cancelled = true;
        };
    }, []);

    /* ── Logout ──
     Backend: authService.logout(userId) → revokeAllUserSessions
     FE gửi Bearer token để backend xác định userId
  */
    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } catch {
            // Bỏ qua lỗi network — vẫn clear local state
        } finally {
            clearToken();
            setUser(null);
            setStatus("unauthenticated");
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, status, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
