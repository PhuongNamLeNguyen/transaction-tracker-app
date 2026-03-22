import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authApi, type LoginDto } from "@/api/auth.api";
import { setToken } from "@/utils/token-utils";
import { useAuth } from "@/hooks/useAuth";
import { Icon } from "@/components/common/Icon";
import { config } from "@/utils/config";

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

const EyeIcon    = () => <Icon name="visibility"     size={20} />;
const EyeOffIcon = () => <Icon name="visibility_off" size={20} />;
const SpinnerIcon = () => <Icon name="progress_activity" size={20} className="spin-icon" />;

/* ─── Pixel Cat ─── */
const PixelCat = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const SCALE = 4;
        canvas.width = 24 * SCALE;
        canvas.height = 24 * SCALE;

        const palette: Record<number, string> = {
            0: "transparent",
            1: "#E07B39",
            2: "#9C4A18",
            3: "#3D1A06",
            4: "#F0A050",
            5: "#FFF0C0",
            6: "#CC6A28",
            7: "#FFFAF5",
        };

        const sprites: number[][][] = [
            [
                [
                    0, 0, 0, 0, 2, 2, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 0, 2, 1, 6, 2, 2, 6, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 2, 1, 3, 1, 7, 7, 7, 1, 3, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 2, 1, 1, 1, 7, 7, 7, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 2, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 2, 1, 7, 7, 1, 1, 7, 7, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 4, 4, 4, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 2, 0, 0, 4, 5, 4, 4, 4, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 0, 2, 1, 2, 1, 1, 2, 1, 2, 0, 0, 4, 4, 4, 4, 4, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 0, 2, 2, 0, 2, 2, 0, 2, 0, 0, 0, 0, 4, 4, 4, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
            ],
            [
                [
                    0, 0, 0, 0, 2, 2, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 0, 2, 1, 6, 2, 2, 6, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 2, 1, 3, 1, 7, 7, 7, 1, 3, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 2, 1, 1, 1, 7, 7, 7, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 2, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 2, 1, 7, 7, 1, 1, 7, 7, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 0, 0, 4, 4, 4, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 2, 1, 2, 4, 5, 4, 4, 4, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 0, 2, 1, 2, 1, 1, 2, 1, 2, 2, 0, 4, 4, 4, 4, 4, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 0, 2, 2, 0, 2, 2, 0, 2, 0, 0, 0, 0, 4, 4, 4, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
                [
                    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                    0, 0, 0, 0,
                ],
            ],
        ];

        const coinY = [6, 5, 4, 5, 6, 7, 6];
        let tick = 0;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const sprite = sprites[Math.floor(tick / 8) % sprites.length];
            const coinOffset = coinY[Math.floor(tick / 2) % coinY.length] - 6;

            sprite.forEach((row, ry) => {
                row.forEach((px, rx) => {
                    if (px === 0) return;
                    const isCoin = px === 4 || px === 5;
                    const drawY = isCoin ? ry + coinOffset : ry;
                    ctx.fillStyle = palette[px];
                    ctx.fillRect(rx * SCALE, drawY * SCALE, SCALE, SCALE);
                });
            });

            tick++;
            rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            style={{ imageRendering: "pixelated", display: "block" }}
        />
    );
};

/* ─── Types ─── */
interface FormState {
    email: string;
    password: string;
    rememberMe: boolean;
}
interface FieldErrors {
    email?: string;
    password?: string;
    general?: string;
}

/* ─── Login Page ─── */
export const LoginPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    // Redirect về trang user muốn vào trước khi bị chuyển sang /login
    const from =
        (location.state as { from?: { pathname: string } })?.from?.pathname ??
        "/";

    // Read OAuth error from query param (set by backend after failed OAuth)
    const oauthError = new URLSearchParams(location.search).get("error");

    const [form, setForm] = useState<FormState>({
        email: "",
        password: "",
        rememberMe: false,
    });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [pwFocused, setPwFocused] = useState(false);

    /* ── Validate ── */
    const validate = (): boolean => {
        const next: FieldErrors = {};
        if (!form.email) next.email = "Vui lòng nhập email";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            next.email = "Email không hợp lệ";
        if (!form.password) next.password = "Vui lòng nhập mật khẩu";
        else if (form.password.length < 8)
            next.password = "Mật khẩu phải có ít nhất 8 ký tự";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    /* ── Submit ── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        setErrors({});

        try {
            const dto: LoginDto = {
                email: form.email.trim().toLowerCase(),
                password: form.password,
                rememberMe: form.rememberMe, // backend dùng để set cookie TTL: true=30d / false=1d
            };
            const res = await authApi.login(dto);
            setToken(res.accessToken);
            login(res.user);
            navigate(from, { replace: true });
        } catch (err: unknown) {
            const code = (err as { error?: { code?: string } })?.error?.code;
            // Error codes khớp backend authService: UNAUTHORIZED | EMAIL_NOT_VERIFIED | RATE_LIMIT_EXCEEDED
            const msgMap: Record<string, string> = {
                UNAUTHORIZED: "Email hoặc mật khẩu không đúng",
                EMAIL_NOT_VERIFIED:
                    "Email chưa được xác minh. Vui lòng kiểm tra hộp thư.",
                RATE_LIMIT_EXCEEDED: "Quá nhiều lần thử. Vui lòng thử lại sau.",
            };
            setErrors({
                general:
                    msgMap[code ?? ""] ??
                    "Đăng nhập thất bại. Vui lòng thử lại.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ── Input style — white default, tinted on focus ── */
    const inputStyle = (
        hasError: boolean,
        isFocused: boolean,
    ): React.CSSProperties => ({
        height: "var(--space-12)",
        padding: "0 var(--space-4)",
        fontSize: "var(--text-base)",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-sans)",
        width: "100%",
        boxSizing: "border-box",
        borderRadius: "var(--radius-sm)",
        border: `1.5px solid ${hasError ? "var(--color-error)" : isFocused ? "var(--color-border-strong)" : "var(--color-border)"}`,
        outline: isFocused ? "2px solid var(--color-focus-ring)" : "none",
        outlineOffset: "2px",
        backgroundColor: isFocused
            ? "var(--color-surface-raised)" // focus → màu tinted cam nhạt
            : "var(--color-surface)", // default → trắng
        transition:
            "background-color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)",
    });

    return (
        <>
            {/* [1] Căn giữa theo chiều dọc */}
            <main style={s.page}>
                <div style={s.inner}>
                    {/* Welcome */}
                    <section style={s.hero} aria-labelledby="welcome-heading">
                        <h1 id="welcome-heading" style={s.welcomeTop}>
                            Chào mừng bạn đến với
                        </h1>
                        <span style={s.welcomeAccent}>
                            App quản lý chi tiêu bằng AI
                        </span>
                    </section>

                    {/* [2] Cat căn giữa */}
                    <div style={s.catWrap} aria-hidden="true">
                        <PixelCat />
                    </div>

                    {/* OAuth error */}
                    {oauthError && (
                        <div role="alert" aria-live="assertive" style={s.generalError}>
                            ❌{" "}
                            {oauthError === "oauth_cancelled"
                                ? "Đăng nhập Google đã bị huỷ."
                                : "Đăng nhập Google thất bại. Vui lòng thử lại."}
                        </div>
                    )}

                    {/* General error */}
                    {errors.general && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            style={s.generalError}
                        >
                            ❌ {errors.general}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} noValidate style={s.form}>
                        {/* Email */}
                        <div style={s.field}>
                            <label htmlFor="email" style={s.label}>
                                Email{" "}
                                <span aria-hidden="true" style={s.req}>
                                    *
                                </span>
                            </label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                inputMode="email"
                                value={form.email}
                                onChange={(e) => {
                                    setForm((p) => ({
                                        ...p,
                                        email: e.target.value,
                                    }));
                                    setErrors((p) => ({
                                        ...p,
                                        email: undefined,
                                        general: undefined,
                                    }));
                                }}
                                onFocus={() => setEmailFocused(true)}
                                onBlur={() => setEmailFocused(false)}
                                aria-required="true"
                                aria-invalid={!!errors.email}
                                aria-describedby={
                                    errors.email ? "email-err" : undefined
                                }
                                placeholder="example@email.com"
                                style={inputStyle(!!errors.email, emailFocused)}
                                disabled={isSubmitting}
                            />
                            {errors.email && (
                                <span
                                    id="email-err"
                                    role="alert"
                                    aria-live="polite"
                                    style={s.errMsg}
                                >
                                    {errors.email}
                                </span>
                            )}
                        </div>

                        {/* Password */}
                        <div style={s.field}>
                            <label htmlFor="password" style={s.label}>
                                Mật khẩu{" "}
                                <span aria-hidden="true" style={s.req}>
                                    *
                                </span>
                            </label>
                            <div style={s.pwWrap}>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    value={form.password}
                                    onChange={(e) => {
                                        setForm((p) => ({
                                            ...p,
                                            password: e.target.value,
                                        }));
                                        setErrors((p) => ({
                                            ...p,
                                            password: undefined,
                                            general: undefined,
                                        }));
                                    }}
                                    onFocus={() => setPwFocused(true)}
                                    onBlur={() => setPwFocused(false)}
                                    aria-required="true"
                                    aria-invalid={!!errors.password}
                                    aria-describedby={
                                        errors.password ? "pw-err" : undefined
                                    }
                                    placeholder="Nhập mật khẩu"
                                    style={{
                                        ...inputStyle(
                                            !!errors.password,
                                            pwFocused,
                                        ),
                                        paddingRight: "48px",
                                    }}
                                    disabled={isSubmitting}
                                />
                                {/* [4] SVG eye icon */}
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((p) => !p)}
                                    aria-label={
                                        showPassword
                                            ? "Ẩn mật khẩu"
                                            : "Hiện mật khẩu"
                                    }
                                    style={s.eyeBtn}
                                >
                                    {showPassword ? (
                                        <EyeOffIcon />
                                    ) : (
                                        <EyeIcon />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <span
                                    id="pw-err"
                                    role="alert"
                                    aria-live="polite"
                                    style={s.errMsg}
                                >
                                    {errors.password}
                                </span>
                            )}
                        </div>

                        {/* Remember + Forgot */}
                        <div style={s.rememberRow}>
                            <label style={s.checkLabel}>
                                <input
                                    type="checkbox"
                                    checked={form.rememberMe}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            rememberMe: e.target.checked,
                                        }))
                                    }
                                    style={s.checkbox}
                                    disabled={isSubmitting}
                                />
                                <span style={s.checkText}>Lưu đăng nhập</span>
                            </label>
                            <Link to="/forgot-password" style={s.forgotLink}>
                                Quên mật khẩu?
                            </Link>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                ...s.submitBtn,
                                ...(isSubmitting ? s.submitLoading : {}),
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <SpinnerIcon />
                                    <span style={{ marginLeft: "8px" }}>
                                        Đang đăng nhập...
                                    </span>
                                </>
                            ) : (
                                "Đăng nhập"
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div style={s.divider} role="separator" aria-hidden="true">
                        <div style={s.divLine} />
                        <span style={s.divText}>hoặc</span>
                        <div style={s.divLine} />
                    </div>

                    {/* Google Sign-In */}
                    <button
                        type="button"
                        onClick={() => {
                            window.location.href = `${config.apiBaseUrl}/auth/google`;
                        }}
                        style={s.googleBtn}
                    >
                        <GoogleIcon />
                        <span>Đăng nhập với Google</span>
                    </button>

                    {/* Register */}
                    <p style={s.regRow}>
                        Bạn chưa có tài khoản?{" "}
                        <Link to="/register" style={s.regLink}>
                            Đăng ký
                        </Link>
                    </p>
                </div>
            </main>
        </>
    );
};

/* ─── Styles ─── */
const s: Record<string, React.CSSProperties> = {
    // [1] Căn giữa dọc + ngang
    page: {
        minHeight: "100dvh",
        backgroundColor: "var(--color-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6) var(--space-4)",
    },
    inner: {
        width: "100%",
        maxWidth: "400px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-6)",
    },

    hero: {
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        width: "100%",
    },
    welcomeTop: {
        fontSize: "var(--text-lg)",
        fontWeight: "var(--weight-medium)" as unknown as number,
        color: "var(--color-text-primary)",
        lineHeight: "var(--leading-snug)",
        margin: 0,
    },
    welcomeAccent: {
        display: "block",
        fontSize: "var(--text-xl)",
        fontWeight: "var(--weight-extrabold)" as unknown as number,
        color: "var(--color-accent)",
        lineHeight: "var(--leading-tight)",
        letterSpacing: "var(--tracking-tight)",
    },

    // [2] Cat căn giữa
    catWrap: {
        width: "96px",
        height: "96px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto",
        backgroundColor: "var(--color-surface)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-card)",
        border: "1px solid var(--color-border)",
        padding: "var(--space-2)",
        flexShrink: 0,
    },

    generalError: {
        width: "100%",
        backgroundColor: "var(--color-error-bg)",
        color: "var(--color-error)",
        border: "1px solid var(--color-error)",
        borderRadius: "var(--radius-sm)",
        padding: "var(--space-3) var(--space-4)",
        fontSize: "var(--text-sm)",
    },

    form: {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
    },
    field: {
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1)",
    },
    label: {
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-medium)" as unknown as number,
        color: "var(--color-text-primary)",
        display: "flex",
        alignItems: "center",
        gap: "2px",
        marginBottom: "2px",
    },
    req: { color: "var(--color-error)" },
    errMsg: {
        fontSize: "var(--text-xs)",
        color: "var(--color-error)",
        marginTop: "2px",
    },

    pwWrap: { position: "relative", display: "flex", width: "100%" },

    // [4] SVG eye button
    eyeBtn: {
        position: "absolute",
        right: "0",
        top: "0",
        width: "44px",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "var(--color-text-secondary)",
        borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
        padding: 0,
        flexShrink: 0,
    },

    rememberRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-2)",
    },
    checkLabel: {
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        cursor: "pointer",
    },
    checkbox: {
        width: "18px",
        height: "18px",
        accentColor: "var(--color-accent)",
        cursor: "pointer",
        flexShrink: 0,
    },
    checkText: {
        fontSize: "var(--text-sm)",
        color: "var(--color-text-primary)",
    },
    forgotLink: {
        fontSize: "var(--text-sm)",
        color: "var(--color-text-link)",
        textDecoration: "none",
        fontWeight: "var(--weight-medium)" as unknown as number,
        whiteSpace: "nowrap",
    },

    submitBtn: {
        height: "var(--space-12)",
        width: "100%",
        backgroundColor: "var(--color-accent)",
        color: "var(--color-text-inverse)",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-semibold)" as unknown as number,
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition:
            "background-color var(--duration-fast) var(--ease-standard)",
    },
    submitLoading: {
        opacity: 0.7,
        cursor: "not-allowed",
        pointerEvents: "none",
    },

    divider: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
    },
    divLine: {
        flex: 1,
        height: "1px",
        backgroundColor: "var(--color-divider)",
    },
    divText: {
        fontSize: "var(--text-xs)",
        color: "var(--color-text-secondary)",
        whiteSpace: "nowrap",
    },

    googleBtn: {
        height: "var(--space-12)",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-2)",
        backgroundColor: "var(--color-surface)",
        color: "var(--color-text-primary)",
        border: "1.5px solid var(--color-border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-medium)" as unknown as number,
        fontFamily: "var(--font-sans)",
        cursor: "pointer",
        transition: "background-color var(--duration-fast) var(--ease-standard)",
    },

    regRow: {
        fontSize: "var(--text-sm)",
        color: "var(--color-text-primary)",
        textAlign: "center",
    },
    regLink: {
        color: "var(--color-accent)",
        fontWeight: "var(--weight-bold)" as unknown as number,
        textDecoration: "none",
    },
};
