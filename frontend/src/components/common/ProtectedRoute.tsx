import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.ts";

/* ─── Loading Screen ───
   Hiển thị khi đang silent refresh — tránh flash redirect về /login
*/
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
   - loading     → hiển thị LoadingScreen (chờ silent refresh xong)
   - authenticated → render children (Outlet)
   - unauthenticated → redirect về /login, giữ lại URL gốc trong state
*/
export const ProtectedRoute = () => {
    const { status } = useAuth();
    const location = useLocation();

    if (status === "loading") return <LoadingScreen />;

    if (status === "unauthenticated") {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location }} // để sau khi login có thể redirect về đúng trang
            />
        );
    }

    return <Outlet />;
};
