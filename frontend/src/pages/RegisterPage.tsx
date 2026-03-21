import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi, type RegisterDto } from "@/api/auth.api";
import { Icon } from "@/components/common/Icon";

const EyeIcon     = () => <Icon name="visibility"       size={20} />;
const EyeOffIcon  = () => <Icon name="visibility_off"   size={20} />;
const SpinnerIcon = () => <Icon name="progress_activity" size={20} className="spin-icon" />;

/* ─── Types ─── */
interface FormState {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface FieldErrors {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
}

/* ─── Success Screen — sau khi đăng ký thành công ─── */
const SuccessScreen = ({ email }: { email: string }) => (
    <main style={s.page}>
        <div style={s.inner}>
            <div style={s.successIcon} aria-hidden="true">
                <Icon name="check_circle" size={40} style={{ color: "var(--color-success)" }} filled />
            </div>
            <div style={{ textAlign: "center" }}>
                <h1 style={s.successTitle}>Kiểm tra hộp thư của bạn</h1>
                <p style={s.successDesc}>Chúng tôi đã gửi link xác thực tới</p>
                <p style={s.successEmail}>{email}</p>
                <p style={s.successDesc}>
                    Vui lòng mở email và nhấn vào link để kích hoạt tài khoản.
                </p>
            </div>
            <Link to="/login" style={s.submitBtn as React.CSSProperties}>
                Quay lại đăng nhập
            </Link>
        </div>
    </main>
);

/* ─── Register Page ─── */
export const RegisterPage = () => {
    const [form, setForm] = useState<FormState>({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [registered, setRegistered] = useState(false);

    // Focus states for input bg swap
    const [nameFocused, setNameFocused] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [pwFocused, setPwFocused] = useState(false);
    const [confirmFocused, setConfirmFocused] = useState(false);

    /* ── Validate ── */
    const validate = (): boolean => {
        const next: FieldErrors = {};

        if (!form.name.trim()) next.name = "Vui lòng nhập tên người dùng";
        else if (form.name.trim().length < 2)
            next.name = "Tên phải có ít nhất 2 ký tự";

        if (!form.email) next.email = "Vui lòng nhập email";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            next.email = "Email không hợp lệ";

        if (!form.password) next.password = "Vui lòng nhập mật khẩu";
        else if (form.password.length < 8)
            next.password = "Mật khẩu phải có ít nhất 8 ký tự";

        if (!form.confirmPassword)
            next.confirmPassword = "Vui lòng xác nhận mật khẩu";
        else if (form.confirmPassword !== form.password)
            next.confirmPassword = "Mật khẩu xác nhận không khớp";

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
            const dto: RegisterDto = {
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                password: form.password,
            };
            await authApi.register(dto);
            // Backend trả { id, email, name } — không có accessToken
            // User phải verify email trước khi login
            setRegistered(true);
        } catch (err: unknown) {
            const code = (err as { error?: { code?: string } })?.error?.code;
            const msgMap: Record<string, string> = {
                VALIDATION_ERROR: "Email này đã được sử dụng.",
                RATE_LIMIT_EXCEEDED: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
            };
            setErrors({
                general:
                    msgMap[code ?? ""] ?? "Đăng ký thất bại. Vui lòng thử lại.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ── Input style helper — white default, tinted on focus ── */
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
            ? "var(--color-surface-raised)"
            : "var(--color-surface)",
        transition:
            "background-color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)",
    });

    /* ── Show success screen after register ── */
    if (registered) return <SuccessScreen email={form.email} />;

    return (
        <>
            <main style={s.page}>
                <div style={s.inner}>
                    {/* ── Heading ── */}
                    <section style={s.hero} aria-labelledby="register-heading">
                        <p style={s.heroSub}>Bắt đầu hành trình</p>
                        <h1 id="register-heading" style={s.heroAccent}>
                            Tạo tài khoản mới
                        </h1>
                    </section>

                    {/* ── General error ── */}
                    {errors.general && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            style={s.generalError}
                        >
                            ❌ {errors.general}
                        </div>
                    )}

                    {/* ── Form ── */}
                    <form onSubmit={handleSubmit} noValidate style={s.form}>
                        {/* Tên người dùng */}
                        <div style={s.field}>
                            <label htmlFor="name" style={s.label}>
                                Tên người dùng{" "}
                                <span aria-hidden="true" style={s.req}>
                                    *
                                </span>
                            </label>
                            <input
                                id="name"
                                type="text"
                                autoComplete="name"
                                value={form.name}
                                onChange={(e) => {
                                    setForm((p) => ({
                                        ...p,
                                        name: e.target.value,
                                    }));
                                    setErrors((p) => ({
                                        ...p,
                                        name: undefined,
                                    }));
                                }}
                                onFocus={() => setNameFocused(true)}
                                onBlur={() => setNameFocused(false)}
                                aria-required="true"
                                aria-invalid={!!errors.name}
                                aria-describedby={
                                    errors.name ? "name-err" : undefined
                                }
                                placeholder="Nguyễn Văn A"
                                style={inputStyle(!!errors.name, nameFocused)}
                                disabled={isSubmitting}
                            />
                            {errors.name && (
                                <span
                                    id="name-err"
                                    role="alert"
                                    aria-live="polite"
                                    style={s.errMsg}
                                >
                                    {errors.name}
                                </span>
                            )}
                        </div>

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

                        {/* Mật khẩu */}
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
                                    autoComplete="new-password"
                                    value={form.password}
                                    onChange={(e) => {
                                        setForm((p) => ({
                                            ...p,
                                            password: e.target.value,
                                        }));
                                        setErrors((p) => ({
                                            ...p,
                                            password: undefined,
                                        }));
                                    }}
                                    onFocus={() => setPwFocused(true)}
                                    onBlur={() => setPwFocused(false)}
                                    aria-required="true"
                                    aria-invalid={!!errors.password}
                                    aria-describedby={
                                        errors.password ? "pw-err" : "pw-hint"
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
                            {errors.password ? (
                                <span
                                    id="pw-err"
                                    role="alert"
                                    aria-live="polite"
                                    style={s.errMsg}
                                >
                                    {errors.password}
                                </span>
                            ) : (
                                <span id="pw-hint" style={s.hint}>
                                    Tối thiểu 8 ký tự
                                </span>
                            )}
                        </div>

                        {/* Xác nhận mật khẩu */}
                        <div style={s.field}>
                            <label htmlFor="confirm-password" style={s.label}>
                                Xác nhận mật khẩu{" "}
                                <span aria-hidden="true" style={s.req}>
                                    *
                                </span>
                            </label>
                            <div style={s.pwWrap}>
                                <input
                                    id="confirm-password"
                                    type={showConfirm ? "text" : "password"}
                                    autoComplete="new-password"
                                    value={form.confirmPassword}
                                    onChange={(e) => {
                                        setForm((p) => ({
                                            ...p,
                                            confirmPassword: e.target.value,
                                        }));
                                        setErrors((p) => ({
                                            ...p,
                                            confirmPassword: undefined,
                                        }));
                                    }}
                                    onFocus={() => setConfirmFocused(true)}
                                    onBlur={() => setConfirmFocused(false)}
                                    aria-required="true"
                                    aria-invalid={!!errors.confirmPassword}
                                    aria-describedby={
                                        errors.confirmPassword
                                            ? "confirm-err"
                                            : undefined
                                    }
                                    placeholder="Nhập lại mật khẩu"
                                    style={{
                                        ...inputStyle(
                                            !!errors.confirmPassword,
                                            confirmFocused,
                                        ),
                                        paddingRight: "48px",
                                    }}
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm((p) => !p)}
                                    aria-label={
                                        showConfirm
                                            ? "Ẩn mật khẩu xác nhận"
                                            : "Hiện mật khẩu xác nhận"
                                    }
                                    style={s.eyeBtn}
                                >
                                    {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <span
                                    id="confirm-err"
                                    role="alert"
                                    aria-live="polite"
                                    style={s.errMsg}
                                >
                                    {errors.confirmPassword}
                                </span>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={
                                {
                                    ...s.submitBtn,
                                    ...(isSubmitting ? s.submitLoading : {}),
                                } as React.CSSProperties
                            }
                        >
                            {isSubmitting ? (
                                <>
                                    <SpinnerIcon />
                                    <span style={{ marginLeft: "8px" }}>
                                        Đang xử lý...
                                    </span>
                                </>
                            ) : (
                                "Xác thực email"
                            )}
                        </button>
                    </form>

                    {/* ── Divider ── */}
                    <div style={s.divider} role="separator" aria-hidden="true">
                        <div style={s.divLine} />
                        <span style={s.divText}>hoặc</span>
                        <div style={s.divLine} />
                    </div>

                    {/* ── Login link ── */}
                    <p style={s.loginRow}>
                        Bạn đã có tài khoản?{" "}
                        <Link to="/login" style={s.loginLink}>
                            Đăng nhập
                        </Link>
                    </p>
                </div>
            </main>
        </>
    );
};

/* ─── Styles ─── */
const s: Record<string, React.CSSProperties> = {
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

    /* Heading */
    hero: {
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1)",
        width: "100%",
    },
    heroSub: {
        fontSize: "var(--text-base)",
        fontWeight: "var(--weight-medium)" as unknown as number,
        color: "var(--color-text-secondary)",
        margin: 0,
    },
    heroAccent: {
        fontSize: "var(--text-xl)",
        fontWeight: "var(--weight-extrabold)" as unknown as number,
        color: "var(--color-accent)",
        lineHeight: "var(--leading-tight)",
        letterSpacing: "var(--tracking-tight)",
        margin: 0,
    },

    /* General error */
    generalError: {
        width: "100%",
        backgroundColor: "var(--color-error-bg)",
        color: "var(--color-error)",
        border: "1px solid var(--color-error)",
        borderRadius: "var(--radius-sm)",
        padding: "var(--space-3) var(--space-4)",
        fontSize: "var(--text-sm)",
    },

    /* Form */
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
    hint: {
        fontSize: "var(--text-xs)",
        color: "var(--color-text-secondary)",
        marginTop: "2px",
    },

    /* Password wrapper */
    pwWrap: { position: "relative", display: "flex", width: "100%" },
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

    /* Submit button */
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
        textDecoration: "none",
        transition:
            "background-color var(--duration-fast) var(--ease-standard)",
    },
    submitLoading: {
        opacity: 0.7,
        cursor: "not-allowed",
        pointerEvents: "none",
    },

    /* Divider */
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

    /* Login link */
    loginRow: {
        fontSize: "var(--text-sm)",
        color: "var(--color-text-primary)",
        textAlign: "center",
    },
    loginLink: {
        color: "var(--color-accent)",
        fontWeight: "var(--weight-bold)" as unknown as number,
        textDecoration: "none",
    },

    /* Success screen */
    successIcon: {
        width: "80px",
        height: "80px",
        borderRadius: "var(--radius-xl)",
        backgroundColor: "var(--color-success-bg)",
        border: "1px solid var(--color-success)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    successTitle: {
        fontSize: "var(--text-xl)",
        fontWeight: "var(--weight-extrabold)" as unknown as number,
        color: "var(--color-text-primary)",
        margin: "0 0 8px",
    },
    successDesc: {
        fontSize: "var(--text-sm)",
        color: "var(--color-text-secondary)",
        margin: "4px 0",
    },
    successEmail: {
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-semibold)" as unknown as number,
        color: "var(--color-accent)",
        margin: "4px 0",
    },
};
