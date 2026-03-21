import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { settingsApi, type SettingsResponse, type UserPreferences } from "@/api/settings.api";
import { BottomNav } from "@/components/common/BottomNav";
import { Icon } from "@/components/common/Icon";
import "@/styles/dashboard.css";
import "@/styles/settings.css";

/* ─── Helpers ─── */
function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: currency === "VND" ? "VND" : currency,
        maximumFractionDigits: currency === "VND" ? 0 : 2,
    }).format(amount);
}

const CURRENCIES = ["VND", "USD", "EUR", "JPY", "GBP", "SGD", "THB", "CNY", "KRW", "AUD"];
const LANGUAGES  = [
    { value: "vi", label: "Tiếng Việt" },
    { value: "en", label: "English" },
    { value: "ja", label: "日本語" },
    { value: "zh", label: "中文" },
];
const TIMEZONES  = [
    { value: "Asia/Ho_Chi_Minh", label: "Asia/Ho_Chi_Minh (GMT+7)" },
    { value: "Asia/Bangkok",     label: "Asia/Bangkok (GMT+7)" },
    { value: "Asia/Tokyo",       label: "Asia/Tokyo (GMT+9)" },
    { value: "Asia/Singapore",   label: "Asia/Singapore (GMT+8)" },
    { value: "UTC",              label: "UTC (GMT+0)" },
    { value: "America/New_York", label: "America/New_York (GMT-5)" },
    { value: "Europe/London",    label: "Europe/London (GMT+0)" },
];
const CYCLE_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

/* ─── Preference Sheet ─── */
function PrefSheet<T extends string | number>({
    title,
    options,
    value,
    onSelect,
    onClose,
}: {
    title: string;
    options: Array<{ value: T; label: string }>;
    value: T;
    onSelect: (v: T) => void;
    onClose: () => void;
}) {
    return (
        <>
            <div className="pref-sheet-overlay" onClick={onClose} />
            <div className="pref-sheet">
                <div className="pref-sheet__handle" />
                <div className="pref-sheet__title">{title}</div>
                {options.map((opt) => (
                    <button
                        key={String(opt.value)}
                        className={`pref-option${opt.value === value ? " pref-option--active" : ""}`}
                        onClick={() => { onSelect(opt.value); onClose(); }}
                    >
                        {opt.label}
                        {opt.value === value && (
                            <Icon name="check" size={16} />
                        )}
                    </button>
                ))}
            </div>
        </>
    );
}

/* ─── Logout Confirm Dialog ─── */
function LogoutDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
    return (
        <div className="confirm-overlay" onClick={onCancel}>
            <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="confirm-dialog__title">Đăng xuất?</div>
                <div className="confirm-dialog__text">
                    Bạn có chắc muốn đăng xuất khỏi tài khoản không?
                </div>
                <div className="confirm-dialog__actions">
                    <button className="confirm-dialog__btn confirm-dialog__btn--destructive" onClick={onConfirm}>
                        Đăng xuất
                    </button>
                    <button className="confirm-dialog__btn confirm-dialog__btn--cancel" onClick={onCancel}>
                        Huỷ
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Chevron Icon ─── */
function Chevron() {
    return <Icon name="chevron_right" size={16} className="settings-row__chevron" />;
}

/* ─── Icon backgrounds ─── */
const iconBg: Record<string, string> = {
    theme:    "#fef0e0",
    currency: "#dbeafe",
    cycle:    "#d1fae5",
    language: "#ede9fe",
    timezone: "#fef3c7",
    account:  "#fee2e2",
    budget:   "#fef0e0",
    deleted:  "#f1f5f9",
    password: "#f1f5f9",
    logout:   "#fee2e2",
};

/* ─── Main Page ─── */
export const SettingsPage = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [settingsData, setSettingsData] = useState<SettingsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [openSheet, setOpenSheet] = useState<string | null>(null);
    const [showLogout, setShowLogout] = useState(false);

    /* ── Load settings ── */
    useEffect(() => {
        settingsApi.getSettings()
            .then(setSettingsData)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const prefs   = settingsData?.preferences;
    const account = settingsData?.account;

    /* ── Apply dark mode to DOM ── */
    useEffect(() => {
        if (!prefs) return;
        document.documentElement.setAttribute("data-theme", prefs.theme);
    }, [prefs?.theme]);

    /* ── Save a single preference ── */
    async function savePref(update: Partial<UserPreferences>) {
        if (saving || !prefs) return;
        setSaving(true);

        // Optimistic update
        setSettingsData((prev) => prev
            ? { ...prev, preferences: { ...prev.preferences!, ...update } }
            : prev
        );

        try {
            await settingsApi.updateSettings(update as Parameters<typeof settingsApi.updateSettings>[0]);
        } catch {
            // Revert on error — just reload
            settingsApi.getSettings().then(setSettingsData).catch(() => {});
        } finally {
            setSaving(false);
        }
    }

    /* ── Logout ── */
    async function handleLogout() {
        setShowLogout(false);
        await logout();
        navigate("/login", { replace: true });
    }

    const langLabel = LANGUAGES.find((l) => l.value === prefs?.systemLanguage)?.label ?? prefs?.systemLanguage ?? "—";
    const tzLabel   = TIMEZONES.find((t) => t.value === prefs?.timeZone)?.label?.split(" ")[0] ?? prefs?.timeZone ?? "—";

    return (
        <div className="settings-page">
            <h1 className="settings-page__title">Cài đặt</h1>

            <div className="settings-page__body">
                {/* Profile Card */}
                <div className="settings-profile">
                    <div className="settings-profile__avatar">
                        {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                        <div className="settings-profile__name">{user?.name || "Người dùng"}</div>
                        <div className="settings-profile__email">{user?.email}</div>
                    </div>
                </div>

                {/* PREFERENCES */}
                <div>
                    <div className="settings-section__label">Tuỳ chỉnh</div>
                    <div className="settings-card">
                        {/* Theme */}
                        <div className="settings-row settings-row--no-action">
                            <div className="settings-row__icon" style={{ background: iconBg.theme }}>🎨</div>
                            <div className="settings-row__body">
                                <div className="settings-row__label">Giao diện</div>
                            </div>
                            <div className="settings-row__value">
                                {loading ? (
                                    <span className="skeleton" style={{ width: 90, height: 28 }} />
                                ) : (
                                    <div className="theme-toggle">
                                        <button
                                            className={`theme-toggle__btn${prefs?.theme === "light" ? " theme-toggle__btn--active" : ""}`}
                                            onClick={() => savePref({ theme: "light" })}
                                        >
                                            Sáng
                                        </button>
                                        <button
                                            className={`theme-toggle__btn${prefs?.theme === "dark" ? " theme-toggle__btn--active" : ""}`}
                                            onClick={() => savePref({ theme: "dark" })}
                                        >
                                            Tối
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Currency */}
                        <button
                            className="settings-row"
                            onClick={() => setOpenSheet("currency")}
                        >
                            <div className="settings-row__icon" style={{ background: iconBg.currency }}>💱</div>
                            <div className="settings-row__body">
                                <div className="settings-row__label">Tiền tệ hiển thị</div>
                            </div>
                            <div className="settings-row__value">
                                {loading ? <span className="skeleton" style={{ width: 40, height: 16 }} /> : (prefs?.targetCurrency ?? "—")}
                                <Chevron />
                            </div>
                        </button>

                        {/* Cycle start day */}
                        <button
                            className="settings-row"
                            onClick={() => setOpenSheet("cycle")}
                        >
                            <div className="settings-row__icon" style={{ background: iconBg.cycle }}>📅</div>
                            <div className="settings-row__body">
                                <div className="settings-row__label">Ngày bắt đầu chu kỳ</div>
                                <div className="settings-row__sublabel">Ngày tính ngân sách mỗi tháng</div>
                            </div>
                            <div className="settings-row__value">
                                {loading ? <span className="skeleton" style={{ width: 32, height: 16 }} /> : (prefs?.cycleStartDay ? `Ngày ${prefs.cycleStartDay}` : "—")}
                                <Chevron />
                            </div>
                        </button>

                        {/* Language */}
                        <button
                            className="settings-row"
                            onClick={() => setOpenSheet("language")}
                        >
                            <div className="settings-row__icon" style={{ background: iconBg.language }}>🌐</div>
                            <div className="settings-row__body">
                                <div className="settings-row__label">Ngôn ngữ</div>
                            </div>
                            <div className="settings-row__value">
                                {loading ? <span className="skeleton" style={{ width: 60, height: 16 }} /> : langLabel}
                                <Chevron />
                            </div>
                        </button>

                        {/* Timezone */}
                        <button
                            className="settings-row"
                            onClick={() => setOpenSheet("timezone")}
                        >
                            <div className="settings-row__icon" style={{ background: iconBg.timezone }}>🕐</div>
                            <div className="settings-row__body">
                                <div className="settings-row__label">Múi giờ</div>
                            </div>
                            <div className="settings-row__value">
                                {loading ? <span className="skeleton" style={{ width: 80, height: 16 }} /> : tzLabel}
                                <Chevron />
                            </div>
                        </button>
                    </div>
                </div>

                {/* ACCOUNT */}
                <div>
                    <div className="settings-section__label">Tài khoản</div>
                    <div className="settings-card">
                        {/* Account row */}
                        <button className="settings-row">
                            <div className="settings-row__icon" style={{ background: iconBg.account }}>💳</div>
                            <div className="settings-row__body">
                                <div className="settings-row__label">{account?.name || "Tài khoản của tôi"}</div>
                                {account && (
                                    <div className="settings-row__sublabel">
                                        {formatCurrency(account.balance, account.currency)}
                                    </div>
                                )}
                            </div>
                            <div className="settings-row__value">
                                {loading && <span className="skeleton" style={{ width: 70, height: 16 }} />}
                                <Chevron />
                            </div>
                        </button>

                        {/* Edit budget */}
                        <button
                            className="settings-row"
                            onClick={() => navigate("/onboarding")}
                        >
                            <div className="settings-row__icon" style={{ background: iconBg.budget }}>📊</div>
                            <div className="settings-row__body">
                                <div className="settings-row__label">Chỉnh sửa kế hoạch</div>
                            </div>
                            <Chevron />
                        </button>
                    </div>
                </div>

                {/* DATA */}
                <div>
                    <div className="settings-section__label">Dữ liệu</div>
                    <div className="settings-card">
                        <button className="settings-row" onClick={() => navigate("/deleted-transactions")}>
                            <div className="settings-row__icon" style={{ background: iconBg.deleted }}>🗑️</div>
                            <div className="settings-row__body">
                                <div className="settings-row__label">Giao dịch đã xoá</div>
                            </div>
                            <Chevron />
                        </button>
                    </div>
                </div>

                {/* PROFILE */}
                <div>
                    <div className="settings-section__label">Tài khoản người dùng</div>
                    <div className="settings-card">
                        <button className="settings-row">
                            <div className="settings-row__icon" style={{ background: iconBg.password }}>🔑</div>
                            <div className="settings-row__body">
                                <div className="settings-row__label">Đổi mật khẩu</div>
                            </div>
                            <Chevron />
                        </button>

                        <button
                            className="settings-row settings-row--destructive"
                            onClick={() => setShowLogout(true)}
                        >
                            <div className="settings-row__icon" style={{ background: "#fee2e2" }}>🚪</div>
                            <div className="settings-row__body">
                                <div className="settings-row__label">Đăng xuất</div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <BottomNav />

            {/* Preference Sheets */}
            {openSheet === "currency" && prefs && (
                <PrefSheet
                    title="Chọn tiền tệ hiển thị"
                    options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                    value={prefs.targetCurrency}
                    onSelect={(v) => savePref({ targetCurrency: v })}
                    onClose={() => setOpenSheet(null)}
                />
            )}
            {openSheet === "cycle" && prefs && (
                <PrefSheet
                    title="Ngày bắt đầu chu kỳ (1–28)"
                    options={CYCLE_DAYS.map((d) => ({ value: d, label: `Ngày ${d}` }))}
                    value={prefs.cycleStartDay ?? 1}
                    onSelect={(v) => savePref({ cycleStartDay: v as number })}
                    onClose={() => setOpenSheet(null)}
                />
            )}
            {openSheet === "language" && prefs && (
                <PrefSheet
                    title="Chọn ngôn ngữ"
                    options={LANGUAGES}
                    value={prefs.systemLanguage}
                    onSelect={(v) => savePref({ systemLanguage: v as string })}
                    onClose={() => setOpenSheet(null)}
                />
            )}
            {openSheet === "timezone" && prefs && (
                <PrefSheet
                    title="Chọn múi giờ"
                    options={TIMEZONES.map((t) => ({ value: t.value, label: t.label }))}
                    value={prefs.timeZone}
                    onSelect={(v) => savePref({ timeZone: v as string })}
                    onClose={() => setOpenSheet(null)}
                />
            )}

            {/* Logout Confirm */}
            {showLogout && (
                <LogoutDialog
                    onConfirm={handleLogout}
                    onCancel={() => setShowLogout(false)}
                />
            )}
        </div>
    );
};
