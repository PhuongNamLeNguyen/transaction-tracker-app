import { useState, useEffect, useCallback, useRef } from "react";
import {
    AuthContext,
    type AuthUser,
    type AuthStatus,
} from "@/hooks/AuthContext";
import { authApi, type RefreshResponse } from "@/api/auth.api";
import { onboardingApi } from "@/api/onboarding.api";
import { setToken, clearToken } from "@/utils/token-utils";
import { clearRefreshToken } from "@/utils/refresh-token-utils";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [status, setStatus] = useState<AuthStatus>("loading");
    const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
    // Tracks whether login() was called explicitly (e.g. OAuth callback, manual login).
    // Prevents silentRefresh from overriding authenticated state if it completes later.
    const wasManuallyLoggedIn = useRef(false);

    /* ── Kiểm tra onboarding status sau khi có access token ──
       Nếu API không tồn tại (chưa deploy) → fallback assume đã onboard
    */
    const checkOnboarding = useCallback(async () => {
        try {
            const { needsSetup } = await onboardingApi.getStatus();
            setIsOnboarded(!needsSetup);
        } catch {
            setIsOnboarded(true); // fallback: assume onboarded
        }
    }, []);

    /* ── Silent refresh khi app khởi động ── */
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
                    name: res.user.name ?? "",
                    isVerified: res.user.isVerified,
                });
                await checkOnboarding();
                if (cancelled) return;
                setStatus("authenticated");
            } catch {
                if (cancelled) return;
                // If login() was called in the meantime (e.g. OAuth callback),
                // don't override the authenticated state with the failed refresh.
                if (wasManuallyLoggedIn.current) return;
                clearToken();
                setUser(null);
                setIsOnboarded(null);
                setStatus("unauthenticated");
            }
        };

        silentRefresh();
        return () => {
            cancelled = true;
        };
    }, [checkOnboarding]);

    /* ── Login — gọi sau khi login thành công ──
       Sync state updates happen before await so ProtectedRoute
       sees status="authenticated" + isOnboarded=null (shows loading)
       while onboarding check resolves in background.
    */
    const login = useCallback(
        (authUser: AuthUser) => {
            wasManuallyLoggedIn.current = true;
            setUser(authUser);
            setIsOnboarded(null); // unknown until checked
            setStatus("authenticated");
            // Fire-and-forget: check onboarding, then reveal
            checkOnboarding();
        },
        [checkOnboarding],
    );

    /* ── completeOnboarding — gọi sau khi wizard hoàn tất ── */
    const completeOnboarding = useCallback(() => {
        setIsOnboarded(true);
    }, []);

    /* ── Logout ── */
    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } catch {
            // Bỏ qua lỗi network — vẫn clear local state
        } finally {
            clearToken();
            clearRefreshToken();
            setUser(null);
            setIsOnboarded(null);
            setStatus("unauthenticated");
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{ user, status, isOnboarded, login, logout, completeOnboarding }}
        >
            {children}
        </AuthContext.Provider>
    );
};
