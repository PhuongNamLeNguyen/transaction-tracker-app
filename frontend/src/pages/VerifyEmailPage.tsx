import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "@/api/auth.api";
import { Icon } from "@/components/common/Icon";

type Status = "verifying" | "success" | "error";

export const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<Status>("verifying");

    useEffect(() => {
        const token = searchParams.get("token");
        if (!token) {
            setStatus("error");
            return;
        }

        authApi
            .verifyEmail(token)
            .then(() => setStatus("success"))
            .catch(() => setStatus("error"));
    }, [searchParams]);

    return (
        <main style={s.page}>
            <div style={s.card}>
                {status === "verifying" && (
                    <>
                        <Icon
                            name="progress_activity"
                            size={40}
                            className="spin-icon"
                            style={{ color: "var(--color-accent)" }}
                        />
                        <h1 style={s.title}>Đang xác thực email...</h1>
                    </>
                )}

                {status === "success" && (
                    <>
                        <Icon
                            name="check_circle"
                            size={48}
                            filled
                            style={{ color: "var(--color-success)" }}
                        />
                        <h1 style={s.title}>Email đã được xác thực!</h1>
                        <p style={s.desc}>
                            Tài khoản của bạn đã kích hoạt thành công.
                            <br />
                            Bạn có thể đăng nhập ngay bây giờ.
                        </p>
                        <Link to="/login" style={s.btn}>
                            Đăng nhập
                        </Link>
                    </>
                )}

                {status === "error" && (
                    <>
                        <Icon
                            name="error"
                            size={48}
                            filled
                            style={{ color: "var(--color-error)" }}
                        />
                        <h1 style={s.title}>Link không hợp lệ</h1>
                        <p style={s.desc}>
                            Link xác thực đã hết hạn hoặc không đúng.
                            <br />
                            Vui lòng đăng ký lại để nhận link mới.
                        </p>
                        <Link to="/register" style={s.btn}>
                            Đăng ký lại
                        </Link>
                    </>
                )}
            </div>
        </main>
    );
};

const s: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6) var(--space-4)",
        backgroundColor: "var(--color-bg)",
    },
    card: {
        width: "100%",
        maxWidth: "400px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-4)",
        backgroundColor: "var(--color-surface)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-10) var(--space-8)",
        boxShadow: "var(--shadow-card)",
        border: "1px solid var(--color-border)",
        textAlign: "center",
    },
    title: {
        margin: 0,
        fontSize: "var(--text-xl)",
        fontWeight: "var(--weight-bold)" as unknown as number,
        color: "var(--color-text-primary)",
        lineHeight: "var(--leading-tight)",
    },
    desc: {
        margin: 0,
        fontSize: "var(--text-sm)",
        color: "var(--color-text-secondary)",
        lineHeight: "var(--leading-relaxed)",
    },
    btn: {
        marginTop: "var(--space-2)",
        display: "inline-block",
        padding: "12px 32px",
        backgroundColor: "var(--color-accent)",
        color: "var(--color-text-inverse)",
        borderRadius: "var(--radius-sm)",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-semibold)" as unknown as number,
        textDecoration: "none",
    },
};
