import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
    dashboardApi,
    type DashboardResponse,
    type DashboardTransaction,
    type CashflowSummary,
} from "@/api/dashboard.api";
import {
    transactionsApi,
    type TxDetail,
    type TransactionType,
} from "@/api/transactions.api";
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

const TYPE_LABELS: Record<string, string> = {
    income:     "Thu nhập",
    expense:    "Chi tiêu",
    investment: "Đầu tư",
    saving:     "Tiết kiệm",
};

const TYPE_COLORS: Record<TransactionType, string> = {
    income:     "var(--color-income)",
    expense:    "var(--color-expense)",
    investment: "var(--color-investment)",
    saving:     "var(--color-saving)",
};

type EditingField = "date" | "note" | "merchant" | null;

/* ─────────────────────────────────────────
   SVG Pie Chart
───────────────────────────────────────── */
const SLICE_COLORS = {
    expense:    "#dc2626",
    investment: "#7c3aed",
    saving:     "#2563eb",
    available:  "#e07b39",
};

interface SliceData {
    key:   string;
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
   Full Detail Sheet (matches TransactionsPage)
───────────────────────────────────────── */
function DetailSheet({
    tx,
    onClose,
    onDelete,
    onUpdate,
}: {
    tx: TxDetail;
    onClose: () => void;
    onDelete: (id: string) => void;
    onUpdate: (id: string) => void;
}) {
    const splits = tx.splits;
    const timeStr = formatTime(tx.createdAt);
    const dateStr = formatDateShort(tx.transactionDate);
    const typeColor = TYPE_COLORS[tx.type];
    const categoryLabel = splits.map((s) => s.categoryName).join(", ");

    const [editingField, setEditingField] = useState<EditingField>(null);
    const [tempDate, setTempDate]         = useState(tx.transactionDate.slice(0, 10));
    const [tempNote, setTempNote]         = useState(tx.note ?? "");
    const [tempMerchant, setTempMerchant] = useState(tx.merchantName ?? "");
    const [saving, setSaving]             = useState(false);

    async function handleSave(field: EditingField) {
        if (!field || saving) return;
        setSaving(true);
        try {
            const dto =
                field === "date"     ? { transactionDate: tempDate } :
                field === "note"     ? { note: tempNote || null } :
                                       { merchantName: tempMerchant || null };
            await transactionsApi.update(tx.id, dto);
            onUpdate(tx.id);
            setEditingField(null);
        } catch {
            // keep editing open on error
        } finally {
            setSaving(false);
        }
    }

    function handleCancel() {
        setTempDate(tx.transactionDate.slice(0, 10));
        setTempNote(tx.note ?? "");
        setTempMerchant(tx.merchantName ?? "");
        setEditingField(null);
    }

    return (
        <>
            <div className="detail-sheet-overlay" onClick={onClose} />
            <div className="detail-sheet">
                <div className="detail-sheet__topbar">
                    <button
                        className="detail-sheet__close"
                        onClick={onClose}
                        aria-label="Đóng"
                    >
                        <Icon name="close" size={20} />
                    </button>
                    <span className="detail-sheet__title">Thông tin giao dịch</span>
                    <button
                        className="detail-sheet__delete"
                        onClick={() => onDelete(tx.id)}
                        aria-label="Xoá giao dịch"
                        type="button"
                    >
                        <Icon name="delete" size={20} />
                    </button>
                </div>

                <div className="detail-sheet__scroll">
                    <div className="detail-sheet__body">

                        {/* ── Loại ── */}
                        <div className="detail-row">
                            <span className="detail-row__label">Loại</span>
                            <span
                                className="detail-pill detail-pill--type"
                                style={{ color: typeColor }}
                            >
                                {TYPE_LABELS[tx.type]}
                            </span>
                        </div>

                        {/* ── Danh mục ── */}
                        {categoryLabel && (
                            <div className="detail-row">
                                <span className="detail-row__label">Danh mục</span>
                                <span
                                    className="detail-pill"
                                    style={{ color: "var(--color-text-secondary)" }}
                                >
                                    {categoryLabel}
                                </span>
                            </div>
                        )}

                        {/* ── Số tiền ── */}
                        <div className="detail-row detail-row--center">
                            <span className="detail-row__label">Số tiền</span>
                            <span className="detail-row__value detail-row__value--amount">
                                {formatCurrency(tx.amount, tx.currency)}
                            </span>
                        </div>

                        {/* ── Ngày giờ ── */}
                        <div className="detail-row">
                            <span className="detail-row__label">Ngày giờ</span>
                            {editingField === "date" ? (
                                <div className="detail-row__edit-row">
                                    <input
                                        className="detail-row__edit-input"
                                        type="date"
                                        value={tempDate}
                                        onChange={(e) => setTempDate(e.target.value)}
                                        max={new Date().toISOString().slice(0, 10)}
                                        autoFocus
                                    />
                                    <button className="detail-row__save-btn" onClick={() => handleSave("date")} disabled={saving} type="button">
                                        <Icon name="check" size={16} />
                                    </button>
                                    <button className="detail-row__cancel-btn" onClick={handleCancel} type="button">
                                        <Icon name="close" size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="detail-row__value-row">
                                    <span className="detail-row__value">{timeStr} – {dateStr}</span>
                                    <button className="detail-row__edit-btn" onClick={() => setEditingField("date")} type="button" aria-label="Chỉnh sửa ngày giờ">
                                        <Icon name="edit" size={14} className="detail-row__edit-icon" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ── Nội dung ── */}
                        <div className="detail-row">
                            <span className="detail-row__label">Nội dung</span>
                            {editingField === "note" ? (
                                <div className="detail-row__edit-row">
                                    <input
                                        className="detail-row__edit-input"
                                        value={tempNote}
                                        onChange={(e) => setTempNote(e.target.value)}
                                        maxLength={500}
                                        placeholder="Nhập nội dung..."
                                        autoFocus
                                    />
                                    <button className="detail-row__save-btn" onClick={() => handleSave("note")} disabled={saving} type="button">
                                        <Icon name="check" size={16} />
                                    </button>
                                    <button className="detail-row__cancel-btn" onClick={handleCancel} type="button">
                                        <Icon name="close" size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="detail-row__value-row">
                                    <span className="detail-row__value">
                                        {tx.merchantName || tx.note || "Giao dịch"}
                                    </span>
                                    <button className="detail-row__edit-btn" onClick={() => setEditingField("note")} type="button" aria-label="Chỉnh sửa nội dung">
                                        <Icon name="edit" size={14} className="detail-row__edit-icon" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ── Cửa hàng ── */}
                        <div className="detail-row">
                            <span className="detail-row__label">Cửa hàng</span>
                            {editingField === "merchant" ? (
                                <div className="detail-row__edit-row">
                                    <input
                                        className="detail-row__edit-input"
                                        value={tempMerchant}
                                        onChange={(e) => setTempMerchant(e.target.value)}
                                        maxLength={200}
                                        placeholder="Nhập tên cửa hàng..."
                                        autoFocus
                                    />
                                    <button className="detail-row__save-btn" onClick={() => handleSave("merchant")} disabled={saving} type="button">
                                        <Icon name="check" size={16} />
                                    </button>
                                    <button className="detail-row__cancel-btn" onClick={handleCancel} type="button">
                                        <Icon name="close" size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="detail-row__value-row">
                                    <span className="detail-row__value">{tx.merchantName ?? "—"}</span>
                                    <button className="detail-row__edit-btn" onClick={() => setEditingField("merchant")} type="button" aria-label="Chỉnh sửa cửa hàng">
                                        <Icon name="edit" size={14} className="detail-row__edit-icon" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ── Mã giao dịch ── */}
                        <div className="detail-row">
                            <span className="detail-row__label">Mã giao dịch</span>
                            <span className="detail-row__value detail-row__value--code">
                                {txCode(tx.id)}
                            </span>
                        </div>

                        {/* ── Ảnh hóa đơn ── */}
                        {tx.receiptImageUrl && (
                            <div className="detail-sheet__receipt">
                                <img src={tx.receiptImageUrl} alt="Hóa đơn" />
                            </div>
                        )}
                    </div>
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
    const navigate = useNavigate();
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
    const [showDeletedToast, setShowDeletedToast] = useState(false);

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

    /* ── Delete transaction ── */
    async function handleDeleteTx(id: string) {
        setData((prev) =>
            prev ? { ...prev, transactions: prev.transactions.filter((tx) => tx.transactionId !== id) } : prev,
        );
        setDetailTx(null);
        try {
            await transactionsApi.deleteTransaction(id);
            setShowDeletedToast(true);
            setTimeout(() => setShowDeletedToast(false), 3000);
        } catch {
            loadDashboard(); // restore on error
        }
    }

    /* ── Update transaction ── */
    async function handleUpdateTx(id: string) {
        try {
            const updated = await transactionsApi.getById(id);
            setDetailTx(updated);
            loadDashboard();
        } catch { /* ignore */ }
    }

    /* ── Derived values ── */
    const summary  = data?.summary;
    const currency = data?.displayCurrency ?? cashflow?.currency ?? summary?.currency ?? "VND";

    const cfIncome     = cashflow?.income     ?? 0;
    const cfExpense    = cashflow?.expense    ?? 0;
    const cfInvestment = cashflow?.investment ?? 0;
    const cfSaving     = cashflow?.saving     ?? 0;
    const cfAvailable  = Math.max(0, cfIncome - cfExpense - cfInvestment - cfSaving);

    const income     = summary?.income     ?? 0;
    const expense    = summary?.expense    ?? 0;
    const investment = summary?.investment ?? 0;
    const saving     = summary?.saving     ?? 0;
    const available  = income - expense - investment - saving;

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

    const recentTxs = data?.transactions.slice(0, 5) ?? [];

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
                        <button
                            className="txn-section__see-all"
                            onClick={() => navigate("/transactions")}
                        >
                            Xem tất cả
                        </button>
                    </div>

                    {loading ? (
                        <div className="dash-recent-list">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="txcard txcard--skeleton">
                                    <span className="skeleton" style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0 }} />
                                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                                        <span className="skeleton" style={{ width: "55%", height: 14 }} />
                                        <span className="skeleton" style={{ width: "35%", height: 12 }} />
                                    </div>
                                    <span className="skeleton" style={{ width: 70, height: 22 }} />
                                </div>
                            ))}
                        </div>
                    ) : recentTxs.length === 0 ? (
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
                        <div className="dash-recent-list">
                            {recentTxs.map((tx: DashboardTransaction) => (
                                <div
                                    key={tx.transactionId}
                                    className="txcard"
                                    onClick={() => openTxDetail(tx.transactionId)}
                                >
                                    <div className="txcard__icon">
                                        {tx.type === "income"     && <Icon name="trending_up"       size={20} />}
                                        {tx.type === "expense"    && <Icon name="shopping_bag"      size={20} />}
                                        {tx.type === "investment" && <Icon name="candlestick_chart" size={20} />}
                                        {tx.type === "saving"     && <Icon name="savings"           size={20} />}
                                    </div>
                                    <div className="txcard__body">
                                        <div className={`txcard__amount txcard__amount--${tx.type}`}>
                                            {typeSign(tx.type)}{formatCurrency(tx.amount, tx.currency)}
                                        </div>
                                        <div className="txcard__desc">
                                            {tx.merchantName || tx.note || "Giao dịch"}
                                        </div>
                                    </div>
                                    <div className="txcard__right">
                                        {tx.categoryName && (
                                            <span className="txcard__cat-pill">{tx.categoryName}</span>
                                        )}
                                        <span className="txcard__time">
                                            {formatTime(tx.createdAt)} – {formatDate(tx.transactionDate)}
                                        </span>
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
                <DetailSheet
                    tx={detailTx}
                    onClose={() => setDetailTx(null)}
                    onDelete={handleDeleteTx}
                    onUpdate={handleUpdateTx}
                />
            )}

            {/* Deleted toast */}
            {showDeletedToast && (
                <div className="undo-toast">Giao dịch đã được xóa</div>
            )}
        </div>
    );
};
