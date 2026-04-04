import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { receiptsApi, type TransactionSuggestion } from "@/api/receipts.api";
import {
    transactionsApi,
    type TransactionType,
    type TxCategory,
} from "@/api/transactions.api";
import { settingsApi } from "@/api/settings.api";
import { exchangeApi } from "@/api/exchange.api";
import { Icon } from "@/components/common/Icon";
import "@/styles/transactions.css";
import "@/styles/receipt-review.css";

/* ─── Types ─── */
interface ConversionInfo {
    original: number;
    from: string;
    rate: number;
}

interface LocationState {
    file: File;
    type: TransactionType;
}

/* ─── Helpers ─── */
const TYPE_CONFIG: Record<TransactionType, { label: string; color: string }> = {
    income:     { label: "Thu nhập",  color: "var(--color-income)" },
    expense:    { label: "Chi tiêu",  color: "var(--color-expense)" },
    investment: { label: "Đầu tư",    color: "var(--color-investment)" },
    saving:     { label: "Tiết kiệm", color: "var(--color-saving)" },
};

const TX_TYPES: TransactionType[] = ["income", "expense", "investment", "saving"];

function isoToDateTimeLocal(iso: string | null): string {
    const now = new Date();
    const currentYear = now.getFullYear();

    if (!iso) {
        const date = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        return `${date}T${time}`;
    }

    if (iso.startsWith("--")) {
        const withYear = `${currentYear}-${iso.slice(2)}`;
        return withYear.includes("T") ? withYear.slice(0, 16) : `${withYear}T00:00`;
    }

    const withTime = iso.includes("T") ? iso.slice(0, 16) : `${iso}T00:00`;
    const year = parseInt(withTime.slice(0, 4), 10);
    if (year < 100) return `${currentYear}${withTime.slice(4)}`;
    return withTime;
}

function roundAmount(value: number, currency: string): number {
    if (currency === "VND") return Math.round(value / 1000) * 1000;
    return Math.round(value);
}

function formatDateTimeDisplay(dtLocal: string): string {
    if (!dtLocal) return "—";
    const [datePart, timePart = "00:00"] = dtLocal.split("T");
    const [y, m, d] = datePart.split("-");
    return `${d}/${m}/${y} ${timePart.slice(0, 5)}`;
}

/* ─── Page ─── */
export const ReceiptReviewPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as LocationState | null;

    useEffect(() => {
        if (!state?.file) navigate("/", { replace: true });
    }, [state, navigate]);

    const file    = state?.file ?? null;
    const initType = state?.type ?? "expense";

    const [imageUrl] = useState<string>(() =>
        file ? URL.createObjectURL(file) : "",
    );

    const [scanning, setScanning] = useState(false);
    const [suggestion, setSuggestion] = useState<TransactionSuggestion | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);

    const [categories, setCategories] = useState<TxCategory[]>([]);
    const [selectedType, setSelectedType] = useState<TransactionType>(initType);
    const [amount, setAmount] = useState<string>("");
    const [dateTime, setDateTime] = useState<string>(() => isoToDateTimeLocal(null));
    const [note, setNote] = useState("");
    const [merchant, setMerchant] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
    const [catOpen, setCatOpen] = useState(false);
    const [catAnchorRect, setCatAnchorRect] = useState<DOMRect | null>(null);
    const [accountCurrency, setAccountCurrency] = useState("VND");
    const [conversionInfo, setConversionInfo] = useState<ConversionInfo | null>(null);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const dateInputRef = useRef<HTMLInputElement>(null);
    const hasScanned = useRef(false);

    const loadCategories = useCallback(async (type: TransactionType) => {
        try {
            const cats = await transactionsApi.getCategories(type);
            setCategories(cats);
        } catch {
            setCategories([]);
        }
    }, []);

    useEffect(() => { loadCategories(selectedType); }, [loadCategories, selectedType]);

    // Auto-scan on mount
    useEffect(() => {
        if (!file || hasScanned.current) return;
        hasScanned.current = true;

        (async () => {
            setScanning(true);
            setScanError(null);
            try {
                const [result, settingsData] = await Promise.all([
                    receiptsApi.uploadAndScan(file, initType),
                    settingsApi.getSettings(),
                ]);
                const s = result.suggestion;
                const userCur = (settingsData.account?.currency ?? "VND").toUpperCase();
                setAccountCurrency(userCur);
                setSuggestion(s);
                setDateTime(isoToDateTimeLocal(s.transactionDate));
                setMerchant(s.merchant?.name ?? "");
                setNote((s.suggestedNote ?? "").slice(0, 500));
                setSelectedCategoryId(s.items[0]?.prediction.categoryId ?? "");

                const rawAmount = s.totalAmount;
                const receiptCur = (s.currency ?? "").toUpperCase();

                if (rawAmount != null && receiptCur && receiptCur !== userCur) {
                    try {
                        const rate = await exchangeApi.getRate(receiptCur, userCur);
                        if (rate !== null) {
                            setAmount(String(roundAmount(rawAmount * rate, userCur)));
                            setConversionInfo({ original: rawAmount, from: receiptCur, rate });
                        } else {
                            setAmount(String(Math.round(rawAmount)));
                        }
                    } catch {
                        setAmount(String(Math.round(rawAmount)));
                    }
                } else {
                    setAmount(rawAmount != null ? String(roundAmount(rawAmount, userCur)) : "");
                }
            } catch (err: unknown) {
                const code = (err as { error?: { code?: string } })?.error?.code;
                const msg =
                    code === "AI_NOT_A_RECEIPT"     ? "Không tìm thấy thông tin giao dịch. Vui lòng nhập thủ công." :
                    code === "AI_IMAGE_TOO_BLURRY"  ? "Ảnh quá mờ, không đọc được. Vui lòng nhập thủ công." :
                    code === "AI_LIMIT_REACHED"     ? "Dịch vụ quét hóa đơn tạm thời không khả dụng. Vui lòng nhập thủ công." :
                    code === "THIRD_PARTY_ERROR"    ? "Không thể kết nối dịch vụ AI. Vui lòng nhập thủ công." :
                                                      "Không thể đọc hóa đơn. Vui lòng nhập thủ công.";
                setScanError(msg);
            } finally {
                setScanning(false);
            }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file]);

    const canSave = !scanning && !!selectedCategoryId && parseFloat(amount) > 0;
    const cfg = TYPE_CONFIG[selectedType];

    async function handleConfirm() {
        if (!canSave || saving) return;
        const parsedAmount = parseFloat(amount);

        setSaving(true);
        setSaveError(null);
        try {
            if (suggestion?.receiptId) {
                await transactionsApi.createFromReceipt({
                    type: selectedType,
                    transactionDate: dateTime,
                    receiptId: suggestion.receiptId,
                    note: note.trim() || undefined,
                    items: [{ categoryId: selectedCategoryId, amount: Math.round(parsedAmount) }],
                });
            } else {
                await transactionsApi.create({
                    type: selectedType,
                    amount: Math.round(parsedAmount),
                    transactionDate: dateTime.slice(0, 10),
                    categoryId: selectedCategoryId,
                    note: note.trim() || undefined,
                });
            }
            setSaveSuccess(true);
            setTimeout(() => navigate("/", { replace: true }), 800);
        } catch {
            setSaveError("Không thể lưu giao dịch. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    }

    if (!file) return null;

    return (
        <div className="rxv-page">
            {/* Header */}
            <div className="detail-sheet__topbar rxv-topbar">
                <button
                    className="detail-sheet__close rxv-back-btn"
                    onClick={() => navigate(-1)}
                    aria-label="Quay lại"
                    type="button"
                    disabled={saving}
                >
                    <Icon name="arrow_back" size={20} />
                </button>
                <span className="detail-sheet__title">
                    {scanning ? "Đang đọc hóa đơn..." : "Xác nhận giao dịch"}
                </span>
                <div style={{ width: 28 }} />
            </div>

            <div className="detail-sheet__body rxv-review-body">
                {/* Ảnh hóa đơn + scanning overlay */}
                <div className="rxv-img-wrap">
                    <img src={imageUrl} alt="Hóa đơn" className="rxv-preview-img rxv-preview-img--inline" />
                    {scanning && (
                        <div className="rxv-scan-overlay rxv-scan-overlay--inline">
                            <Icon name="progress_activity" size={36} className="spin-icon" />
                            <p>Đang phân tích...</p>
                        </div>
                    )}
                </div>

                {scanError && (
                    <div className="rxv-error-box">
                        <Icon name="error_outline" size={16} />
                        {scanError}
                    </div>
                )}

                {/* Loại giao dịch */}
                <div className="detail-row">
                    <span className="detail-row__label">Loại</span>
                    <select
                        className="rxv-pill-select rxv-pill-select--type"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value as TransactionType)}
                        style={{ color: cfg.color }}
                        disabled={scanning}
                    >
                        {TX_TYPES.map((t) => (
                            <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
                        ))}
                    </select>
                </div>

                {/* Danh mục */}
                <div className="detail-row">
                    <span className="detail-row__label">Danh mục</span>
                    <button
                        type="button"
                        className="rxv-cat-trigger"
                        disabled={scanning}
                        onClick={(e) => {
                            setCatAnchorRect(e.currentTarget.getBoundingClientRect());
                            setCatOpen(true);
                        }}
                    >
                        {selectedCategoryId ? (
                            <span className="rxv-cat-trigger__value">
                                {categories.find((c) => c.id === selectedCategoryId)?.name ?? "Chọn danh mục"}
                            </span>
                        ) : (
                            <span className="rxv-cat-trigger__placeholder">Chọn danh mục</span>
                        )}
                        <Icon name="expand_more" size={14} className="rxv-cat-trigger__chevron" />
                    </button>
                </div>

                {/* Số tiền */}
                <div className="detail-row">
                    <span className="detail-row__label">Số tiền</span>
                    <div className="rxv-amount-col">
                        <div className="rxv-amount-row">
                            <input
                                className="rxv-amount-input"
                                type="tel"
                                inputMode="numeric"
                                value={amount ? Number(amount).toLocaleString("vi-VN") : ""}
                                onChange={(e) => {
                                    setAmount(e.target.value.replace(/\D/g, ""));
                                    setConversionInfo(null);
                                }}
                                placeholder="—"
                                disabled={scanning}
                            />
                            <span className="rxv-amount-currency">
                                {accountCurrency === "VND" ? "đ" : accountCurrency}
                            </span>
                        </div>
                        {conversionInfo && (
                            <span className="rxv-conversion-hint">
                                Tỉ giá: 1 {conversionInfo.from} = {conversionInfo.rate.toLocaleString("vi-VN")} {accountCurrency === "VND" ? "đ" : accountCurrency}
                            </span>
                        )}
                    </div>
                </div>

                {/* Ngày giờ */}
                <div className="detail-row">
                    <span className="detail-row__label">Ngày giờ</span>
                    <div className="rxv-date-row">
                        <span className="detail-row__value">{formatDateTimeDisplay(dateTime)}</span>
                        <input
                            ref={dateInputRef}
                            type="datetime-local"
                            className="rxv-date-hidden"
                            value={dateTime}
                            onChange={(e) => setDateTime(e.target.value)}
                            aria-label="Chọn ngày giờ"
                            tabIndex={-1}
                        />
                        <button
                            type="button"
                            className="rxv-date-edit-btn"
                            aria-label="Chỉnh ngày giờ"
                            disabled={scanning}
                            onClick={() => {
                                const input = dateInputRef.current;
                                if (!input) return;
                                if (typeof input.showPicker === "function") input.showPicker();
                                else input.click();
                            }}
                        >
                            <Icon name="edit" size={14} />
                        </button>
                    </div>
                </div>

                {/* Nội dung */}
                <div className="detail-row">
                    <span className="detail-row__label">Nội dung</span>
                    <div className="rxv-inline-row">
                        <input
                            className="rxv-inline-input"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Nhập nội dung..."
                            maxLength={500}
                            disabled={scanning}
                        />
                        <Icon name="edit" size={14} className="rxv-date-edit-icon" />
                    </div>
                </div>

                {/* Cửa hàng */}
                <div className="detail-row">
                    <span className="detail-row__label">Cửa hàng</span>
                    <div className="rxv-inline-row">
                        <input
                            className="rxv-inline-input"
                            value={merchant}
                            onChange={(e) => setMerchant(e.target.value)}
                            placeholder="—"
                            maxLength={200}
                            disabled={scanning}
                        />
                        <Icon name="edit" size={14} className="rxv-date-edit-icon" />
                    </div>
                </div>

                {saveError && (
                    <div className="rxv-error-box rxv-error-box--inline">
                        <Icon name="error_outline" size={16} />
                        {saveError}
                    </div>
                )}
            </div>

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
                                className={`dropdown-option${selectedCategoryId === cat.id ? " dropdown-option--active" : ""}`}
                                onClick={() => { setSelectedCategoryId(cat.id); setCatOpen(false); }}
                            >
                                {cat.icon && <Icon name={cat.icon} size={18} />}
                                <span className="dropdown-option__label">{cat.name}</span>
                                {selectedCategoryId === cat.id && (
                                    <Icon name="check" size={16} className="dropdown-option__check" />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* Sticky footer */}
            <div className="rxv-footer">
                <button
                    className="rxv-confirm-btn"
                    style={{ background: canSave && !saveSuccess ? cfg.color : undefined }}
                    disabled={!canSave || saving || saveSuccess}
                    onClick={handleConfirm}
                    type="button"
                >
                    {saving ? (
                        <><Icon name="progress_activity" size={18} className="spin-icon" />Đang lưu...</>
                    ) : saveSuccess ? (
                        <><Icon name="check_circle" size={18} />Đã lưu!</>
                    ) : scanning ? (
                        "Đang đọc hóa đơn..."
                    ) : (
                        "Xong"
                    )}
                </button>
            </div>
        </div>
    );
};
