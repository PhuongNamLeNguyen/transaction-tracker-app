import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
    dashboardApi,
    type DashboardResponse,
    type DashboardTransaction,
} from "@/api/dashboard.api";
import "@/styles/dashboard.css";

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "Chào buổi sáng";
    if (h < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
}

function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: currency === "VND" ? "VND" : currency,
        maximumFractionDigits: currency === "VND" ? 0 : 2,
    }).format(amount);
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function getMonthLabel(date: Date): string {
    return `${date.getMonth() + 1}/${date.getFullYear()}`;
}

function typeSign(type: DashboardTransaction["type"]): string {
    return type === "income" ? "+" : "-";
}

/* ─────────────────────────────────────────
   SVG Pie Chart
───────────────────────────────────────── */
const SLICE_COLORS = {
    expense: "#dc2626",
    investment: "#7c3aed",
    saving: "#2563eb",
    available: "#e07b39",
};

interface SliceData {
    key: string;
    label: string;
    value: number;
    color: string;
}

function PieChart({ slices }: { slices: SliceData[] }) {
    const total = slices.reduce((s, sl) => s + sl.value, 0);
    const R = 48;
    const strokeWidth = 16;
    const cx = 65;
    const cy = 65;
    const circumference = 2 * Math.PI * R;

    if (total === 0) {
        return (
            <svg width="130" height="130" viewBox="0 0 130 130">
                <circle
                    cx={cx} cy={cy} r={R}
                    fill="none"
                    stroke="var(--color-border)"
                    strokeWidth={strokeWidth}
                />
            </svg>
        );
    }

    let offset = 0;
    const paths = slices
        .filter((sl) => sl.value > 0)
        .map((sl) => {
            const pct = sl.value / total;
            const dash = pct * circumference;
            const path = (
                <circle
                    key={sl.key}
                    cx={cx} cy={cy} r={R}
                    fill="none"
                    stroke={sl.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset * circumference}
                    strokeLinecap="butt"
                />
            );
            offset += pct;
            return path;
        });

    const availablePct = total > 0 ? Math.round((slices.find(s => s.key === "available")?.value ?? 0) / total * 100) : 0;

    return (
        <svg width="130" height="130" viewBox="0 0 130 130">
            <circle
                cx={cx} cy={cy} r={R}
                fill="none"
                stroke="var(--color-border)"
                strokeWidth={strokeWidth}
            />
            {paths}
            {/* Center label */}
            <text
                x={cx} y={cy - 4}
                textAnchor="middle"
                fontSize="13"
                fontWeight="700"
                fill="var(--color-text-primary)"
                style={{ transform: "rotate(90deg)", transformOrigin: `${cx}px ${cy}px` }}
            >
                {availablePct}%
            </text>
            <text
                x={cx} y={cy + 12}
                textAnchor="middle"
                fontSize="10"
                fill="var(--color-text-secondary)"
                style={{ transform: "rotate(90deg)", transformOrigin: `${cx}px ${cy}px` }}
            >
                khả dụng
            </text>
        </svg>
    );
}

/* ─────────────────────────────────────────
   Bottom Sheets
───────────────────────────────────────── */
type TxType = "income" | "expense" | "investment" | "saving";

const TX_OPTIONS: Array<{ type: TxType; label: string; icon: string; desc: string }> = [
    { type: "income",     label: "Nhập tiền thu",  icon: "💰", desc: "Ghi nhận khoản thu nhập" },
    { type: "expense",    label: "Nhập tiền chi",  icon: "🛍️", desc: "Ghi nhận khoản chi tiêu" },
    { type: "investment", label: "Đầu tư",          icon: "📈", desc: "Ghi nhận khoản đầu tư" },
    { type: "saving",     label: "Tiết kiệm",       icon: "🐖", desc: "Ghi nhận khoản tiết kiệm" },
];

const INPUT_METHODS = [
    { key: "camera",  label: "Chụp ảnh hóa đơn",       icon: "📷", desc: "Chụp ảnh để nhập tự động", iconClass: "camera",  highlighted: true },
    { key: "gallery", label: "Tải ảnh từ thư viện",     icon: "🖼️", desc: "Chọn ảnh đã chụp sẵn",    iconClass: "gallery", highlighted: false },
    { key: "manual",  label: "Nhập thủ công",            icon: "✏️", desc: "Điền thông tin bằng tay",  iconClass: "manual",  highlighted: false },
];

function Sheet1({
    onClose,
    onSelect,
}: {
    onClose: () => void;
    onSelect: (type: TxType) => void;
}) {
    return (
        <>
            <div className="sheet-overlay" onClick={onClose} />
            <div className="sheet">
                <div className="sheet__handle" />
                <div className="sheet__title">Tải hóa đơn</div>
                <div className="sheet__options">
                    {TX_OPTIONS.map((opt) => (
                        <button
                            key={opt.type}
                            className={`sheet-option${opt.type === "income" ? " sheet-option--income sheet-option--highlighted" : ""}`}
                            onClick={() => onSelect(opt.type)}
                        >
                            <span className={`sheet-option__icon sheet-option__icon--${opt.type}`}>
                                {opt.icon}
                            </span>
                            <span className="sheet-option__body">
                                <span className="sheet-option__name">{opt.label}</span>
                                <span className="sheet-option__desc">{opt.desc}</span>
                            </span>
                            <svg className="sheet-option__chevron" width="18" height="18" fill="none" viewBox="0 0 24 24">
                                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}

function Sheet2({
    txType,
    onClose,
}: {
    txType: TxType;
    onClose: () => void;
}) {
    const opt = TX_OPTIONS.find((o) => o.type === txType)!;
    return (
        <>
            <div className="sheet-overlay" onClick={onClose} />
            <div className="sheet">
                <div className="sheet__handle" />
                <div className="sheet__title">Chọn phương thức nhập — {opt.label}</div>
                <div className="sheet__options">
                    {INPUT_METHODS.map((m) => (
                        <button
                            key={m.key}
                            className={`sheet-option${m.highlighted ? " sheet-option--income sheet-option--highlighted" : ""}`}
                            onClick={onClose}
                        >
                            <span className={`sheet-option__icon sheet-option__icon--${m.iconClass}`}>
                                {m.icon}
                            </span>
                            <span className="sheet-option__body">
                                <span className="sheet-option__name">{m.label}</span>
                                <span className="sheet-option__desc">{m.desc}</span>
                            </span>
                            <svg className="sheet-option__chevron" width="18" height="18" fill="none" viewBox="0 0 24 24">
                                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}

/* ─────────────────────────────────────────
   Bottom Nav
───────────────────────────────────────── */
function BottomNav({
    fabOpen,
    onFabClick,
}: {
    fabOpen: boolean;
    onFabClick: () => void;
}) {
    const navigate = useNavigate();
    return (
        <nav className="bottom-nav" aria-label="Điều hướng chính">
            {/* Trang chủ */}
            <button className="bottom-nav__item bottom-nav__item--active">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                    <path d="M3 12L12 3l9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 12v9h18v-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Trang chủ
            </button>

            {/* Chi tiết */}
            <button className="bottom-nav__item" onClick={() => navigate("/transactions")}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M3 9h18" stroke="currentColor" strokeWidth="2"/>
                    <path d="M9 14h6M9 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Chi tiết
            </button>

            {/* FAB center */}
            <div className="bottom-nav__fab-slot">
                <button
                    className={`fab${fabOpen ? " fab--open" : ""}`}
                    onClick={onFabClick}
                    aria-label="Thêm giao dịch"
                >
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                </button>
            </div>

            {/* Kế hoạch */}
            <button className="bottom-nav__item">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Kế hoạch
            </button>

            {/* Cài đặt */}
            <button className="bottom-nav__item">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Cài đặt
            </button>
        </nav>
    );
}

/* ─────────────────────────────────────────
   Main Dashboard Page
───────────────────────────────────────── */
export const DashboardPage = () => {
    const { user } = useAuth();
    const [data, setData] = useState<DashboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [balanceHidden, setBalanceHidden] = useState(false);
    const [fabOpen, setFabOpen] = useState(false);
    const [selectedTxType, setSelectedTxType] = useState<TxType | null>(null);

    const loadDashboard = useCallback(async () => {
        try {
            const res = await dashboardApi.getDashboard();
            setData(res);
        } catch {
            /* ignore — show empty state */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const summary = data?.summary;
    const currency = summary?.currency ?? "VND";
    const currentMonth = getMonthLabel(new Date());

    /* Pie chart slices */
    const income = summary?.income ?? 0;
    const expense = summary?.expense ?? 0;
    const investment = summary?.investment ?? 0;
    const saving = summary?.saving ?? 0;
    const available = Math.max(0, income - expense - investment - saving);

    const slices: SliceData[] = [
        { key: "expense",    label: "Chi tiêu",   value: expense,    color: SLICE_COLORS.expense },
        { key: "investment", label: "Đầu tư",      value: investment, color: SLICE_COLORS.investment },
        { key: "saving",     label: "Tiết kiệm",   value: saving,     color: SLICE_COLORS.saving },
        { key: "available",  label: "Khả dụng",    value: available,  color: SLICE_COLORS.available },
    ];

    const sliceTotal = expense + investment + saving + available;

    function closeFab() {
        setFabOpen(false);
        setSelectedTxType(null);
    }

    return (
        <div className="dashboard">
            {/* Header */}
            <header className="dash-header">
                <div className="dash-header__left">
                    <div className="dash-header__avatar" aria-hidden="true">
                        {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                        <div className="dash-header__greeting">{getGreeting()},</div>
                        <div className="dash-header__name">{user?.name || "bạn"}</div>
                    </div>
                </div>
                <button className="dash-header__bell" aria-label="Thông báo">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
            </header>

            <div className="dashboard__body">
                {/* Balance Card */}
                <section className="balance-card">
                    <div className="balance-card__label-row">
                        <span className="balance-card__label">Số dư khả dụng</span>
                        <button
                            className="balance-card__eye"
                            onClick={() => setBalanceHidden((v) => !v)}
                            aria-label={balanceHidden ? "Hiện số dư" : "Ẩn số dư"}
                        >
                            {balanceHidden ? (
                                <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            ) : (
                                <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                            )}
                        </button>
                    </div>
                    <div className="balance-card__amount">
                        {loading ? (
                            <span className="skeleton" style={{ display: "inline-block", width: 160, height: 32 }} />
                        ) : balanceHidden ? (
                            "••••••••"
                        ) : (
                            formatCurrency(summary?.balance ?? 0, currency)
                        )}
                    </div>
                    <div className="balance-card__footer">
                        <span className="balance-card__updated">
                            <span className="balance-card__dot" />
                            Vừa cập nhật
                        </span>
                        <button className="balance-card__detail">Chi tiết →</button>
                    </div>
                </section>

                {/* Cash flow section */}
                <section>
                    <div className="cashflow-section__header">
                        <span className="cashflow-section__title">Thống kê dòng tiền trong tháng</span>
                        <div className="month-picker">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            {currentMonth}
                        </div>
                    </div>

                    {/* Pie chart card */}
                    <div className="piechart-card">
                        <div className="piechart-card__chart-row">
                            <div className="piechart-card__chart">
                                <PieChart slices={slices} />
                            </div>
                            <div className="piechart-card__legend">
                                {slices.map((sl) => (
                                    <div key={sl.key} className="legend-item">
                                        <div className="legend-item__left">
                                            <span
                                                className="legend-item__dot"
                                                style={{ background: sl.color }}
                                            />
                                            <span className="legend-item__label">{sl.label}</span>
                                        </div>
                                        <span className="legend-item__pct">
                                            {sliceTotal > 0
                                                ? Math.round((sl.value / sliceTotal) * 100)
                                                : 0}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="piechart-card__income-row">
                            <span className="piechart-card__income-label">Tổng thu nhập</span>
                            <span className="piechart-card__income-val">
                                {loading ? "—" : formatCurrency(income, currency)}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Recent Transactions */}
                <section>
                    <div className="txn-section__header">
                        <span className="txn-section__title">Giao dịch gần đây</span>
                        <button className="txn-section__see-all">Xem tất cả</button>
                    </div>

                    {loading ? (
                        <div className="txn-list">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="txn-item">
                                    <span className="skeleton" style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }} />
                                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                                        <span className="skeleton" style={{ width: "60%", height: 14 }} />
                                        <span className="skeleton" style={{ width: "40%", height: 12 }} />
                                    </div>
                                    <span className="skeleton" style={{ width: 64, height: 14 }} />
                                </div>
                            ))}
                        </div>
                    ) : !data?.transactions.length ? (
                        <div className="dash-empty">
                            <div className="dash-empty__icon">📭</div>
                            <div className="dash-empty__title">Chưa có giao dịch</div>
                            <div className="dash-empty__text">
                                {data?.period
                                    ? "Nhấn + để thêm giao dịch đầu tiên trong tháng này."
                                    : "Thiết lập kế hoạch chi tiêu để bắt đầu theo dõi."}
                            </div>
                        </div>
                    ) : (
                        <div className="txn-list">
                            {data.transactions.map((tx: DashboardTransaction) => (
                                <div key={tx.transactionId} className="txn-item">
                                    <div className={`txn-item__icon txn-item__icon--${tx.type}`}>
                                        {tx.type === "income" && "💰"}
                                        {tx.type === "expense" && "🛍️"}
                                        {tx.type === "investment" && "📈"}
                                        {tx.type === "saving" && "🐖"}
                                    </div>
                                    <div className="txn-item__body">
                                        <div className="txn-item__name">
                                            {tx.merchantName ?? tx.categoryName ?? "Giao dịch"}
                                        </div>
                                        <div className="txn-item__meta">
                                            {formatDate(tx.transactionDate)}
                                            {tx.splitCount > 1 && ` · ${tx.splitCount} danh mục`}
                                            {tx.note && ` · ${tx.note}`}
                                        </div>
                                    </div>
                                    <div className={`txn-item__amount txn-item__amount--${tx.type}`}>
                                        {typeSign(tx.type)}{formatCurrency(tx.amount, tx.currency)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Bottom Nav */}
            <BottomNav fabOpen={fabOpen} onFabClick={() => setFabOpen((v) => !v)} />

            {/* Sheet 1 — pick tx type */}
            {fabOpen && !selectedTxType && (
                <Sheet1
                    onClose={closeFab}
                    onSelect={(type) => setSelectedTxType(type)}
                />
            )}

            {/* Sheet 2 — pick input method */}
            {fabOpen && selectedTxType && (
                <Sheet2 txType={selectedTxType} onClose={closeFab} />
            )}
        </div>
    );
};
