import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { transactionsApi, type DeletedSplitItem } from "@/api/transactions.api";
import { Icon } from "@/components/common/Icon";
import "@/styles/deleted-transactions.css";

/* ─── Helpers ─── */
function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: currency === "VND" ? "VND" : currency,
        maximumFractionDigits: currency === "VND" ? 0 : 2,
    }).format(amount);
}

function formatDate(isoStr: string): string {
    const [, mm, dd] = isoStr.slice(0, 10).split("-");
    return `${parseInt(dd)}/${parseInt(mm)}`;
}

function formatDeletedAt(isoStr: string): string {
    const d = new Date(isoStr);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
}

const TYPE_COLORS: Record<string, string> = {
    income:     "var(--color-income)",
    expense:    "var(--color-expense)",
    investment: "var(--color-investment)",
    saving:     "var(--color-saving)",
};

/* ─── Confirm dialog ─── */
function ConfirmDialog({
    count,
    onConfirm,
    onCancel,
}: { count: number; onConfirm: () => void; onCancel: () => void }) {
    return (
        <div className="dlt-confirm-overlay" onClick={onCancel}>
            <div className="dlt-confirm-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="dlt-confirm-dialog__title">Xoá vĩnh viễn?</div>
                <div className="dlt-confirm-dialog__text">
                    {count === 1
                        ? "Mục này sẽ bị xoá vĩnh viễn và không thể khôi phục."
                        : `${count} mục sẽ bị xoá vĩnh viễn và không thể khôi phục.`}
                </div>
                <div className="dlt-confirm-dialog__actions">
                    <button className="dlt-confirm-btn dlt-confirm-btn--destructive" onClick={onConfirm}>
                        Xoá vĩnh viễn
                    </button>
                    <button className="dlt-confirm-btn dlt-confirm-btn--cancel" onClick={onCancel}>
                        Huỷ
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Swipeable row ─── */
const ACTION_WIDTH = 88;
const SWIPE_THRESHOLD = 0.45;

function SwipeDeletedRow({
    item,
    selected,
    selectMode,
    onToggleSelect,
    onRestore,
    onPermanentDelete,
}: {
    item: DeletedSplitItem;
    selected: boolean;
    selectMode: boolean;
    onToggleSelect: (id: string) => void;
    onRestore: (item: DeletedSplitItem) => void;
    onPermanentDelete: (item: DeletedSplitItem) => void;
}) {
    const [offsetX, setOffsetX] = useState(0);
    const [active,  setActive]  = useState(false);

    const onRestoreRef          = useRef(onRestore);
    const onPermanentDeleteRef  = useRef(onPermanentDelete);
    const selectModeRef         = useRef(selectMode);
    const startX                = useRef(0);
    const startY                = useRef(0);
    const isHoriz               = useRef<boolean | null>(null);
    const latestOffset          = useRef(0);
    const rowRef                = useRef<HTMLDivElement>(null);
    const contentRef            = useRef<HTMLDivElement>(null);

    useEffect(() => { onRestoreRef.current         = onRestore; },         [onRestore]);
    useEffect(() => { onPermanentDeleteRef.current  = onPermanentDelete; }, [onPermanentDelete]);
    useEffect(() => { selectModeRef.current         = selectMode; },        [selectMode]);
    useEffect(() => { latestOffset.current          = offsetX; },           [offsetX]);

    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;

        function onTouchStart(e: TouchEvent) {
            if (selectModeRef.current) return;
            const t = e.touches[0];
            startX.current  = t.clientX;
            startY.current  = t.clientY;
            isHoriz.current = null;
            setActive(true);
        }

        function onTouchMove(e: TouchEvent) {
            if (selectModeRef.current) return;
            const t   = e.touches[0];
            const dx  = t.clientX - startX.current;
            const dy  = t.clientY - startY.current;
            const adx = Math.abs(dx);
            const ady = Math.abs(dy);

            if (isHoriz.current === null) {
                if (adx < 3 && ady < 3) return;
                isHoriz.current = adx > ady;
            }
            if (!isHoriz.current) return;

            e.preventDefault();
            const next = Math.max(-ACTION_WIDTH * 1.4, Math.min(ACTION_WIDTH * 1.4, dx));
            latestOffset.current = next;
            setOffsetX(next);
        }

        function onTouchEnd() {
            setActive(false);
            if (selectModeRef.current || !isHoriz.current) return;

            const rowW = rowRef.current?.offsetWidth ?? 320;
            const off  = latestOffset.current;

            if (off <= -(rowW * SWIPE_THRESHOLD)) {
                setOffsetX(0);
                onPermanentDeleteRef.current(item);
            } else if (off <= -ACTION_WIDTH * 0.6) {
                setOffsetX(-ACTION_WIDTH);
            } else if (off >= rowW * SWIPE_THRESHOLD) {
                setOffsetX(0);
                onRestoreRef.current(item);
            } else if (off >= ACTION_WIDTH * 0.6) {
                setOffsetX(ACTION_WIDTH);
            } else {
                setOffsetX(0);
            }
        }

        el.addEventListener("touchstart",  onTouchStart,  { passive: true });
        el.addEventListener("touchmove",   onTouchMove,   { passive: false });
        el.addEventListener("touchend",    onTouchEnd,    { passive: true });
        el.addEventListener("touchcancel", onTouchEnd,    { passive: true });

        return () => {
            el.removeEventListener("touchstart",  onTouchStart);
            el.removeEventListener("touchmove",   onTouchMove);
            el.removeEventListener("touchend",    onTouchEnd);
            el.removeEventListener("touchcancel", onTouchEnd);
        };
    }, [item]); // stable — callbacks accessed via refs

    return (
        <div className="dlt-swipe-row" ref={rowRef}>
            {/* Left action: restore (revealed by swiping right) */}
            <div className="dlt-swipe-row__action dlt-swipe-row__action--left">
                <button
                    className="dlt-action-btn dlt-action-btn--restore"
                    onClick={() => { setOffsetX(0); onRestore(item); }}
                    type="button"
                >
                    <Icon name="restore" size={18} />
                    Khôi phục
                </button>
            </div>

            {/* Right action: permanent delete (revealed by swiping left) */}
            <div className="dlt-swipe-row__action dlt-swipe-row__action--right">
                <button
                    className="dlt-action-btn dlt-action-btn--delete"
                    onClick={() => { setOffsetX(0); onPermanentDelete(item); }}
                    type="button"
                >
                    <Icon name="delete_forever" size={18} />
                    Xoá hẳn
                </button>
            </div>

            {/* Content */}
            <div
                ref={contentRef}
                className={`dlt-swipe-row__content${selected ? " dlt-swipe-row__content--selected" : ""}`}
                style={{
                    transform: selectMode ? "translateX(0)" : `translateX(${offsetX}px)`,
                    transition: active ? "none" : "transform 0.2s ease",
                }}
                onClick={() => selectMode && onToggleSelect(item.id)}
            >
                {selectMode && (
                    <div className={`dlt-checkbox${selected ? " dlt-checkbox--checked" : ""}`}>
                        {selected && <Icon name="check" size={14} />}
                    </div>
                )}
                <div
                    className="dlt-row-type-bar"
                    style={{ background: TYPE_COLORS[item.transactionType] ?? "var(--color-accent)" }}
                />
                <div className="dlt-row-body">
                    <span className="dlt-row-category">{item.categoryName}</span>
                    <span className="dlt-row-date">
                        {formatDate(item.transactionDate)} · xoá {formatDeletedAt(item.deletedAt)}
                    </span>
                </div>
                <span className="dlt-row-amount">{formatCurrency(item.amount, item.currency)}</span>
            </div>
        </div>
    );
}

/* ─── Page ─── */
export const DeletedTransactionsPage = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState<DeletedSplitItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [confirmDelete, setConfirmDelete] = useState<DeletedSplitItem[] | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await transactionsApi.getDeletedSplits();
            setItems(data);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    function toggleSelect(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function toggleSelectAll() {
        if (selected.size === items.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(items.map((i) => i.id)));
        }
    }

    function exitSelectMode() {
        setSelectMode(false);
        setSelected(new Set());
    }

    /* ── Single restore ── */
    async function handleRestore(item: DeletedSplitItem) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        try {
            await transactionsApi.restoreSplit(item.transactionId, item.id);
        } catch {
            setItems((prev) => [item, ...prev]);
        }
    }

    /* ── Bulk restore ── */
    async function handleBulkRestore() {
        const ids = Array.from(selected);
        setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
        exitSelectMode();
        try {
            await transactionsApi.bulkRestoreSplits(ids);
        } catch {
            load(); // revert by reloading
        }
    }

    /* ── Single permanent delete ── */
    function requestPermanentDelete(item: DeletedSplitItem) {
        setConfirmDelete([item]);
    }

    async function confirmPermanentDelete() {
        if (!confirmDelete) return;
        const targets = confirmDelete;
        setConfirmDelete(null);

        if (targets.length === 1) {
            const [target] = targets;
            setItems((prev) => prev.filter((i) => i.id !== target.id));
            try {
                await transactionsApi.hardDeleteSplit(target.transactionId, target.id);
            } catch {
                setItems((prev) => [target, ...prev]);
            }
        } else {
            const ids = targets.map((t) => t.id);
            setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
            exitSelectMode();
            try {
                await transactionsApi.bulkHardDeleteSplits(ids);
            } catch {
                load();
            }
        }
    }

    /* ── Bulk permanent delete ── */
    function handleBulkDelete() {
        const targets = items.filter((i) => selected.has(i.id));
        setConfirmDelete(targets);
    }

    const allSelected = items.length > 0 && selected.size === items.length;

    return (
        <div className="dlt-page">
            {/* Header */}
            <div className="dlt-header">
                <button
                    className="dlt-header__back"
                    onClick={() => (selectMode ? exitSelectMode() : navigate(-1))}
                    aria-label="Quay lại"
                    type="button"
                >
                    <Icon name="arrow_back" size={22} />
                </button>
                <h1 className="dlt-header__title">Giao dịch đã xoá</h1>
                {!selectMode ? (
                    <button
                        className="dlt-header__select-btn"
                        onClick={() => setSelectMode(true)}
                        type="button"
                        disabled={items.length === 0}
                    >
                        Chọn
                    </button>
                ) : (
                    <button
                        className="dlt-header__select-btn"
                        onClick={toggleSelectAll}
                        type="button"
                    >
                        {allSelected ? "Bỏ chọn" : "Tất cả"}
                    </button>
                )}
            </div>

            {/* Body */}
            <div className={`dlt-body${selectMode ? " dlt-body--select" : ""}`}>
                {loading ? (
                    [1, 2, 3].map((i) => (
                        <div key={i} className="dlt-skeleton-row">
                            <span className="skeleton" style={{ width: 4, height: 40, borderRadius: 2 }} />
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                                <span className="skeleton" style={{ width: "50%", height: 14 }} />
                                <span className="skeleton" style={{ width: "30%", height: 12 }} />
                            </div>
                            <span className="skeleton" style={{ width: 64, height: 16 }} />
                        </div>
                    ))
                ) : items.length === 0 ? (
                    <div className="dlt-empty">
                        <Icon name="delete_sweep" size={40} className="dlt-empty__icon" />
                        <div className="dlt-empty__title">Không có mục nào</div>
                        <div className="dlt-empty__text">Các mục đã xoá sẽ xuất hiện ở đây.</div>
                    </div>
                ) : (
                    items.map((item) => (
                        <SwipeDeletedRow
                            key={item.id}
                            item={item}
                            selected={selected.has(item.id)}
                            selectMode={selectMode}
                            onToggleSelect={toggleSelect}
                            onRestore={handleRestore}
                            onPermanentDelete={requestPermanentDelete}
                        />
                    ))
                )}
            </div>

            {/* Bulk action bar */}
            {selectMode && selected.size > 0 && (
                <div className="dlt-bulk-bar">
                    <button
                        className="dlt-bulk-btn dlt-bulk-btn--delete"
                        onClick={handleBulkDelete}
                        type="button"
                    >
                        <Icon name="delete_forever" size={18} />
                        Xoá hẳn ({selected.size})
                    </button>
                    <button
                        className="dlt-bulk-btn dlt-bulk-btn--restore"
                        onClick={handleBulkRestore}
                        type="button"
                    >
                        <Icon name="restore" size={18} />
                        Khôi phục ({selected.size})
                    </button>
                </div>
            )}

            {/* Confirm dialog */}
            {confirmDelete && (
                <ConfirmDialog
                    count={confirmDelete.length}
                    onConfirm={confirmPermanentDelete}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
        </div>
    );
};
