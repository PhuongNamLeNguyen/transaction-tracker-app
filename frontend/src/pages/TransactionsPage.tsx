import { useState, useEffect, useCallback, useMemo } from "react";
import {
    transactionsApi,
    type TxListItem,
    type TxDetail,
    type TxCategory,
    type TransactionType,
} from "@/api/transactions.api";
import { settingsApi } from "@/api/settings.api";
import { BottomNav } from "@/components/common/BottomNav";
import { Icon } from "@/components/common/Icon";
import "@/styles/dashboard.css";
import "@/styles/transactions.css";

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */
const DOW = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTH_NAMES = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
];

const TYPE_LABELS: Record<string, string> = {
    all: "Tất cả",
    income: "Thu nhập",
    expense: "Chi tiêu",
    investment: "Đầu tư",
    saving: "Tiết kiệm",
};

const TYPE_COLORS: Record<TransactionType, string> = {
    income: "var(--color-income)",
    expense: "var(--color-expense)",
    investment: "var(--color-investment)",
    saving: "var(--color-saving)",
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([v, l]) => ({
    value: v,
    label: l,
}));

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
    { value: "all", label: "Toàn bộ" },
    ...Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 4 + i).map((y) => ({
        value: String(y),
        label: String(y),
    })),
];

const MONTH_OPTIONS = [
    { value: "all", label: "Cả năm" },
    ...MONTH_NAMES.map((m, i) => ({
        value: String(i + 1),
        label: `Tháng ${m}`,
    })),
];

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
    if (amount >= 1_000_000_000)
        return `${(amount / 1_000_000_000).toFixed(1)}tỷ`;
    if (amount >= 1_000_000) return `${Math.round(amount / 1_000_000)}tr`;
    if (amount >= 1_000) return `${Math.round(amount / 1_000)}k`;
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
    const [, mm, dd] = dateStr.slice(0, 10).split("-");
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
    const lastDay = new Date(year, month, 0);

    // Day of week of first day (0=Sun → convert to Mon-based: Sun=6)
    const startDow = (firstDay.getDay() + 6) % 7; // Mon=0, Sun=6
    const daysInMonth = lastDay.getDate();

    const cells: Array<{
        date: Date | null;
        isOutside: boolean;
        isWeekend: boolean;
    }> = [];

    // Previous month padding
    for (let i = 0; i < startDow; i++) {
        const d = new Date(year, month - 1, -startDow + 1 + i);
        cells.push({
            date: d,
            isOutside: true,
            isWeekend: d.getDay() === 0 || d.getDay() === 6,
        });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const dow = date.getDay();
        cells.push({
            date,
            isOutside: false,
            isWeekend: dow === 0 || dow === 6,
        });
    }

    // Next month padding (fill to complete last row)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month, i);
        cells.push({
            date: d,
            isOutside: true,
            isWeekend: d.getDay() === 0 || d.getDay() === 6,
        });
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
                    <div
                        key={d}
                        className={`calendar__dow${i >= 5 ? " calendar__dow--weekend" : ""}`}
                    >
                        {d}
                    </div>
                ))}
            </div>
            <div className="calendar__grid">
                {cells.map((cell, idx) => {
                    if (!cell.date)
                        return <div key={idx} className="calendar__cell" />;
                    const key = `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, "0")}-${String(cell.date.getDate()).padStart(2, "0")}`;
                    const isToday =
                        cell.date.getDate() === today.getDate() &&
                        cell.date.getMonth() === today.getMonth() &&
                        cell.date.getFullYear() === today.getFullYear();
                    const isSelected = key === selectedDate;
                    const totals = dailyMap[key];

                    let cls = "calendar__cell";
                    if (cell.isOutside) cls += " calendar__cell--outside";
                    if (cell.isWeekend && !cell.isOutside)
                        cls += " calendar__cell--weekend";
                    if (isToday && !cell.isOutside && (!selectedDate || isSelected))
                        cls += " calendar__cell--today";
                    if (isSelected && !cell.isOutside)
                        cls += " calendar__cell--selected";

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
                            <span className="calendar__day-num">
                                {cell.date.getDate()}
                            </span>
                            {totals && !cell.isOutside && (
                                <>
                                    {totals.income > 0 && (
                                        <span className="calendar__income">
                                            +{shortAmount(totals.income)}
                                        </span>
                                    )}
                                    {totals.expense > 0 && (
                                        <span className="calendar__expense">
                                            -{shortAmount(totals.expense)}
                                        </span>
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
type EditingField = "date" | "note" | "merchant" | null;

function DetailSheet({
    tx,
    onClose,
    onDelete,
    onUpdate,
    displayCurrency,
}: {
    tx: TxDetail;
    onClose: () => void;
    onDelete: (id: string) => void;
    onUpdate: (id: string) => void;
    displayCurrency: string;
}) {
    const splits = tx.splits;
    const timeStr = formatTime(tx.createdAt);
    const dateStr = formatDateShort(tx.transactionDate);
    const typeColor = TYPE_COLORS[tx.type];
    const categoryLabel = splits.map((s) => s.categoryName).join(", ");

    const [editingField, setEditingField] = useState<EditingField>(null);
    const [tempDate, setTempDate] = useState(tx.transactionDate.slice(0, 10));
    const [tempNote, setTempNote] = useState(tx.note ?? "");
    const [tempMerchant, setTempMerchant] = useState(tx.merchantName ?? "");
    const [saving, setSaving] = useState(false);

    async function handleSave(field: EditingField) {
        if (!field || saving) return;
        setSaving(true);
        try {
            const dto =
                field === "date"
                    ? { transactionDate: tempDate }
                    : field === "note"
                      ? { note: tempNote || null }
                      : { merchantName: tempMerchant || null };
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
                    <span className="detail-sheet__title">
                        Thông tin giao dịch
                    </span>
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
                                <span className="detail-row__label">
                                    Danh mục
                                </span>
                                <span
                                    className="detail-pill"
                                    style={{
                                        color: "var(--color-text-secondary)",
                                    }}
                                >
                                    {categoryLabel}
                                </span>
                            </div>
                        )}

                        {/* ── Số tiền ── */}
                        <div className="detail-row detail-row--center">
                            <span className="detail-row__label">Số tiền</span>
                            <span className="detail-row__value detail-row__value--amount">
                                {formatCurrency(tx.amount, displayCurrency)}
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
                                        onChange={(e) =>
                                            setTempDate(e.target.value)
                                        }
                                        max={new Date()
                                            .toISOString()
                                            .slice(0, 10)}
                                        autoFocus
                                    />
                                    <button
                                        className="detail-row__save-btn"
                                        onClick={() => handleSave("date")}
                                        disabled={saving}
                                        type="button"
                                    >
                                        <Icon name="check" size={16} />
                                    </button>
                                    <button
                                        className="detail-row__cancel-btn"
                                        onClick={handleCancel}
                                        type="button"
                                    >
                                        <Icon name="close" size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="detail-row__value-row">
                                    <span className="detail-row__value">
                                        {timeStr} – {dateStr}
                                    </span>
                                    <button
                                        className="detail-row__edit-btn"
                                        onClick={() => setEditingField("date")}
                                        type="button"
                                        aria-label="Chỉnh sửa ngày giờ"
                                    >
                                        <Icon
                                            name="edit"
                                            size={14}
                                            className="detail-row__edit-icon"
                                        />
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
                                        onChange={(e) =>
                                            setTempNote(e.target.value)
                                        }
                                        maxLength={500}
                                        placeholder="Nhập nội dung..."
                                        autoFocus
                                    />
                                    <button
                                        className="detail-row__save-btn"
                                        onClick={() => handleSave("note")}
                                        disabled={saving}
                                        type="button"
                                    >
                                        <Icon name="check" size={16} />
                                    </button>
                                    <button
                                        className="detail-row__cancel-btn"
                                        onClick={handleCancel}
                                        type="button"
                                    >
                                        <Icon name="close" size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="detail-row__value-row">
                                    <span className="detail-row__value">
                                        {tx.note ?? "—"}
                                    </span>
                                    <button
                                        className="detail-row__edit-btn"
                                        onClick={() => setEditingField("note")}
                                        type="button"
                                        aria-label="Chỉnh sửa nội dung"
                                    >
                                        <Icon
                                            name="edit"
                                            size={14}
                                            className="detail-row__edit-icon"
                                        />
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
                                        onChange={(e) =>
                                            setTempMerchant(e.target.value)
                                        }
                                        maxLength={200}
                                        placeholder="Nhập tên cửa hàng..."
                                        autoFocus
                                    />
                                    <button
                                        className="detail-row__save-btn"
                                        onClick={() => handleSave("merchant")}
                                        disabled={saving}
                                        type="button"
                                    >
                                        <Icon name="check" size={16} />
                                    </button>
                                    <button
                                        className="detail-row__cancel-btn"
                                        onClick={handleCancel}
                                        type="button"
                                    >
                                        <Icon name="close" size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="detail-row__value-row">
                                    <span className="detail-row__value">
                                        {tx.merchantName ?? "—"}
                                    </span>
                                    <button
                                        className="detail-row__edit-btn"
                                        onClick={() =>
                                            setEditingField("merchant")
                                        }
                                        type="button"
                                        aria-label="Chỉnh sửa cửa hàng"
                                    >
                                        <Icon
                                            name="edit"
                                            size={14}
                                            className="detail-row__edit-icon"
                                        />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ── Mã giao dịch ── */}
                        <div className="detail-row">
                            <span className="detail-row__label">
                                Mã giao dịch
                            </span>
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
   Inline Dropdown (positioned below anchor button)
───────────────────────────────────────── */
function DropdownSheet<T extends string>({
    options,
    value,
    onSelect,
    onClose,
    anchorRect,
}: {
    options: Array<{ value: T; label: string; icon?: string }>;
    value: T;
    onSelect: (v: T) => void;
    onClose: () => void;
    anchorRect: DOMRect;
}) {
    const left = Math.min(
        anchorRect.left,
        window.innerWidth - Math.max(anchorRect.width, 160) - 8,
    );
    const style: React.CSSProperties = {
        top: anchorRect.bottom + 6,
        left: Math.max(8, left),
        minWidth: Math.max(anchorRect.width, 160),
    };

    return (
        <>
            <div className="dropdown-overlay" onClick={onClose} />
            <div className="dropdown-menu" style={style}>
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        className={`dropdown-option${opt.value === value ? " dropdown-option--active" : ""}`}
                        onClick={() => {
                            onSelect(opt.value);
                            onClose();
                        }}
                    >
                        {opt.icon && <Icon name={opt.icon} size={18} />}
                        <span className="dropdown-option__label">
                            {opt.label}
                        </span>
                        {opt.value === value && (
                            <Icon
                                name="check"
                                size={16}
                                className="dropdown-option__check"
                            />
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
    const [year, setYear] = useState<number | null>(now.getFullYear());
    const [month, setMonth] = useState<number | null>(now.getMonth() + 1);
    const [selectedType, setSelectedType] = useState<string>("all");
    const [selectedCatId, setSelectedCatId] = useState<string>("all");
    const [showCal, setShowCal] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const [displayCurrency, setDisplayCurrency] = useState("VND");
    const [transactions, setTransactions] = useState<TxListItem[]>([]);
    const [categories, setCategories] = useState<TxCategory[]>([]);
    const [loading, setLoading] = useState(true);

    const [detailTx, setDetailTx] = useState<TxDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [showDeletedToast, setShowDeletedToast] = useState(false);

    const [openDropdown, setOpenDropdown] = useState<
        "year" | "month" | "type" | "cat" | null
    >(null);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

    function openAt(
        key: "year" | "month" | "type" | "cat",
        e: React.MouseEvent<HTMLButtonElement>,
    ) {
        setAnchorRect(e.currentTarget.getBoundingClientRect());
        setOpenDropdown(key);
    }
    function closeDropdown() {
        setOpenDropdown(null);
        setAnchorRect(null);
    }

    /* ── Clear selectedDate when no specific month is active ── */
    useEffect(() => {
        if (year == null || month == null) setSelectedDate(null);
    }, [year, month]);

    /* ── Fetch display currency from settings ── */
    useEffect(() => {
        settingsApi
            .getSettings()
            .then((s) => {
                if (s.preferences?.targetCurrency)
                    setDisplayCurrency(s.preferences.targetCurrency);
            })
            .catch(() => {});
    }, []);

    /* ── Fetch transactions ── */
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await transactionsApi.list({
                year: year ?? undefined,
                month: year != null && month != null ? month : undefined,
                type: selectedType !== "all" ? selectedType : undefined,
                category_id:
                    selectedCatId !== "all" ? selectedCatId : undefined,
            });
            setTransactions(list);
        } catch {
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    }, [year, month, selectedType, selectedCatId]);

    useEffect(() => {
        load();
    }, [load]);

    /* ── Fetch categories when type changes ── */
    useEffect(() => {
        if (selectedType === "all") {
            setCategories([]);
            setSelectedCatId("all");
            return;
        }
        transactionsApi
            .getCategories(selectedType as TxTypeKey)
            .then((cats) => {
                setCategories(cats);
                setSelectedCatId("all");
            })
            .catch(() => setCategories([]));
    }, [selectedType]);

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

    /* ── Update transaction (refresh detail + list) ── */
    async function handleUpdateTx(id: string) {
        try {
            const [updatedDetail, updatedList] = await Promise.all([
                transactionsApi.getById(id),
                transactionsApi.list({
                    year: year ?? undefined,
                    month: month === null ? undefined : month,
                    type: selectedType === "all" ? undefined : selectedType,
                }),
            ]);
            setDetailTx(updatedDetail);
            setTransactions(updatedList);
        } catch {
            /* ignore */
        }
    }

    /* ── Delete transaction ── */
    async function handleDeleteTx(id: string) {
        const snapshot = transactions.find((tx) => tx.id === id) ?? null;
        setTransactions((prev) => prev.filter((tx) => tx.id !== id));
        setDetailTx(null);
        try {
            await transactionsApi.deleteTransaction(id);
            setShowDeletedToast(true);
            setTimeout(() => setShowDeletedToast(false), 3000);
        } catch {
            if (snapshot) setTransactions((prev) => [snapshot, ...prev]);
        }
    }

    /* ── Filtered / grouped transactions ── */
    const filtered = useMemo(() => {
        if (!selectedDate) return transactions;
        return transactions.filter(
            (tx) => tx.transactionDate.slice(0, 10) === selectedDate,
        );
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
    const catOptions = useMemo(
        () => [
            { value: "all", label: "Toàn bộ" },
            ...categories.map((c) => ({
                value: c.id,
                label: c.name,
                icon: c.icon ?? undefined,
            })),
        ],
        [categories],
    );

    const selectedCatLabel =
        catOptions.find((o) => o.value === selectedCatId)?.label ?? "Toàn bộ";

    return (
        <div className="txpage">
            {/* Sticky header */}
            <div className="txpage__sticky">
                <h1 className="txpage__title">Chi tiết giao dịch</h1>

                <div className="txpage__filters">
                    {/* Row 1: Year + Month */}
                    <div className="filter-row">
                        <button
                            className={`filter-pill${openDropdown === "year" ? " filter-pill--open" : ""}`}
                            onClick={(e) => openAt("year", e)}
                        >
                            Năm: {year ?? "Toàn bộ"}
                            <span className="filter-pill__chevron">
                                <Icon name="expand_more" size={16} />
                            </span>
                        </button>
                        <button
                            className={`filter-pill${openDropdown === "month" ? " filter-pill--open" : ""}`}
                            onClick={(e) => {
                                if (year != null) openAt("month", e);
                            }}
                            style={{ opacity: year == null ? 0.5 : 1 }}
                        >
                            {year == null
                                ? "Tháng: Toàn bộ"
                                : month == null
                                  ? "Tháng: Cả năm"
                                  : `Tháng: ${MONTH_NAMES[month - 1]}`}
                            <span className="filter-pill__chevron">
                                <Icon name="expand_more" size={16} />
                            </span>
                        </button>
                    </div>

                    {/* Row 2: Type + Category */}
                    <div className="filter-row">
                        <button
                            className={`filter-pill${openDropdown === "type" ? " filter-pill--open" : ""}`}
                            onClick={(e) => openAt("type", e)}
                        >
                            Loại: {TYPE_LABELS[selectedType]}
                            <span className="filter-pill__chevron">
                                <Icon name="expand_more" size={16} />
                            </span>
                        </button>
                        <button
                            className={`filter-pill${openDropdown === "cat" ? " filter-pill--open" : ""}`}
                            onClick={(e) => {
                                if (selectedType !== "all") openAt("cat", e);
                            }}
                            style={{
                                opacity: selectedType === "all" ? 0.5 : 1,
                            }}
                        >
                            Mục: {selectedCatLabel}
                            <span className="filter-pill__chevron">
                                <Icon name="expand_more" size={16} />
                            </span>
                        </button>
                    </div>
                </div>

                {/* Calendar toggle */}
                <button
                    className="txpage__cal-toggle"
                    onClick={() => setShowCal((v) => !v)}
                >
                    <Icon name="calendar_month" size={18} />
                    {showCal ? "Ẩn lịch" : "Hiện lịch"}
                </button>
            </div>

            {/* Calendar — only when a specific year+month is selected */}
            {showCal && year != null && month != null && (
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
                            <span
                                className="skeleton"
                                style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 12,
                                    flexShrink: 0,
                                }}
                            />
                            <div
                                style={{
                                    flex: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 6,
                                }}
                            >
                                <span
                                    className="skeleton"
                                    style={{ width: "55%", height: 14 }}
                                />
                                <span
                                    className="skeleton"
                                    style={{ width: "35%", height: 12 }}
                                />
                            </div>
                            <span
                                className="skeleton"
                                style={{ width: 70, height: 22 }}
                            />
                        </div>
                    ))
                ) : filtered.length === 0 ? (
                    <div className="txpage__empty">
                        <div className="txpage__empty-icon">📭</div>
                        <div className="txpage__empty-title">
                            Không có giao dịch
                        </div>
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
                                        <Icon
                                            name={
                                                tx.categoryIcon ??
                                                (tx.type === "income"
                                                    ? "trending_up"
                                                    : tx.type === "expense"
                                                      ? "shopping_bag"
                                                      : tx.type === "investment"
                                                        ? "candlestick_chart"
                                                        : "savings")
                                            }
                                            size={20}
                                        />
                                    </div>
                                    <div className="txcard__body">
                                        <div
                                            className={`txcard__amount txcard__amount--${tx.type}`}
                                        >
                                            {txSign(tx.type)}
                                            {formatCurrency(
                                                tx.amount,
                                                tx.currency,
                                            )}
                                        </div>
                                        <div className="txcard__desc">
                                            {txLabel(tx)}
                                        </div>
                                    </div>
                                    <div className="txcard__right">
                                        {tx.categoryName && (
                                            <span className="txcard__cat-pill">
                                                {tx.categoryName}
                                            </span>
                                        )}
                                        <span className="txcard__time">
                                            {formatTime(tx.createdAt)} –{" "}
                                            {formatDateShort(
                                                tx.transactionDate,
                                            )}
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
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.2)",
                        zIndex: "var(--z-overlay)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <div
                        style={{
                            background: "var(--color-surface)",
                            borderRadius: "var(--radius-lg)",
                            padding: "var(--space-6)",
                            color: "var(--color-text-secondary)",
                            fontSize: "var(--text-sm)",
                        }}
                    >
                        Đang tải...
                    </div>
                </div>
            )}
            {detailTx && !detailLoading && (
                <DetailSheet
                    tx={detailTx}
                    onClose={() => setDetailTx(null)}
                    onDelete={handleDeleteTx}
                    onUpdate={handleUpdateTx}
                    displayCurrency={displayCurrency}
                />
            )}

            {/* Deleted toast */}
            {showDeletedToast && (
                <div className="undo-toast">Giao dịch đã được xóa</div>
            )}

            {openDropdown && anchorRect && (
                <>
                    {openDropdown === "year" && (
                        <DropdownSheet
                            options={YEAR_OPTIONS}
                            value={year == null ? "all" : String(year)}
                            onSelect={(v) => {
                                const newYear =
                                    v === "all" ? null : parseInt(v);
                                setYear(newYear);
                                if (newYear == null) setMonth(null);
                                setSelectedDate(null);
                            }}
                            onClose={closeDropdown}
                            anchorRect={anchorRect}
                        />
                    )}
                    {openDropdown === "month" && (
                        <DropdownSheet
                            options={MONTH_OPTIONS}
                            value={month == null ? "all" : String(month)}
                            onSelect={(v) => {
                                setMonth(v === "all" ? null : parseInt(v));
                                setSelectedDate(null);
                            }}
                            onClose={closeDropdown}
                            anchorRect={anchorRect}
                        />
                    )}
                    {openDropdown === "type" && (
                        <DropdownSheet
                            options={TYPE_OPTIONS}
                            value={selectedType}
                            onSelect={(v) => setSelectedType(v)}
                            onClose={closeDropdown}
                            anchorRect={anchorRect}
                        />
                    )}
                    {openDropdown === "cat" && (
                        <DropdownSheet
                            options={catOptions}
                            value={selectedCatId}
                            onSelect={(v) => setSelectedCatId(v)}
                            onClose={closeDropdown}
                            anchorRect={anchorRect}
                        />
                    )}
                </>
            )}
        </div>
    );
};
