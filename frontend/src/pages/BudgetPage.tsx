import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { budgetApi, type BudgetResponse, type BudgetProgressItem } from "@/api/budget.api";
import { BottomNav } from "@/components/common/BottomNav";
import { Icon } from "@/components/common/Icon";
import "@/styles/dashboard.css";
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
    if (pct >= 80)  return "warning";
    return "safe";
}

/* ─── Budget Item ─── */
function BudgetItem({ item }: { item: BudgetProgressItem }) {
    const state = barState(item.utilisationPct);
    const clampedPct = Math.min(item.utilisationPct, 100);
    const remaining = item.budgetAmount - item.actualAmount;

    return (
        <div className="budget-item">
            <div className="budget-item__top">
                <div className="budget-item__icon">{item.icon || "📦"}</div>
                <div className="budget-item__info">
                    <div className="budget-item__name">{item.name}</div>
                    <div className="budget-item__amounts">
                        {formatCurrency(item.actualAmount, item.currency)}
                        {" / "}
                        {formatCurrency(item.budgetAmount, item.currency)}
                    </div>
                </div>
                <div className={`budget-item__pct budget-item__pct--${state}`}>
                    {item.utilisationPct.toFixed(0)}%
                </div>
            </div>

            <div className="budget-bar">
                <div
                    className={`budget-bar__fill budget-bar__fill--${state}`}
                    style={{ width: `${clampedPct}%` }}
                />
            </div>

            {state === "exceeded" && (
                <div style={{
                    marginTop: "var(--space-2)",
                    fontSize: "var(--text-xs)",
                    color: "var(--color-budget-exceeded)",
                    fontWeight: "var(--weight-medium)",
                }}>
                    Vượt ngân sách {formatCurrency(Math.abs(remaining), item.currency)}
                </div>
            )}
            {state === "warning" && (
                <div style={{
                    marginTop: "var(--space-2)",
                    fontSize: "var(--text-xs)",
                    color: "var(--color-budget-warning)",
                    fontWeight: "var(--weight-medium)",
                }}>
                    Còn lại {formatCurrency(Math.max(0, remaining), item.currency)}
                </div>
            )}
        </div>
    );
}

/* ─── Main Page ─── */
export const BudgetPage = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<BudgetResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        budgetApi.getBudget()
            .then(setData)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const period   = data?.period;
    const summary  = data?.summary;
    const progress = data?.budgetProgress ?? [];
    const currency = summary?.currency ?? "VND";

    const totalBudget  = progress.reduce((s, i) => s + i.budgetAmount, 0);
    const totalSpent   = progress.reduce((s, i) => s + i.actualAmount, 0);
    const totalRemain  = totalBudget - totalSpent;
    const overBudget   = totalRemain < 0;

    return (
        <div className="budget-page">
            <div className="budget-page__header">
                <h1 className="budget-page__title">Kế hoạch chi tiêu</h1>
                {period && (
                    <button className="budget-page__edit-btn" onClick={() => navigate("/onboarding")}>
                        Chỉnh sửa
                    </button>
                )}
            </div>

            <div className="budget-page__body">
                {/* Period Card */}
                {loading ? (
                    <div className="skeleton" style={{ height: 72, borderRadius: "var(--radius-xl)" }} />
                ) : period ? (
                    <div className="period-card">
                        <div>
                            <div className="period-card__label">Chu kỳ hiện tại</div>
                            <div className="period-card__date">
                                {formatDateVN(period.startDate)} – {formatDateVN(period.endDate)}
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
                        {[1,2,3].map(i => (
                            <div key={i} className="skeleton" style={{ flex: 1, height: 64, borderRadius: "var(--radius-lg)" }} />
                        ))}
                    </div>
                ) : period && (
                    <div className="summary-grid">
                        <div className="summary-chip">
                            <span className="summary-chip__label">Ngân sách</span>
                            <span className="summary-chip__value">{formatCurrency(totalBudget, currency)}</span>
                        </div>
                        <div className="summary-chip">
                            <span className="summary-chip__label">Đã chi</span>
                            <span className="summary-chip__value summary-chip__value--spent">
                                {formatCurrency(totalSpent, currency)}
                            </span>
                        </div>
                        <div className="summary-chip">
                            <span className="summary-chip__label">{overBudget ? "Vượt" : "Còn lại"}</span>
                            <span className={`summary-chip__value${overBudget ? " summary-chip__value--over" : " summary-chip__value--remaining"}`}>
                                {formatCurrency(Math.abs(totalRemain), currency)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Budget List */}
                {loading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                        {[1,2,3,4].map(i => (
                            <div key={i} className="skeleton" style={{ height: 88, borderRadius: "var(--radius-lg)" }} />
                        ))}
                    </div>
                ) : !period ? (
                    <div className="budget-empty">
                        <div className="budget-empty__icon">📋</div>
                        <div className="budget-empty__title">Chưa có kế hoạch</div>
                        <div className="budget-empty__text">
                            Thiết lập kế hoạch chi tiêu để theo dõi ngân sách hàng tháng của bạn.
                        </div>
                        <button className="budget-empty__btn" onClick={() => navigate("/onboarding")}>
                            Tạo kế hoạch
                        </button>
                    </div>
                ) : progress.length === 0 ? (
                    <div className="budget-empty">
                        <div className="budget-empty__icon">✅</div>
                        <div className="budget-empty__title">Chưa có danh mục ngân sách</div>
                        <div className="budget-empty__text">Thêm danh mục để bắt đầu theo dõi chi tiêu.</div>
                        <button className="budget-empty__btn" onClick={() => navigate("/onboarding")}>
                            Thêm danh mục
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="budget-list__title">
                            Chi tiết ngân sách ({progress.length} danh mục)
                        </div>
                        <div className="budget-list">
                            {progress.map((item) => (
                                <BudgetItem key={item.categoryId} item={item} />
                            ))}
                        </div>
                    </div>
                )}

            </div>

            <BottomNav />
        </div>
    );
};
