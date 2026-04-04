import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setToken } from "@/utils/token-utils";
import { setRefreshToken } from "@/utils/refresh-token-utils";
import { useAuth } from "@/hooks/useAuth";
import { Icon } from "@/components/common/Icon";

export const OAuthCallbackPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const userStr = params.get("user");

        if (!accessToken || !userStr) {
            navigate("/login?error=oauth_failed", { replace: true });
            return;
        }

        try {
            const user = JSON.parse(atob(userStr.replace(/-/g, "+").replace(/_/g, "/")));
            setToken(accessToken);
            // Store refresh token as sessionStorage fallback for browsers (iOS Safari)
            // that block cross-site HttpOnly cookies.
            if (refreshToken) setRefreshToken(refreshToken);
            login(user);
            navigate("/", { replace: true });
        } catch {
            navigate("/login?error=oauth_failed", { replace: true });
        }
    }, [login, navigate]);

    return (
        <main style={s.page}>
            <Icon name="progress_activity" size={32} className="spin-icon" style={s.spinner} />
            <p style={s.text}>Đang xử lý đăng nhập...</p>
        </main>
    );
};

const s: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-3)",
        backgroundColor: "var(--color-bg)",
    },
    spinner: {
        color: "var(--color-accent)",
    },
    text: {
        fontSize: "var(--text-sm)",
        color: "var(--color-text-secondary)",
        margin: 0,
    },
};
