import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    transactionsApi,
    type TransactionType,
    type TxCategory,
} from "@/api/transactions.api";
import { settingsApi } from "@/api/settings.api";
import { exchangeApi } from "@/api/exchange.api";
import { Icon } from "@/components/common/Icon";
import "@/styles/add-transaction.css";
import "@/styles/transactions.css";

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

/* ─── Date picker helpers ─── */
const VIET_MONTHS = [
    "Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
    "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12",
];
const DAY_LABELS = ["H","B","T","N","S","B","C"]; // Mon → Sun

function isoToDisplay(iso: string): string {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
}

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

/** Returns 0=Mon … 6=Sun offset for the 1st of the month */
function getFirstWeekday(year: number, month: number): number {
    const day = new Date(year, month - 1, 1).getDay(); // 0=Sun
    return day === 0 ? 6 : day - 1;
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
    const [accountCurrency, setAccountCurrency] = useState("VND");
    const [toVndRate, setToVndRate]           = useState(1); // rate: 1 unit of displayCurrency → VND
    const [catOpen, setCatOpen]               = useState(false);
    const [catAnchorRect, setCatAnchorRect]   = useState<DOMRect | null>(null);
    const catFieldRef                         = useRef<HTMLDivElement>(null);
    const [dateOpen, setDateOpen]             = useState(false);
    const [calYear, setCalYear]               = useState(() => new Date().getFullYear());
    const [calMonth, setCalMonth]             = useState(() => new Date().getMonth() + 1);

    useEffect(() => {
        settingsApi.getSettings().then(async (s) => {
            const cur = s.preferences?.targetCurrency ?? s.account?.currency ?? "VND";
            setAccountCurrency(cur);
            if (cur !== "VND") {
                const rate = await exchangeApi.getRate(cur, "VND").catch(() => null);
                setToVndRate(rate ?? 1);
            }
        }).catch(() => {});
    }, []);

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
    const currencyLabel = accountCurrency === "VND" ? "đ" : accountCurrency;

    /* ─── Calendar helpers ─── */
    const todayStr = todayIso();
    const nowDate  = new Date();
    const isNextMonthDisabled =
        calYear > nowDate.getFullYear() ||
        (calYear === nowDate.getFullYear() && calMonth >= nowDate.getMonth() + 1);

    function openCalendar() {
        const parts = date.split("-").map(Number);
        setCalYear(parts[0] || nowDate.getFullYear());
        setCalMonth(parts[1] || nowDate.getMonth() + 1);
        setDateOpen(true);
    }

    function prevMonth() {
        if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); }
        else setCalMonth(m => m - 1);
    }

    function nextMonth() {
        if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); }
        else setCalMonth(m => m + 1);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!isValid || saving) return;

        setSaving(true);
        setError(null);
        try {
            // Convert from display currency to VND before storing
            const amountInVnd = Math.round(parsedAmount * toVndRate);
            await transactionsApi.create({
                type,
                amount: amountInVnd,
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
                                className={`atx-type-tab atx-type-tab--${t}${type === t ? " atx-type-tab--active" : ""}`}
                                onClick={() => setType(t)}
                            >
                                <span className={`atx-type-tab__icon atx-type-tab__icon--${t}`}>
                                    <Icon name={c.icon} size={18} filled={type === t} />
                                </span>
                                <span>{c.label}</span>
                            </button>
                        )
                    )}
                </div>

                {/* ── Amount ── */}
                <div className="atx-field-group">
                    <label className="atx-label" htmlFor="atx-amount">
                        Số tiền ({currencyLabel}) <span className="atx-req">*</span>
                    </label>
                    <div className="atx-field-row">
                        <input
                            id="atx-amount"
                            type="tel"
                            className="atx-amount-input"
                            value={formatWithDots(rawAmount)}
                            onChange={(e) => setRawAmount(e.target.value.replace(/\D/g, ""))}
                            placeholder="50.000"
                            inputMode="numeric"
                            autoFocus
                            style={{ caretColor: cfg.color }}
                        />
                    </div>
                </div>

                {/* ── Date ── */}
                <div className="atx-field-group">
                    <label className="atx-label">Ngày giao dịch</label>
                    <button
                        type="button"
                        className={`atx-field-row atx-date-trigger${dateOpen ? " atx-date-trigger--open" : ""}`}
                        onClick={dateOpen ? () => setDateOpen(false) : openCalendar}
                    >
                        <Icon name="calendar_month" size={20} style={{ color: "var(--color-text-secondary)" }} />
                        <span className="atx-date-display">
                            {date ? isoToDisplay(date) : <span className="atx-cat-trigger__placeholder">Chọn ngày</span>}
                        </span>
                        <Icon
                            name="expand_more"
                            size={16}
                            style={{ color: "var(--color-text-secondary)", flexShrink: 0,
                                     transform: dateOpen ? "rotate(180deg)" : "none",
                                     transition: "transform var(--duration-fast) var(--ease-standard)" }}
                        />
                    </button>

                    {dateOpen && (
                        <div className="atx-cal">
                            {/* Month navigation */}
                            <div className="atx-cal__header">
                                <button type="button" className="atx-cal__nav" onClick={prevMonth}>
                                    <Icon name="chevron_left" size={20} />
                                </button>
                                <span className="atx-cal__title">
                                    {VIET_MONTHS[calMonth - 1]} {calYear}
                                </span>
                                <button
                                    type="button"
                                    className="atx-cal__nav"
                                    onClick={nextMonth}
                                    disabled={isNextMonthDisabled}
                                >
                                    <Icon name="chevron_right" size={20} />
                                </button>
                            </div>

                            {/* Day-of-week labels */}
                            <div className="atx-cal__days-header">
                                {DAY_LABELS.map((d, i) => (
                                    <span key={i} className="atx-cal__day-label">{d}</span>
                                ))}
                            </div>

                            {/* Day grid */}
                            <div className="atx-cal__grid">
                                {Array.from({ length: getFirstWeekday(calYear, calMonth) }).map((_, i) => (
                                    <span key={`e${i}`} />
                                ))}
                                {Array.from({ length: getDaysInMonth(calYear, calMonth) }, (_, i) => i + 1).map((day) => {
                                    const iso = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                    const isSelected = iso === date;
                                    const isToday    = iso === todayStr;
                                    const isFuture   = iso > todayStr;
                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            disabled={isFuture}
                                            className={`atx-cal__day${isSelected ? " atx-cal__day--selected" : isToday ? " atx-cal__day--today" : ""}`}
                                            onClick={() => { setDate(iso); setDateOpen(false); }}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Footer actions */}
                            <div className="atx-cal__footer">
                                <button
                                    type="button"
                                    className="atx-cal__action"
                                    onClick={() => { setDate(todayStr); setDateOpen(false); }}
                                >
                                    Hôm nay
                                </button>
                                <button
                                    type="button"
                                    className="atx-cal__action atx-cal__action--close"
                                    onClick={() => setDateOpen(false)}
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Category ── */}
                <div className="atx-field-group">
                    <label className="atx-label" htmlFor="atx-cat">
                        Danh mục <span className="atx-req">*</span>
                    </label>
                    <div className="atx-field-row" ref={catFieldRef}>
                        <Icon name="category" size={20} style={{ color: "var(--color-text-secondary)" }} />
                        {catLoading ? (
                            <span className="atx-select-loading">
                                <Icon name="progress_activity" size={16} className="spin-icon" />
                                Đang tải...
                            </span>
                        ) : (
                            <button
                                id="atx-cat"
                                type="button"
                                className="atx-cat-trigger"
                                onClick={() => {
                                    const rect = catFieldRef.current?.getBoundingClientRect();
                                    if (rect) setCatAnchorRect(rect);
                                    setCatOpen(true);
                                }}
                            >
                                {selectedCatId ? (
                                    <span>{categories.find((c) => c.id === selectedCatId)?.name ?? "Chọn danh mục"}</span>
                                ) : (
                                    <span className="atx-cat-trigger__placeholder">Chọn danh mục</span>
                                )}
                                <Icon name="expand_more" size={16} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Note ── */}
                <div className="atx-field-group">
                    <label className="atx-label" htmlFor="atx-note">Ghi chú</label>
                    <div className="atx-field-row">
                        <Icon name="notes" size={20} style={{ color: "var(--color-text-secondary)" }} />
                        <input
                            id="atx-note"
                            type="text"
                            className="atx-note-input"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Ăn trưa"
                            maxLength={500}
                        />
                    </div>
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

            {/* Category dropdown */}
            {catOpen && catAnchorRect && (
                <>
                    <div className="dropdown-overlay" onClick={() => setCatOpen(false)} />
                    <div
                        className="dropdown-menu"
                        style={{
                            top: catAnchorRect.bottom + 4,
                            left: catAnchorRect.left,
                            width: catAnchorRect.width,
                        }}
                    >
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                className={`dropdown-option${selectedCatId === cat.id ? " dropdown-option--active" : ""}`}
                                onClick={() => {
                                    setSelectedCatId(cat.id);
                                    setCatOpen(false);
                                }}
                            >
                                {cat.icon && <Icon name={cat.icon} size={18} />}
                                <span className="dropdown-option__label">{cat.name}</span>
                                {selectedCatId === cat.id && (
                                    <Icon name="check" size={16} className="dropdown-option__check" />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
