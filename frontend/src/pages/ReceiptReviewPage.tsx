import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { receiptsApi, type TransactionSuggestion, type SuggestionItem } from "@/api/receipts.api";
import { transactionsApi, type TransactionType, type TxCategory } from "@/api/transactions.api";
import { Icon } from "@/components/common/Icon";
import "@/styles/transactions.css"; // detail-row, detail-sheet__* classes
import "@/styles/receipt-review.css";

/* ─── Types ─── */
type Phase = "preview" | "scanning" | "review";

interface LocationState {
    file: File;
    type: TransactionType;
}

interface ItemState extends SuggestionItem {
    selectedCategoryId: string | null;
    selectedCategoryName: string | null;
}

/* ─── Helpers ─── */
const TYPE_CONFIG: Record<TransactionType, { label: string; color: string }> = {
    income:     { label: "Thu nhập",  color: "var(--color-income)"     },
    expense:    { label: "Chi tiêu",  color: "var(--color-expense)"    },
    investment: { label: "Đầu tư",   color: "var(--color-investment)" },
    saving:     { label: "Tiết kiệm", color: "var(--color-saving)"     },
};

function formatAmount(n: number | null, currency?: string | null): string {
    if (n == null) return "—";
    const formatted = n.toLocaleString("vi-VN");
    if (!currency) return formatted;
    return currency === "VND" ? `${formatted} đ` : `${formatted} ${currency}`;
}

function todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoDateOnly(iso: string | null): string {
    if (!iso) return todayIso();
    return iso.slice(0, 10);
}

function formatDateDisplay(iso: string): string {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
}

/* ─── Page ─── */
export const ReceiptReviewPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as LocationState | null;

    useEffect(() => {
        if (!state?.file) navigate("/", { replace: true });
    }, [state, navigate]);

    const file = state?.file ?? null;
    const txType = state?.type ?? "expense";
    const cfg = TYPE_CONFIG[txType];

    const [phase, setPhase]         = useState<Phase>("preview");
    const [imageUrl]                = useState<string>(() => (file ? URL.createObjectURL(file) : ""));
    const [suggestion, setSuggestion] = useState<TransactionSuggestion | null>(null);
    const [items, setItems]         = useState<ItemState[]>([]);
    const [categories, setCategories] = useState<TxCategory[]>([]);
    const [date, setDate]           = useState(todayIso);
    const [note, setNote]           = useState("");
    const [scanError, setScanError] = useState<string | null>(null);
    const [saving, setSaving]       = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const loadCategories = useCallback(async () => {
        try {
            const cats = await transactionsApi.getCategories(txType);
            setCategories(cats);
        } catch { setCategories([]); }
    }, [txType]);

    useEffect(() => { loadCategories(); }, [loadCategories]);

    async function handleScan() {
        if (!file) return;
        setPhase("scanning");
        setScanError(null);
        try {
            const result = await receiptsApi.uploadAndScan(file, txType);
            const s = result.suggestion;
            setSuggestion(s);
            setDate(isoDateOnly(s.transactionDate));
            setNote(s.merchant?.name ?? "");
            setItems(s.items.map((item) => ({
                ...item,
                selectedCategoryId:   item.prediction.categoryId,
                selectedCategoryName: item.prediction.categoryName,
            })));
            setPhase("review");
        } catch (err: unknown) {
            const code = (err as { error?: { code?: string } })?.error?.code;
            const msg =
                code === "AI_NOT_A_RECEIPT"  ? "Không tìm thấy thông tin giao dịch. Hãy thử ảnh khác hoặc nhập thủ công."
              : code === "AI_IMAGE_TOO_BLURRY" ? "Ảnh quá mờ, không đọc được. Vui lòng chụp lại rõ hơn."
              : code === "AI_LIMIT_REACHED"    ? "Dịch vụ quét hóa đơn tạm thời không khả dụng. Vui lòng nhập thủ công."
              : code === "THIRD_PARTY_ERROR"   ? "Không thể kết nối dịch vụ AI. Vui lòng thử lại sau."
              : "Không thể đọc hóa đơn. Vui lòng thử lại hoặc nhập thủ công.";
            setScanError(msg);
            setPhase("preview");
        }
    }

    function handleCategoryChange(idx: number, catId: string) {
        const cat = categories.find((c) => c.id === catId) ?? null;
        setItems((prev) => prev.map((item, i) =>
            i === idx
                ? { ...item, selectedCategoryId: catId || null, selectedCategoryName: cat?.name ?? null }
                : item,
        ));
    }

    const allCategoriesSet = items.length === 0 || items.every((i) => i.selectedCategoryId !== null);
    const hasLowConfidence = items.some((i) => i.prediction.lowConfidence);

    async function handleConfirm() {
        if (!suggestion || !allCategoriesSet || saving) return;
        const splitMap: Record<string, number> = {};
        for (const item of items) {
            const catId = item.selectedCategoryId!;
            splitMap[catId] = (splitMap[catId] ?? 0) + item.subtotal;
        }
        const splits = Object.entries(splitMap).map(([categoryId, amount]) => ({ categoryId, amount }));
        if (splits.length === 0) return;

        setSaving(true);
        setSaveError(null);
        try {
            await transactionsApi.createFromReceipt({
                type: txType,
                transactionDate: date,
                receiptId: suggestion.receiptId!,
                note: note.trim() || undefined,
                items: splits,
            });
            setSaveSuccess(true);
            setTimeout(() => navigate("/", { replace: true }), 800);
        } catch {
            setSaveError("Không thể lưu giao dịch. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    }

    if (!file) return null;

    /* ══════════════════════════════════════════
       Phase: preview / scanning
    ══════════════════════════════════════════ */
    if (phase === "preview" || phase === "scanning") {
        const scanning = phase === "scanning";
        return (
            <div className="rxv-page">
                <header className="rxv-header">
                    <button
                        className="rxv-header__back"
                        onClick={() => navigate(-1)}
                        aria-label="Quay lại"
                        type="button"
                        disabled={scanning}
                    >
                        <Icon name="arrow_back" size={22} />
                    </button>
                    <h1 className="rxv-header__title">
                        {scanning ? "Đang đọc hóa đơn..." : "Xem trước hóa đơn"}
                    </h1>
                    <div style={{ width: 40 }} />
                </header>

                <div className="rxv-preview-body">
                    <span className="rxv-type-badge" style={{ background: cfg.color }}>
                        {cfg.label}
                    </span>

                    <div className={`rxv-preview-wrap${scanning ? " rxv-preview-wrap--scanning" : ""}`}>
                        <img src={imageUrl} alt="Hóa đơn" className="rxv-preview-img" />
                        {scanning && (
                            <div className="rxv-scan-overlay">
                                <Icon name="progress_activity" size={44} className="spin-icon" />
                                <p>Đang phân tích hóa đơn...</p>
                            </div>
                        )}
                    </div>

                    {scanError && (
                        <div className="rxv-error-box">
                            <Icon name="error_outline" size={16} />
                            {scanError}
                        </div>
                    )}
                </div>

                {!scanning && (
                    <div className="rxv-preview-footer">
                        <button className="rxv-btn rxv-btn--ghost" onClick={() => navigate(-1)} type="button">
                            <Icon name="arrow_back" size={18} />
                            Chọn ảnh khác
                        </button>
                        <button
                            className="rxv-btn rxv-btn--primary"
                            style={{ background: cfg.color }}
                            onClick={handleScan}
                            type="button"
                        >
                            Đọc hóa đơn
                            <Icon name="chevron_right" size={18} />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    /* ══════════════════════════════════════════
       Phase: review — styled like "Thông tin giao dịch"
    ══════════════════════════════════════════ */
    const s = suggestion!;

    return (
        <div className="rxv-page">
            {/* Header — same topbar style as detail sheet */}
            <div className="detail-sheet__topbar rxv-topbar">
                <button
                    className="detail-sheet__close rxv-back-btn"
                    onClick={() => { setPhase("preview"); setScanError(null); }}
                    aria-label="Quay lại"
                    type="button"
                    disabled={saving}
                >
                    <Icon name="arrow_back" size={20} />
                </button>
                <span className="detail-sheet__title">Xác nhận giao dịch</span>
                <div style={{ width: 28 }} />
            </div>

            {/* Scrollable body */}
            <div className="detail-sheet__body rxv-review-body">

                {/* Low-confidence warning banner */}
                {hasLowConfidence && (
                    <div className="rxv-warning-banner">
                        <Icon name="warning" size={16} />
                        Một số mục chưa xác định được danh mục. Vui lòng chọn danh mục cho các mục được đánh dấu.
                    </div>
                )}

                {/* ── Nội dung (Note) ── */}
                <div className="detail-row">
                    <span className="detail-row__label">Nội dung</span>
                    <input
                        className="rxv-inline-input"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Giao dịch"
                        maxLength={500}
                    />
                </div>

                {/* ── Loại giao dịch ── */}
                <div className="detail-row">
                    <span className="detail-row__label">Loại</span>
                    <span className="rxv-type-badge rxv-type-badge--sm" style={{ background: cfg.color }}>
                        {cfg.label}
                    </span>
                </div>

                {/* ── Số tiền ── */}
                <div className="detail-row">
                    <span className="detail-row__label">Số tiền</span>
                    <span className="detail-row__value detail-row__value--amount">
                        {formatAmount(s.totalAmount, s.currency)}
                    </span>
                </div>

                {/* ── Ngày giao dịch ── */}
                <div className="detail-row">
                    <span className="detail-row__label">Ngày giờ</span>
                    <div className="rxv-date-row">
                        <span className="detail-row__value">{formatDateDisplay(date)}</span>
                        <input
                            type="date"
                            className="rxv-date-hidden"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            max={todayIso()}
                            aria-label="Chọn ngày"
                        />
                        <Icon name="edit" size={14} className="rxv-date-edit-icon" />
                    </div>
                </div>

                {/* ── Cửa hàng (nếu có) ── */}
                {s.merchant && (
                    <div className="detail-row">
                        <span className="detail-row__label">Cửa hàng</span>
                        <span className="detail-row__value">{s.merchant.name}</span>
                    </div>
                )}

                {/* ── Danh mục / Items ── */}
                {items.length > 0 && (
                    <div className="detail-row rxv-items-row">
                        <span className="detail-row__label">Danh mục</span>
                        <div className="rxv-items-col">
                            {items.map((item, idx) => (
                                <div
                                    key={item.receiptItemId ?? idx}
                                    className={`rxv-item-entry${item.prediction.lowConfidence ? " rxv-item-entry--low" : ""}`}
                                >
                                    {/* Item name + amount */}
                                    <div className="rxv-item-entry__top">
                                        <span className="rxv-item-entry__name">
                                            {item.itemName}
                                            {item.quantity > 1 && (
                                                <span className="rxv-item-entry__qty"> ×{item.quantity}</span>
                                            )}
                                        </span>
                                        <span className="rxv-item-entry__amount">
                                            {formatAmount(item.subtotal, s.currency)}
                                        </span>
                                    </div>
                                    {/* Category — chip or dropdown */}
                                    {item.prediction.lowConfidence ? (
                                        <select
                                            className="rxv-cat-select"
                                            value={item.selectedCategoryId ?? ""}
                                            onChange={(e) => handleCategoryChange(idx, e.target.value)}
                                        >
                                            <option value="">Chọn danh mục *</option>
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span className="rxv-cat-chip">
                                            {item.selectedCategoryName ?? item.prediction.categoryName ?? "—"}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Ảnh hóa đơn ── */}
                <div className="detail-sheet__receipt">
                    <img src={imageUrl} alt="Hóa đơn" />
                </div>

                {/* ── Error ── */}
                {saveError && (
                    <div className="rxv-error-box rxv-error-box--inline">
                        <Icon name="error_outline" size={16} />
                        {saveError}
                    </div>
                )}
            </div>

            {/* Sticky confirm footer */}
            <div className="rxv-footer">
                <button
                    className="rxv-confirm-btn"
                    style={{ background: allCategoriesSet && !saveSuccess ? cfg.color : undefined }}
                    disabled={!allCategoriesSet || saving || saveSuccess}
                    onClick={handleConfirm}
                    type="button"
                >
                    {saving ? (
                        <><Icon name="progress_activity" size={18} className="spin-icon" />Đang lưu...</>
                    ) : saveSuccess ? (
                        <><Icon name="check_circle" size={18} />Đã lưu!</>
                    ) : (
                        "Xác nhận & Lưu"
                    )}
                </button>
            </div>
        </div>
    );
};
