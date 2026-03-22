import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    planApi,
    type PlanResponse,
    type PlanProgressItem,
} from "@/api/budget.api";
import { BottomNav } from "@/components/common/BottomNav";
import { Icon } from "@/components/common/Icon";
import "@/styles/budget.css";

/* ─── Helpers ─── */
function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: currency === "VND" ? "VND" : currency,
        maximumFractionDigits: currency === "VND" ? 0 : 2,
    }).format(amount);
}

function formatDateVN(dateStr: string): string {
    const [y, m, d] = dateStr.split("-");
    return `${parseInt(d)}/${parseInt(m)}/${y}`;
}

function barState(pct: number): "safe" | "warning" | "exceeded" {
    if (pct >= 100) return "exceeded";
    if (pct >= 80) return "warning";
    return "safe";
}

/* ─── Plan Item ─── */
function PlanItem({ item }: { item: PlanProgressItem }) {
    const state = barState(item.utilisationPct);
    const clampedPct = Math.min(item.utilisationPct, 100);
    const remaining = item.planAmount - item.actualAmount;

    return (
        <div className="plan-item">
            <div className="plan-item__top">
                <div className="plan-item__icon">
                    {item.icon ? <Icon name={item.icon} size={20} /> : "📦"}
                </div>
                <div className="plan-item__info">
                    <div className="plan-item__name">{item.name}</div>
                    <div className="plan-item__amounts">
                        {formatCurrency(item.actualAmount, item.currency)}
                        {" / "}
                        {formatCurrency(item.planAmount, item.currency)}
                    </div>
                </div>
                <div className={`plan-item__pct plan-item__pct--${state}`}>
                    {item.utilisationPct.toFixed(0)}%
                </div>
            </div>

            <div className="plan-bar">
                <div
                    className={`plan-bar__fill plan-bar__fill--${state}`}
                    style={{ width: `${clampedPct}%` }}
                />
            </div>

            {state === "exceeded" && (
                <div
                    style={{
                        marginTop: "var(--space-2)",
                        fontSize: "var(--text-xs)",
                        color: "var(--color-plan-exceeded)",
                        fontWeight: "var(--weight-medium)",
                    }}
                >
                    Vượt kế hoạch{" "}
                    {formatCurrency(Math.abs(remaining), item.currency)}
                </div>
            )}
            {state === "warning" && (
                <div
                    style={{
                        marginTop: "var(--space-2)",
                        fontSize: "var(--text-xs)",
                        color: "var(--color-plan-warning)",
                        fontWeight: "var(--weight-medium)",
                    }}
                >
                    Còn lại{" "}
                    {formatCurrency(Math.max(0, remaining), item.currency)}
                </div>
            )}
        </div>
    );
}

/* ─── Main Page ─── */
export const BudgetPage = () => {
    const navigate = useNavigate();
    const { key } = useLocation();
    const [data, setData] = useState<PlanResponse | null>(null);
    const [fetchedKey, setFetchedKey] = useState<string | null>(null);
    const loading = fetchedKey !== key;

    useEffect(() => {
        let cancelled = false;
        planApi
            .getPlan()
            .then((d) => {
                if (!cancelled) {
                    setData(d);
                    setFetchedKey(key);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setData(null);
                    setFetchedKey(key);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [key]);

    const period = data?.period;
    const summary = data?.summary;
    const progress = data?.planProgress ?? [];
    const currency = summary?.currency ?? "VND";

    const totalPlan = progress.reduce((s, i) => s + i.planAmount, 0);
    const totalSpent = progress.reduce((s, i) => s + i.actualAmount, 0);
    const totalRemain = totalPlan - totalSpent;
    const overPlan = totalRemain < 0;

    return (
        <div className="plan-page">
            <div className="plan-page__header">
                <h1 className="plan-page__title">Kế hoạch chi tiêu</h1>
                {period && (
                    <button
                        className="plan-page__edit-btn"
                        onClick={() => navigate("/onboarding")}
                    >
                        Chỉnh sửa
                    </button>
                )}
            </div>

            <div className="plan-page__body">
                {/* Period Card */}
                {loading ? (
                    <div
                        className="skeleton"
                        style={{ height: 72, borderRadius: "var(--radius-xl)" }}
                    />
                ) : period ? (
                    <div className="period-card">
                        <div>
                            <div className="period-card__label">
                                Chu kỳ hiện tại
                            </div>
                            <div className="period-card__date">
                                {formatDateVN(period.startDate)} –{" "}
                                {formatDateVN(period.endDate)}
                            </div>
                        </div>
                        <div className="period-card__icon">
                            <Icon name="calendar_month" size={20} />
                        </div>
                    </div>
                ) : null}

                {/* Summary Grid */}
                {loading ? (
                    <div style={{ display: "flex", gap: "var(--space-3)" }}>
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="skeleton"
                                style={{
                                    flex: 1,
                                    height: 64,
                                    borderRadius: "var(--radius-lg)",
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    period && (
                        <div className="summary-grid">
                            <div className="summary-chip">
                                <span className="summary-chip__label">
                                    Kế hoạch
                                </span>
                                <span className="summary-chip__value">
                                    {formatCurrency(totalPlan, currency)}
                                </span>
                            </div>
                            <div className="summary-chip">
                                <span className="summary-chip__label">
                                    Đã chi
                                </span>
                                <span className="summary-chip__value summary-chip__value--spent">
                                    {formatCurrency(totalSpent, currency)}
                                </span>
                            </div>
                            <div className="summary-chip">
                                <span className="summary-chip__label">
                                    {overPlan ? "Vượt" : "Còn lại"}
                                </span>
                                <span
                                    className={`summary-chip__value${overPlan ? " summary-chip__value--over" : " summary-chip__value--remaining"}`}
                                >
                                    {formatCurrency(
                                        Math.abs(totalRemain),
                                        currency,
                                    )}
                                </span>
                            </div>
                        </div>
                    )
                )}

                {/* Plan List */}
                {loading ? (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "var(--space-3)",
                        }}
                    >
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="skeleton"
                                style={{
                                    height: 88,
                                    borderRadius: "var(--radius-lg)",
                                }}
                            />
                        ))}
                    </div>
                ) : !period ? (
                    <div className="plan-empty">
                        <div className="plan-empty__icon">📋</div>
                        <div className="plan-empty__title">
                            Chưa có kế hoạch
                        </div>
                        <div className="plan-empty__text">
                            Thiết lập kế hoạch chi tiêu để theo dõi chi tiêu
                            hàng tháng của bạn.
                        </div>
                        <button
                            className="plan-empty__btn"
                            onClick={() => navigate("/onboarding")}
                        >
                            Tạo kế hoạch
                        </button>
                    </div>
                ) : progress.length === 0 ? (
                    <div className="plan-empty">
                        <div className="plan-empty__icon">✅</div>
                        <div className="plan-empty__title">
                            Chưa có danh mục kế hoạch
                        </div>
                        <div className="plan-empty__text">
                            Thêm danh mục để bắt đầu theo dõi chi tiêu.
                        </div>
                        <button
                            className="plan-empty__btn"
                            onClick={() => navigate("/onboarding")}
                        >
                            Thêm danh mục
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="plan-list__title">
                            Chi tiết kế hoạch ({progress.length} danh mục)
                        </div>
                        <div className="plan-list">
                            {progress.map((item) => (
                                <PlanItem key={item.categoryId} item={item} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
};
