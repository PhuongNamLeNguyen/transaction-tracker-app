import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    transactionsApi,
    type TransactionType,
    type TxCategory,
} from "@/api/transactions.api";
import { Icon } from "@/components/common/Icon";
import "@/styles/add-transaction.css";

/* ─── Config ─── */
const TYPE_CONFIG: Record<
    TransactionType,
    { label: string; color: string; icon: string }
> = {
    income:     { label: "Thu nhập",  color: "var(--color-income)",     icon: "trending_up" },
    expense:    { label: "Chi tiêu",  color: "var(--color-expense)",    icon: "shopping_bag" },
    investment: { label: "Đầu tư",   color: "var(--color-investment)", icon: "candlestick_chart" },
    saving:     { label: "Tiết kiệm", color: "var(--color-saving)",     icon: "savings" },
};

function formatWithDots(digits: string): string {
    if (!digits) return "";
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ─── Page ─── */
export const AddTransactionPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const initType = (searchParams.get("type") as TransactionType) || "expense";

    const [type, setType]                     = useState<TransactionType>(initType);
    const [rawAmount, setRawAmount]           = useState("");
    const [date, setDate]                     = useState(todayIso);
    const [selectedCatId, setSelectedCatId]   = useState<string | null>(null);
    const [note, setNote]                     = useState("");
    const [categories, setCategories]         = useState<TxCategory[]>([]);
    const [catLoading, setCatLoading]         = useState(false);
    const [saving, setSaving]                 = useState(false);
    const [error, setError]                   = useState<string | null>(null);
    const [success, setSuccess]               = useState(false);

    /* Load categories whenever type changes */
    const loadCategories = useCallback(async (t: TransactionType) => {
        setCatLoading(true);
        setSelectedCatId(null);
        try {
            const cats = await transactionsApi.getCategories(t);
            setCategories(cats);
        } catch {
            setCategories([]);
        } finally {
            setCatLoading(false);
        }
    }, []);

    useEffect(() => { loadCategories(type); }, [type, loadCategories]);

    const parsedAmount = parseInt(rawAmount || "0", 10);
    const isValid = parsedAmount > 0 && selectedCatId !== null;
    const cfg = TYPE_CONFIG[type];

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!isValid || saving) return;

        setSaving(true);
        setError(null);
        try {
            await transactionsApi.create({
                type,
                amount: parsedAmount,
                transactionDate: date,
                categoryId: selectedCatId!,
                note: note.trim() || undefined,
            });
            setSuccess(true);
            setTimeout(() => navigate(-1), 700);
        } catch {
            setError("Không thể lưu giao dịch. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="atx-page">
            {/* ── Header ── */}
            <header className="atx-header">
                <button
                    className="atx-header__back"
                    onClick={() => navigate(-1)}
                    aria-label="Quay lại"
                    type="button"
                >
                    <Icon name="arrow_back" size={22} />
                </button>
                <h1 className="atx-header__title">Thêm giao dịch</h1>
                <div style={{ width: 40 }} />
            </header>

            <form onSubmit={handleSubmit} className="atx-body">
                {/* ── Type tabs ── */}
                <div className="atx-type-tabs">
                    {(Object.entries(TYPE_CONFIG) as [TransactionType, typeof cfg][]).map(
                        ([t, c]) => (
                            <button
                                key={t}
                                type="button"
                                className={`atx-type-tab${type === t ? " atx-type-tab--active" : ""}`}
                                style={type === t ? { color: c.color, borderColor: c.color } : undefined}
                                onClick={() => setType(t)}
                            >
                                <Icon name={c.icon} size={18} filled={type === t} />
                                <span>{c.label}</span>
                            </button>
                        )
                    )}
                </div>

                {/* ── Amount ── */}
                <div className="atx-amount-section">
                    <input
                        type="tel"
                        className="atx-amount-input"
                        value={formatWithDots(rawAmount)}
                        onChange={(e) => setRawAmount(e.target.value.replace(/\D/g, ""))}
                        placeholder="0"
                        inputMode="numeric"
                        autoFocus
                        style={{ caretColor: cfg.color }}
                    />
                    <span className="atx-amount-currency">VND</span>
                </div>

                {/* ── Date ── */}
                <div className="atx-field-row">
                    <Icon name="calendar_month" size={20} style={{ color: "var(--color-text-secondary)" }} />
                    <span className="atx-field-label">Ngày</span>
                    <input
                        type="date"
                        className="atx-date-input"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        max={todayIso()}
                        aria-label="Ngày giao dịch"
                    />
                </div>

                {/* ── Categories ── */}
                <div className="atx-cat-section">
                    <div className="atx-section-label">
                        Danh mục <span style={{ color: "var(--color-error)" }}>*</span>
                    </div>
                    {catLoading ? (
                        <div className="atx-cat-loading">
                            <Icon name="progress_activity" size={22} className="spin-icon" />
                        </div>
                    ) : (
                        <div className="atx-cat-grid">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    className={`atx-cat-chip${selectedCatId === cat.id ? " atx-cat-chip--active" : ""}`}
                                    style={
                                        selectedCatId === cat.id
                                            ? {
                                                  background: cfg.color + "22",
                                                  borderColor: cfg.color,
                                                  color: cfg.color,
                                              }
                                            : undefined
                                    }
                                    onClick={() =>
                                        setSelectedCatId((prev) =>
                                            prev === cat.id ? null : cat.id
                                        )
                                    }
                                >
                                    {cat.icon && (
                                        <Icon name={cat.icon} size={16} filled={selectedCatId === cat.id} />
                                    )}
                                    <span className="atx-cat-chip__name">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Note ── */}
                <div className="atx-field-row atx-field-row--top">
                    <Icon name="notes" size={20} style={{ color: "var(--color-text-secondary)", marginTop: 2 }} />
                    <textarea
                        className="atx-note-input"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Ghi chú (tùy chọn)"
                        rows={2}
                        maxLength={500}
                    />
                </div>

                {/* ── Error / Success ── */}
                {error && (
                    <div className="atx-error">
                        <Icon name="error_outline" size={16} />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="atx-success">
                        <Icon name="check_circle" size={16} />
                        Đã lưu thành công!
                    </div>
                )}

                {/* ── Submit ── */}
                <div className="atx-footer">
                    <button
                        type="submit"
                        className="atx-submit-btn"
                        disabled={!isValid || saving || success}
                        style={{ background: isValid && !success ? cfg.color : undefined }}
                    >
                        {saving ? (
                            <>
                                <Icon name="progress_activity" size={18} className="spin-icon" />
                                Đang lưu...
                            </>
                        ) : success ? (
                            <>
                                <Icon name="check_circle" size={18} />
                                Đã lưu!
                            </>
                        ) : (
                            "Lưu giao dịch"
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};
