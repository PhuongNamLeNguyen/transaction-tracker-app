import { useState, useEffect, useCallback, useMemo } from "react";
import {
    transactionsApi,
    type TxListItem,
    type TxDetail,
    type TxCategory,
    type TransactionType,
} from "@/api/transactions.api";
import { BottomNav } from "@/components/common/BottomNav";
import "@/styles/dashboard.css";
import "@/styles/transactions.css";

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */
const DOW = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTH_NAMES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

const TYPE_LABELS: Record<string, string> = {
    all:        "Tất cả",
    income:     "Thu nhập",
    expense:    "Chi tiêu",
    investment: "Đầu tư",
    saving:     "Tiết kiệm",
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: currency === "VND" ? "VND" : currency,
        maximumFractionDigits: currency === "VND" ? 0 : 2,
    }).format(amount);
}

function shortAmount(amount: number): string {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}tỷ`;
    if (amount >= 1_000_000)     return `${Math.round(amount / 1_000_000)}tr`;
    if (amount >= 1_000)         return `${Math.round(amount / 1_000)}k`;
    return String(amount);
}

function txSign(type: TransactionType): string {
    return type === "income" ? "+" : "-";
}

function formatTime(isoStr: string): string {
    const d = new Date(isoStr);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
}

function formatDateShort(dateStr: string): string {
    const [, mm, dd] = dateStr.split("-");
    return `${parseInt(dd)}/${parseInt(mm)}`;
}

function txCode(id: string): string {
    return id.replace(/-/g, "").slice(0, 10).toUpperCase();
}

function txLabel(tx: TxListItem | TxDetail): string {
    return (tx as TxListItem).merchantName || tx.note || "Giao dịch";
}

type TxTypeKey = TransactionType;

/* ─────────────────────────────────────────
   Calendar
───────────────────────────────────────── */
interface DailyTotals {
    income: number;
    expense: number;
}

function buildCalendar(year: number, month: number) {
    // month is 1-based
    const firstDay = new Date(year, month - 1, 1);
    const lastDay  = new Date(year, month, 0);

    // Day of week of first day (0=Sun → convert to Mon-based: Sun=6)
    const startDow = (firstDay.getDay() + 6) % 7; // Mon=0, Sun=6
    const daysInMonth = lastDay.getDate();

    const cells: Array<{ date: Date | null; isOutside: boolean; isWeekend: boolean }> = [];

    // Previous month padding
    for (let i = 0; i < startDow; i++) {
        const d = new Date(year, month - 1, -startDow + 1 + i);
        cells.push({ date: d, isOutside: true, isWeekend: d.getDay() === 0 || d.getDay() === 6 });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const dow = date.getDay();
        cells.push({ date, isOutside: false, isWeekend: dow === 0 || dow === 6 });
    }

    // Next month padding (fill to complete last row)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month, i);
        cells.push({ date: d, isOutside: true, isWeekend: d.getDay() === 0 || d.getDay() === 6 });
    }

    return cells;
}

function Calendar({
    year,
    month,
    transactions,
    selectedDate,
    onSelectDate,
}: {
    year: number;
    month: number;
    transactions: TxListItem[];
    selectedDate: string | null;
    onSelectDate: (date: string | null) => void;
}) {
    const today = new Date();
    const cells = useMemo(() => buildCalendar(year, month), [year, month]);

    // Build daily totals map: "YYYY-MM-DD" → { income, expense }
    const dailyMap = useMemo(() => {
        const map: Record<string, DailyTotals> = {};
        for (const tx of transactions) {
            const key = tx.transactionDate.slice(0, 10);
            if (!map[key]) map[key] = { income: 0, expense: 0 };
            if (tx.type === "income") map[key].income += tx.amount;
            else map[key].expense += tx.amount;
        }
        return map;
    }, [transactions]);

    return (
        <div className="calendar">
            <div className="calendar__header">
                {DOW.map((d, i) => (
                    <div key={d} className={`calendar__dow${i >= 5 ? " calendar__dow--weekend" : ""}`}>
                        {d}
                    </div>
                ))}
            </div>
            <div className="calendar__grid">
                {cells.map((cell, idx) => {
                    if (!cell.date) return <div key={idx} className="calendar__cell" />;
                    const key = `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, "0")}-${String(cell.date.getDate()).padStart(2, "0")}`;
                    const isToday =
                        cell.date.getDate() === today.getDate() &&
                        cell.date.getMonth() === today.getMonth() &&
                        cell.date.getFullYear() === today.getFullYear();
                    const isSelected = key === selectedDate;
                    const totals = dailyMap[key];

                    let cls = "calendar__cell";
                    if (cell.isOutside) cls += " calendar__cell--outside";
                    if (cell.isWeekend && !cell.isOutside) cls += " calendar__cell--weekend";
                    if (isToday && !cell.isOutside) cls += " calendar__cell--today";
                    if (isSelected && !cell.isOutside) cls += " calendar__cell--selected";

                    return (
                        <div
                            key={key + idx}
                            className={cls}
                            onClick={() => {
                                if (!cell.isOutside) {
                                    onSelectDate(isSelected ? null : key);
                                }
                            }}
                        >
                            <span className="calendar__day-num">{cell.date.getDate()}</span>
                            {totals && !cell.isOutside && (
                                <>
                                    {totals.income > 0 && (
                                        <span className="calendar__income">+{shortAmount(totals.income)}</span>
                                    )}
                                    {totals.expense > 0 && (
                                        <span className="calendar__expense">-{shortAmount(totals.expense)}</span>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────
   Transaction Detail Sheet
───────────────────────────────────────── */
function DetailSheet({
    tx,
    onClose,
}: {
    tx: TxDetail;
    onClose: () => void;
}) {
    const primaryCategory = tx.splits[0]?.categoryName ?? null;
    const timeStr = formatTime(tx.createdAt);
    const dateStr = formatDateShort(tx.transactionDate);

    return (
        <>
            <div className="detail-sheet-overlay" onClick={onClose} />
            <div className="detail-sheet">
                <div className="detail-sheet__topbar">
                    <button className="detail-sheet__close" onClick={onClose} aria-label="Đóng">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>
                    <span className="detail-sheet__title">Thông tin giao dịch</span>
                    <div style={{ width: 28 }} />
                </div>

                <div className="detail-sheet__body">
                    <div className="detail-row">
                        <span className="detail-row__label">Nội dung</span>
                        <span className="detail-row__value">{txLabel(tx)}</span>
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
   Dropdown Sheet (for Type / Category filters)
───────────────────────────────────────── */
function DropdownSheet<T extends string>({
    title,
    options,
    value,
    onSelect,
    onClose,
}: {
    title: string;
    options: Array<{ value: T; label: string; icon?: string }>;
    value: T;
    onSelect: (v: T) => void;
    onClose: () => void;
}) {
    return (
        <>
            <div className="dropdown-sheet-overlay" onClick={onClose} />
            <div className="dropdown-sheet">
                <div className="dropdown-sheet__handle" />
                <div className="dropdown-sheet__title">{title}</div>
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        className={`dropdown-option${opt.value === value ? " dropdown-option--active" : ""}`}
                        onClick={() => { onSelect(opt.value); onClose(); }}
                    >
                        {opt.icon && <span style={{ fontSize: 18 }}>{opt.icon}</span>}
                        {opt.label}
                        {opt.value === value && (
                            <svg className="dropdown-option__check" width="16" height="16" fill="none" viewBox="0 0 24 24">
                                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        )}
                    </button>
                ))}
            </div>
        </>
    );
}

/* (BottomNav moved to shared component) */

/* ─────────────────────────────────────────
   Main Page
───────────────────────────────────────── */
export const TransactionsPage = () => {
    const now = new Date();
    const [year,  setYear]  = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [selectedType, setSelectedType] = useState<string>("all");
    const [selectedCatId, setSelectedCatId] = useState<string>("all");
    const [showCal, setShowCal] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const [transactions, setTransactions] = useState<TxListItem[]>([]);
    const [categories,   setCategories]   = useState<TxCategory[]>([]);
    const [loading, setLoading] = useState(true);

    const [detailTx,  setDetailTx]  = useState<TxDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const [openDropdown, setOpenDropdown] = useState<"type" | "cat" | null>(null);

    /* ── Fetch transactions ── */
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await transactionsApi.list({
                year,
                month,
                type:        selectedType !== "all" ? selectedType : undefined,
                category_id: selectedCatId !== "all" ? selectedCatId : undefined,
            });
            setTransactions(list);
        } catch {
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    }, [year, month, selectedType, selectedCatId]);

    useEffect(() => { load(); }, [load]);

    /* ── Fetch categories when type changes ── */
    useEffect(() => {
        if (selectedType === "all") { setCategories([]); setSelectedCatId("all"); return; }
        transactionsApi.getCategories(selectedType as TxTypeKey).then((cats) => {
            setCategories(cats);
            setSelectedCatId("all");
        }).catch(() => setCategories([]));
    }, [selectedType]);

    /* ── Month navigation ── */
    function prevMonth() {
        if (month === 1) { setYear((y) => y - 1); setMonth(12); }
        else setMonth((m) => m - 1);
        setSelectedDate(null);
    }
    function nextMonth() {
        if (month === 12) { setYear((y) => y + 1); setMonth(1); }
        else setMonth((m) => m + 1);
        setSelectedDate(null);
    }

    /* ── Open detail ── */
    async function openDetail(id: string) {
        setDetailLoading(true);
        try {
            const tx = await transactionsApi.getById(id);
            setDetailTx(tx);
        } catch {
            /* ignore */
        } finally {
            setDetailLoading(false);
        }
    }

    /* ── Filtered / grouped transactions ── */
    const filtered = useMemo(() => {
        if (!selectedDate) return transactions;
        return transactions.filter((tx) => tx.transactionDate.slice(0, 10) === selectedDate);
    }, [transactions, selectedDate]);

    const grouped = useMemo(() => {
        const map = new Map<string, TxListItem[]>();
        for (const tx of filtered) {
            const key = tx.transactionDate.slice(0, 10);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(tx);
        }
        return map;
    }, [filtered]);

    /* ── Category options for dropdown ── */
    const catOptions = useMemo(() => [
        { value: "all", label: "Toàn bộ" },
        ...categories.map((c) => ({ value: c.id, label: c.name, icon: c.icon ?? undefined })),
    ], [categories]);

    const selectedCatLabel = catOptions.find((o) => o.value === selectedCatId)?.label ?? "Toàn bộ";

    return (
        <div className="txpage">
            {/* Sticky header */}
            <div className="txpage__sticky">
                <h1 className="txpage__title">Chi tiết giao dịch</h1>

                <div className="txpage__filters">
                    {/* Row 1: Year + Month */}
                    <div className="filter-row">
                        <div className="filter-pill" style={{ cursor: "default" }}>
                            Năm: {year}
                        </div>
                        <div className="month-nav">
                            <button className="month-nav__btn" onClick={prevMonth} aria-label="Tháng trước">
                                <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                            <span className="month-nav__label">Tháng: {MONTH_NAMES[month - 1]}</span>
                            <button className="month-nav__btn" onClick={nextMonth} aria-label="Tháng sau">
                                <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Row 2: Type + Category */}
                    <div className="filter-row">
                        <button className="filter-pill" onClick={() => setOpenDropdown("type")}>
                            Loại: {TYPE_LABELS[selectedType]}
                            <span className="filter-pill__chevron">▼</span>
                        </button>
                        <button
                            className="filter-pill"
                            onClick={() => selectedType !== "all" && setOpenDropdown("cat")}
                            style={{ opacity: selectedType === "all" ? 0.5 : 1 }}
                        >
                            Mục: {selectedCatLabel}
                            <span className="filter-pill__chevron">▼</span>
                        </button>
                    </div>
                </div>

                {/* Calendar toggle */}
                <button className="txpage__cal-toggle" onClick={() => setShowCal((v) => !v)}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {showCal ? "Ẩn lịch" : "Hiện lịch"}
                </button>
            </div>

            {/* Calendar */}
            {showCal && (
                <Calendar
                    year={year}
                    month={month}
                    transactions={transactions}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                />
            )}

            {/* Transaction list */}
            <div className="txpage__body">
                {loading ? (
                    [1, 2, 3, 4].map((i) => (
                        <div key={i} className="txcard txcard--skeleton">
                            <span className="skeleton" style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0 }} />
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                                <span className="skeleton" style={{ width: "55%", height: 14 }} />
                                <span className="skeleton" style={{ width: "35%", height: 12 }} />
                            </div>
                            <span className="skeleton" style={{ width: 70, height: 22 }} />
                        </div>
                    ))
                ) : filtered.length === 0 ? (
                    <div className="txpage__empty">
                        <div className="txpage__empty-icon">📭</div>
                        <div className="txpage__empty-title">Không có giao dịch</div>
                        <div className="txpage__empty-text">
                            {selectedDate
                                ? "Không có giao dịch nào vào ngày này."
                                : "Chưa có giao dịch nào trong tháng này."}
                        </div>
                    </div>
                ) : (
                    Array.from(grouped.entries()).map(([dateKey, txs]) => (
                        <div key={dateKey}>
                            <div className="txgroup__header">
                                Chi tiết ngày {formatDateShort(dateKey)}
                            </div>
                            {txs.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="txcard"
                                    onClick={() => openDetail(tx.id)}
                                >
                                    <div className="txcard__icon">
                                        {tx.type === "income"     && "💰"}
                                        {tx.type === "expense"    && "🛍️"}
                                        {tx.type === "investment" && "📈"}
                                        {tx.type === "saving"     && "🐖"}
                                    </div>
                                    <div className="txcard__body">
                                        <div className={`txcard__amount txcard__amount--${tx.type}`}>
                                            {txSign(tx.type)}{formatCurrency(tx.amount, tx.currency)}
                                        </div>
                                        <div className="txcard__desc">
                                            {txLabel(tx)}
                                        </div>
                                    </div>
                                    <div className="txcard__right">
                                        {tx.categoryName && (
                                            <span className="txcard__cat-pill">{tx.categoryName}</span>
                                        )}
                                        <span className="txcard__time">
                                            {formatTime(tx.createdAt)} – {formatDateShort(tx.transactionDate)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>

            {/* Bottom nav */}
            <BottomNav />

            {/* Transaction detail sheet */}
            {detailLoading && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: "var(--z-overlay)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)", color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
                        Đang tải...
                    </div>
                </div>
            )}
            {detailTx && !detailLoading && (
                <DetailSheet tx={detailTx} onClose={() => setDetailTx(null)} />
            )}

            {/* Type dropdown */}
            {openDropdown === "type" && (
                <DropdownSheet
                    title="Chọn loại giao dịch"
                    options={TYPE_OPTIONS}
                    value={selectedType}
                    onSelect={(v) => setSelectedType(v)}
                    onClose={() => setOpenDropdown(null)}
                />
            )}

            {/* Category dropdown */}
            {openDropdown === "cat" && (
                <DropdownSheet
                    title="Chọn danh mục"
                    options={catOptions}
                    value={selectedCatId}
                    onSelect={(v) => setSelectedCatId(v)}
                    onClose={() => setOpenDropdown(null)}
                />
            )}
        </div>
    );
};
