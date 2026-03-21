import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.ts";

/* ─── Loading Screen ─── */
const LoadingScreen = () => (
    <div
        style={{
            minHeight: "100dvh",
            backgroundColor: "var(--color-bg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
        }}
    >
        <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ animation: "pr-spin 0.8s linear infinite" }}
            aria-hidden="true"
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <p
            style={{
                fontSize: "var(--text-sm)",
                color: "var(--color-text-secondary)",
                margin: 0,
            }}
        >
            Đang kiểm tra phiên đăng nhập...
        </p>
        <style>{`
      @keyframes pr-spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) {
        svg[aria-hidden] { animation: none; }
      }
    `}</style>
    </div>
);

/* ─── ProtectedRoute ───
   Flow:
   1. loading / isOnboarded=null  → LoadingScreen (chờ auth + onboarding check)
   2. unauthenticated              → /login
   3. authenticated + not onboarded + not on /onboarding → /onboarding
   4. otherwise                   → render children
*/
export const ProtectedRoute = () => {
    const { status, isOnboarded } = useAuth();
    const location = useLocation();

    // Still determining auth or onboarding status
    if (status === "loading" || (status === "authenticated" && isOnboarded === null)) {
        return <LoadingScreen />;
    }

    if (status === "unauthenticated") {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location }}
            />
        );
    }

    // Redirect to onboarding wizard if setup not done
    if (isOnboarded === false && location.pathname !== "/onboarding") {
        return <Navigate to="/onboarding" replace />;
    }

    return <Outlet />;
};
