import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.ts";
import { useEffect, useState } from "react";
import catF0 from "@/assets/cat-f0.svg?url";
import catF1 from "@/assets/cat-f1.svg?url";
import catF2 from "@/assets/cat-f2.svg?url";

const FRAMES = [catF0, catF1, catF2];

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
            gap: "24px",
        }}
    >
        <div style={{ position: "relative", width: "90px", height: "80px" }}>
            {FRAMES.map((src, i) => (
                <img
                    key={i}
                    src={src}
                    alt=""
                    className={`ls-cat ls-cat-${i}`}
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        width: "90px",
                        imageRendering: "pixelated",
                        filter: "brightness(0)",
                    }}
                />
            ))}
        </div>

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
            .ls-cat   { opacity: 0; }
            .ls-cat-0 { animation: ls-f0 0.9s linear infinite; }
            .ls-cat-1 { animation: ls-f1 0.9s linear infinite; }
            .ls-cat-2 { animation: ls-f2 0.9s linear infinite; }

            @keyframes ls-f0 {
                0%,  32.9% { opacity: 1; }
                33%, 100%  { opacity: 0; }
            }
            @keyframes ls-f1 {
                0%,  32.9% { opacity: 0; }
                33%, 65.9% { opacity: 1; }
                66%, 100%  { opacity: 0; }
            }
            @keyframes ls-f2 {
                0%,  65.9% { opacity: 0; }
                66%, 99.9% { opacity: 1; }
                100%       { opacity: 0; }
            }
            @media (prefers-reduced-motion: reduce) {
                .ls-cat-0 { opacity: 1; animation: none; }
                .ls-cat-1, .ls-cat-2 { opacity: 0; animation: none; }
            }
        `}</style>
    </div>
);

/* ─── ProtectedRoute ───
   Flow:
   1. loading / isOnboarded=null OR min 5s delay not done → LoadingScreen
   2. unauthenticated              → /login
   3. authenticated + not onboarded + not on /onboarding → /onboarding
   4. otherwise                   → render children
*/
export const ProtectedRoute = () => {
    const { status, isOnboarded } = useAuth();
    const location = useLocation();
    const [minDelayDone, setMinDelayDone] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setMinDelayDone(true), 5000);
        return () => clearTimeout(t);
    }, []);

    const isAuthLoading =
        status === "loading" ||
        (status === "authenticated" && isOnboarded === null);

    if (isAuthLoading || !minDelayDone) {
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
