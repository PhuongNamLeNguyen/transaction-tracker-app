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

        <p className="ls-label">
            Đang tải<span className="ls-dots">
                <span>.</span><span>.</span><span>.</span>
            </span>
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

            /* Label badge */
            .ls-label {
                margin: 40px 0 0;
                font-size: 11px;
                font-family: var(--font-sans);
                font-weight: var(--weight-medium);
                color: var(--color-text-secondary);
                letter-spacing: 0.02em;
                padding: 5px 14px;
                border: 1.5px solid var(--color-border);
                border-radius: 999px;
                background: var(--color-surface);
                animation: ls-label-in 0.5s var(--ease-decelerate, cubic-bezier(0,0,0.2,1)) 0.2s both,
                           ls-label-border 2.4s ease-in-out 0.7s infinite;
            }

            /* Animated dots */
            .ls-dots span {
                opacity: 0;
                animation: ls-dot 1.2s ease-in-out infinite;
            }
            .ls-dots span:nth-child(1) { animation-delay: 0s; }
            .ls-dots span:nth-child(2) { animation-delay: 0.2s; }
            .ls-dots span:nth-child(3) { animation-delay: 0.4s; }

            @keyframes ls-dot {
                0%, 60%, 100% { opacity: 0; }
                30%           { opacity: 1; }
            }

            /* Label entrance */
            @keyframes ls-label-in {
                from { opacity: 0; transform: translateY(8px); }
                to   { opacity: 1; transform: translateY(0); }
            }

            /* Border pulse */
            @keyframes ls-label-border {
                0%, 100% { border-color: var(--color-border); }
                50%      { border-color: var(--color-text-tertiary); }
            }

            @media (prefers-reduced-motion: reduce) {
                .ls-cat-0 { opacity: 1; animation: none; }
                .ls-cat-1, .ls-cat-2 { opacity: 0; animation: none; }
                .ls-label { animation: none; opacity: 1; }
                .ls-dots span { opacity: 1; animation: none; }
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
