import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
    dashboardApi,
    type DashboardResponse,
    type DashboardTransaction,
    type CashflowSummary,
} from "@/api/dashboard.api";
import { transactionsApi, type TxDetail } from "@/api/transactions.api";
import { BottomNav } from "@/components/common/BottomNav";
import { Icon } from "@/components/common/Icon";
import "@/styles/dashboard.css";
import "@/styles/transactions.css";

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

function formatTime(isoStr: string): string {
    const d = new Date(isoStr);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function formatDateShort(dateStr: string): string {
    const [, mm, dd] = dateStr.slice(0, 10).split("-");
    return `${parseInt(dd)}/${parseInt(mm)}`;
}

function txCode(id: string): string {
    return id.replace(/-/g, "").slice(0, 10).toUpperCase();
}

function monthLabel(month: number, year: number): string {
    return `${month}/${year}`;
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
                <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--color-border)" strokeWidth={strokeWidth} />
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

    const availablePct = total > 0
        ? Math.round((slices.find(s => s.key === "available")?.value ?? 0) / total * 100)
        : 0;

    return (
        <svg width="130" height="130" viewBox="0 0 130 130">
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--color-border)" strokeWidth={strokeWidth} />
            {paths}
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="700"
                fill="var(--color-text-primary)"
                style={{ transform: "rotate(90deg)", transformOrigin: `${cx}px ${cy}px` }}>
                {availablePct}%
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10"
                fill="var(--color-text-secondary)"
                style={{ transform: "rotate(90deg)", transformOrigin: `${cx}px ${cy}px` }}>
                khả dụng
            </text>
        </svg>
    );
}

/* ─────────────────────────────────────────
   Detail Sheet (reused from TransactionsPage)
───────────────────────────────────────── */
function DetailSheet({ tx, onClose }: { tx: TxDetail; onClose: () => void }) {
    const primaryCategory = tx.splits[0]?.categoryName ?? null;
    const timeStr = formatTime(tx.createdAt);
    const dateStr = formatDateShort(tx.transactionDate);

    return (
        <>
            <div className="detail-sheet-overlay" onClick={onClose} />
            <div className="detail-sheet">
                <div className="detail-sheet__topbar">
                    <button className="detail-sheet__close" onClick={onClose} aria-label="Đóng">
                        <Icon name="close" size={20} />
                    </button>
                    <span className="detail-sheet__title">Thông tin giao dịch</span>
                    <div style={{ width: 28 }} />
                </div>
                <div className="detail-sheet__body">
                    <div className="detail-row">
                        <span className="detail-row__label">Nội dung</span>
                        <span className="detail-row__value">{tx.note ?? tx.splits[0]?.categoryName ?? "Giao dịch"}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-row__label">Số tiền</span>
                        <span className="detail-row__value detail-row__value--amount">
                            {formatCurrency(tx.amount, tx.currency)}
                        </span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-row__label">Ngày giờ</span>
                        <span className="detail-row__value">{timeStr} – {dateStr}</span>
                    </div>
                    {primaryCategory && (
                        <div className="detail-row">
                            <span className="detail-row__label">Danh mục</span>
                            <span className="detail-row__value">{primaryCategory}</span>
                        </div>
                    )}
                    {tx.splits.length > 1 && (
                        <div className="detail-row" style={{ flexDirection: "column", gap: "var(--space-2)" }}>
                            <span className="detail-row__label">Phân bổ</span>
                            {tx.splits.map((s) => (
                                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                                    <span className="detail-row__value">{s.categoryName}</span>
                                    <span className="detail-row__value" style={{ fontWeight: 600 }}>
                                        {formatCurrency(s.amount, tx.currency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="detail-row">
                        <span className="detail-row__label">Mã giao dịch</span>
                        <span className="detail-row__value detail-row__value--code">{txCode(tx.id)}</span>
                    </div>
                    {tx.receiptImageUrl && (
                        <div className="detail-sheet__receipt">
                            <img src={tx.receiptImageUrl} alt="Hóa đơn" />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

/* ─────────────────────────────────────────
   Main Dashboard Page
───────────────────────────────────────── */
export const DashboardPage = () => {
    const { user } = useAuth();
    const nowDate = new Date();

    const [data, setData]   = useState<DashboardResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const [balanceHidden, setBalanceHidden] = useState(false);
    const [detailOpen, setDetailOpen]       = useState(false);

    const [selectedYear, setSelectedYear]   = useState(nowDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(nowDate.getMonth() + 1);

    const [cashflow, setCashflow]               = useState<CashflowSummary | null>(null);
    const [cashflowLoading, setCashflowLoading] = useState(true);

    const [detailTx, setDetailTx]           = useState<TxDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    /* ── Loaders ── */
    const loadDashboard = useCallback(async () => {
        try {
            const res = await dashboardApi.getDashboard();
            setData(res);
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }, []);

    const loadCashflow = useCallback(async (year: number, month: number) => {
        setCashflowLoading(true);
        try { setCashflow(await dashboardApi.getCashflow(year, month)); }
        catch { setCashflow(null); }
        finally { setCashflowLoading(false); }
    }, []);

    useEffect(() => { loadDashboard(); }, [loadDashboard]);
    useEffect(() => {
        loadCashflow(selectedYear, selectedMonth);
    }, [selectedYear, selectedMonth, loadCashflow]);

    /* ── Open transaction detail ── */
    async function openTxDetail(id: string) {
        setDetailLoading(true);
        try {
            const tx = await transactionsApi.getById(id);
            setDetailTx(tx);
        } catch { /* ignore */ }
        finally { setDetailLoading(false); }
    }

    /* ── Derived values ── */
    const summary  = data?.summary;
    const currency = cashflow?.currency ?? summary?.currency ?? "VND";

    const cfIncome     = cashflow?.income     ?? 0;
    const cfExpense    = cashflow?.expense    ?? 0;
    const cfInvestment = cashflow?.investment ?? 0;
    const cfSaving     = cashflow?.saving     ?? 0;
    const cfAvailable  = Math.max(0, cfIncome - cfExpense - cfInvestment - cfSaving);

    const income     = summary?.income     ?? 0;
    const expense    = summary?.expense    ?? 0;
    const investment = summary?.investment ?? 0;
    const saving     = summary?.saving     ?? 0;
    const available  = Math.max(0, income - expense - investment - saving);

    const now = new Date();
    const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;

    function prevMonth() {
        if (selectedMonth === 1) { setSelectedYear(selectedYear - 1); setSelectedMonth(12); }
        else { setSelectedMonth(selectedMonth - 1); }
    }
    function nextMonth() {
        if (isCurrentMonth) return;
        if (selectedMonth === 12) { setSelectedYear(selectedYear + 1); setSelectedMonth(1); }
        else { setSelectedMonth(selectedMonth + 1); }
    }

    const slices: SliceData[] = [
        { key: "expense",    label: "Chi tiêu",  value: cfExpense,    color: SLICE_COLORS.expense },
        { key: "investment", label: "Đầu tư",    value: cfInvestment, color: SLICE_COLORS.investment },
        { key: "saving",     label: "Tiết kiệm", value: cfSaving,     color: SLICE_COLORS.saving },
        { key: "available",  label: "Khả dụng",  value: cfAvailable,  color: SLICE_COLORS.available },
    ];
    const sliceTotal = cfExpense + cfInvestment + cfSaving + cfAvailable;

    /* ── Updated label — based on most recent transaction date ── */
    function getRelativeTimeLabel(isoStr: string): string {
        const diffMs = Date.now() - new Date(isoStr).getTime();
        const minutes = Math.floor(diffMs / 60_000);
        if (minutes < 60) return `Cập nhật ${Math.max(minutes, 1)} phút trước`;
        const hours = Math.floor(diffMs / 3_600_000);
        if (hours < 24) return `Cập nhật ${hours} tiếng trước`;
        const days = Math.floor(diffMs / 86_400_000);
        if (days < 7) return `Cập nhật ${days} ngày trước`;
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `Cập nhật ${weeks} tuần trước`;
        const months = Math.floor(days / 30);
        if (months < 12) return `Cập nhật ${months} tháng trước`;
        const years = Math.floor(days / 365);
        return `Cập nhật ${years} năm trước`;
    }
    const latestTxCreatedAt = data?.transactions[0]?.createdAt ?? null;
    const updatedLabel = loading
        ? "Đang tải..."
        : latestTxCreatedAt
            ? getRelativeTimeLabel(latestTxCreatedAt)
            : "Chưa có giao dịch";

    return (
        <div className="dashboard">
            {/* ── Header ── */}
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
                    <Icon name="notifications" size={22} />
                </button>
            </header>

            <div className="dashboard__body">
                {/* ── Balance Card ── */}
                <section className="balance-card">
                    <div className="balance-card__label-row">
                        <div className="balance-card__label-group">
                            <span className="balance-card__label">Số dư khả dụng</span>
                            <button
                                className="balance-card__eye"
                                onClick={() => setBalanceHidden((v) => !v)}
                                aria-label={balanceHidden ? "Hiện số dư" : "Ẩn số dư"}
                            >
                                <Icon name={balanceHidden ? "visibility_off" : "visibility"} size={18} />
                            </button>
                        </div>
                        <span className="balance-card__updated">
                            <span className="balance-card__dot" />
                            {updatedLabel}
                        </span>
                    </div>

                    <div className="balance-card__amount">
                        {loading ? (
                            <span className="skeleton" style={{ display: "inline-block", width: 160, height: 32 }} />
                        ) : balanceHidden ? (
                            "••••••••"
                        ) : (
                            formatCurrency(available, currency)
                        )}
                    </div>

                    <div className="balance-card__footer">
                        <button className="balance-card__detail" onClick={() => setDetailOpen((v) => !v)}>
                            {detailOpen ? "Ẩn chi tiết" : "Chi tiết"}
                            <Icon name={detailOpen ? "expand_less" : "expand_more"} size={16} />
                        </button>
                    </div>

                    {detailOpen && !loading && (
                        <div className="balance-card__cashflow">
                            {[
                                { label: "Thu nhập",  value: income,     color: "var(--color-income)" },
                                { label: "Chi tiêu",  value: expense,    color: "var(--color-expense)" },
                                { label: "Đầu tư",    value: investment, color: "var(--color-investment)" },
                                { label: "Tiết kiệm", value: saving,     color: "var(--color-saving)" },
                            ].map((row) => (
                                <div key={row.label} className="balance-card__cashflow-row">
                                    <span className="balance-card__cashflow-label">{row.label}</span>
                                    <span className="balance-card__cashflow-value" style={{ color: row.color }}>
                                        {formatCurrency(row.value, currency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* ── Cash flow section ── */}
                <section>
                    <div className="cashflow-section__header">
                        <span className="cashflow-section__title">Thống kê dòng tiền trong tháng</span>
                        <div className="month-picker">
                            <button className="month-picker__nav" onClick={prevMonth} aria-label="Tháng trước">
                                <Icon name="chevron_left" size={14} />
                            </button>
                            <Icon name="calendar_month" size={14} />
                            <span>{monthLabel(selectedMonth, selectedYear)}</span>
                            <button
                                className="month-picker__nav"
                                onClick={nextMonth}
                                disabled={isCurrentMonth}
                                aria-label="Tháng sau"
                            >
                                <Icon name="chevron_right" size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="piechart-card">
                        <div className="piechart-card__chart-row">
                            <div className="piechart-card__chart">
                                {cashflowLoading
                                    ? <div className="piechart-card__chart-skeleton skeleton" />
                                    : <PieChart slices={slices} />
                                }
                            </div>
                            <div className="piechart-card__legend">
                                {slices.map((sl) => {
                                    const pct = sliceTotal > 0 ? Math.round((sl.value / sliceTotal) * 100) : 0;
                                    const isZero = sl.value === 0;
                                    return (
                                        <div key={sl.key} className="legend-item">
                                            <div className="legend-item__left">
                                                <span className="legend-item__dot"
                                                    style={{ background: isZero ? "var(--color-text-tertiary)" : sl.color }} />
                                                <span className={`legend-item__label${isZero ? " legend-item__label--zero" : " legend-item__label--active"}`}>
                                                    {sl.label}
                                                </span>
                                            </div>
                                            <span className="legend-item__pct"
                                                style={{ color: isZero ? "var(--color-text-tertiary)" : sl.color, fontWeight: isZero ? undefined : "var(--weight-bold)" as React.CSSProperties["fontWeight"] }}>
                                                {pct}%
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="piechart-card__income-row">
                            <span className="piechart-card__income-label">Tổng thu nhập</span>
                            <span className="piechart-card__income-val">
                                {cashflowLoading ? "—" : formatCurrency(cfIncome, currency)}
                            </span>
                        </div>
                    </div>
                </section>

                {/* ── Recent Transactions ── */}
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
                                <div
                                    key={tx.transactionId}
                                    className="txn-item txn-item--clickable"
                                    onClick={() => openTxDetail(tx.transactionId)}
                                >
                                    <div className={`txn-item__icon txn-item__icon--${tx.type}`}>
                                        {tx.type === "income"     && <Icon name="trending_up"       size={20} />}
                                        {tx.type === "expense"    && <Icon name="shopping_bag"      size={20} />}
                                        {tx.type === "investment" && <Icon name="candlestick_chart" size={20} />}
                                        {tx.type === "saving"     && <Icon name="savings"           size={20} />}
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
            <BottomNav />

            {/* Detail loading overlay */}
            {detailLoading && (
                <div style={{
                    position: "fixed", inset: 0,
                    background: "rgba(0,0,0,0.2)",
                    zIndex: "var(--z-overlay)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <div style={{
                        background: "var(--color-surface)",
                        borderRadius: "var(--radius-lg)",
                        padding: "var(--space-6)",
                        color: "var(--color-text-secondary)",
                        fontSize: "var(--text-sm)",
                    }}>
                        Đang tải...
                    </div>
                </div>
            )}

            {/* Transaction detail sheet */}
            {detailTx && !detailLoading && (
                <DetailSheet tx={detailTx} onClose={() => setDetailTx(null)} />
            )}
        </div>
    );
};
