import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
    dashboardApi,
    type DashboardResponse,
    type DashboardTransaction,
} from "@/api/dashboard.api";
import { BottomNav } from "@/components/common/BottomNav";
import { Icon } from "@/components/common/Icon";
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
   (BottomNav moved to shared component)
───────────────────────────────────────── */

/* ─────────────────────────────────────────
   Main Dashboard Page
───────────────────────────────────────── */
export const DashboardPage = () => {
    const { user } = useAuth();
    const [data, setData] = useState<DashboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [balanceHidden, setBalanceHidden] = useState(false);

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
                    <Icon name="notifications" size={22} />
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
                                <Icon name="visibility_off" size={18} />
                            ) : (
                                <Icon name="visibility" size={18} />
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
                            <Icon name="calendar_month" size={14} />
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
        </div>
    );
};
