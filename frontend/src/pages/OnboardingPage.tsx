import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { onboardingApi, type Category } from "@/api/onboarding.api";
import "@/styles/onboarding.css";

/* ─── Constants ─────────────────────────────────────────────── */

const CURRENCIES = [
    { code: "VND", name: "Việt Nam đồng" },
    { code: "USD", name: "Đô la Mỹ" },
    { code: "EUR", name: "Euro" },
    { code: "JPY", name: "Yên Nhật" },
    { code: "GBP", name: "Bảng Anh" },
    { code: "SGD", name: "Đô la Singapore" },
    { code: "THB", name: "Baht Thái" },
    { code: "KRW", name: "Won Hàn Quốc" },
    { code: "CNY", name: "Nhân dân tệ" },
    { code: "AUD", name: "Đô la Úc" },
];

const TOTAL_STEPS = 4;

/* ─── Types ─────────────────────────────────────────────────── */

interface BudgetItem {
    categoryId: string;
    name: string;
    amount: number; // 0 = chưa nhập
}

/* ─── Helpers ───────────────────────────────────────────────── */

const fmt = (n: number): string =>
    n === 0 ? "" : n.toLocaleString("en-US");

const parseRaw = (s: string): number =>
    parseInt(s.replace(/[^0-9]/g, ""), 10) || 0;

/* ─── Sub-components ────────────────────────────────────────── */

/** Back arrow icon */
const BackArrow = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
);

/** Calendar icon for step 1 select */
const CalendarIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

/** Currency icon for step 2 select */
const CurrencyIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M14.8 9A2 2 0 0 0 13 8h-2a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-2a2 2 0 0 1-1.8-1" />
        <line x1="12" y1="6" x2="12" y2="8" />
        <line x1="12" y1="16" x2="12" y2="18" />
    </svg>
);

/** Chevron for FAQ */
const ChevronIcon = ({ open }: { open: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
        <path d="M6 9l6 6 6-6" />
    </svg>
);

/* ─── Steps ──────────────────────────────────────────────────── */

interface Step1Props {
    value: number;
    onChange: (v: number) => void;
    faqOpen: boolean;
    onToggleFaq: () => void;
}
const Step1 = ({ value, onChange, faqOpen, onToggleFaq }: Step1Props) => (
    <div>
        <p className="ob-label">Chọn ngày bắt đầu tháng</p>

        <div className="ob-select-wrapper">
            <select
                className="ob-select"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                        Ngày {d} hàng tháng
                    </option>
                ))}
            </select>
            <span className="ob-select-icon"><CalendarIcon /></span>
        </div>

        <div className="ob-faq">
            <button className="ob-faq-trigger" onClick={onToggleFaq} type="button">
                <ChevronIcon open={faqOpen} />
                Ngày bắt đầu tháng là gì?
            </button>
            {faqOpen && (
                <div className="ob-faq-body">
                    <p>* Ngày bắt đầu tháng là ngày nhận lương</p>
                    <p>* Hệ thống sẽ gửi thông báo nhập tiền thu theo ngày bắt đầu tháng</p>
                    <p>* Ví dụ:</p>
                    <p>Ngày 20 hàng tháng là ngày bắt đầu tháng</p>
                    <p>Hệ thống ghi nhận 20/2 → 19/3 là 1 tháng</p>
                </div>
            )}
        </div>
    </div>
);

interface Step2Props {
    value: string;
    onChange: (v: string) => void;
    faqOpen: boolean;
    onToggleFaq: () => void;
}
const Step2 = ({ value, onChange, faqOpen, onToggleFaq }: Step2Props) => (
    <div>
        <p className="ob-label">Chọn đơn vị tiền tệ đích</p>

        <div className="ob-select-wrapper">
            <select
                className="ob-select"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                        {c.name} ({c.code})
                    </option>
                ))}
            </select>
            <span className="ob-select-icon"><CurrencyIcon /></span>
        </div>

        <div className="ob-faq">
            <button className="ob-faq-trigger" onClick={onToggleFaq} type="button">
                <ChevronIcon open={faqOpen} />
                Vì sao phải chọn đơn vị tiền tệ?
            </button>
            {faqOpen && (
                <div className="ob-faq-body">
                    <p>* Nếu bạn quản lý chi tiêu các hóa đơn có đơn vị tiền tệ khác thì AI sẽ tự quy đổi theo tỉ giá hiện nay để tiện quản lý</p>
                </div>
            )}
        </div>
    </div>
);

interface Step3Props {
    items: BudgetItem[];
    onUpdateAmount: (categoryId: string, raw: string) => void;
    onRemove: (categoryId: string) => void;
    onAddClick: () => void;
    error: string | null;
}
const Step3 = ({ items, onUpdateAmount, onRemove, onAddClick, error }: Step3Props) => {
    const total = items.reduce((s, b) => s + b.amount, 0);

    return (
        <div>
            <p className="ob-label">Chọn khoản chi tiêu và số tiền tương ứng</p>

            <div className="ob-table-header">
                <span>Khoản chi tiêu</span>
                <span>Dự tiêu</span>
            </div>

            <div className="ob-table-body">
                {items.map((item) => (
                    <div key={item.categoryId} className="ob-table-row">
                        <span className="ob-table-name">{item.name}</span>
                        <input
                            className="ob-amount-input"
                            type="text"
                            inputMode="numeric"
                            placeholder="Nhập"
                            value={fmt(item.amount)}
                            onChange={(e) => onUpdateAmount(item.categoryId, e.target.value)}
                        />
                        <button
                            className="ob-remove-btn"
                            onClick={() => onRemove(item.categoryId)}
                            type="button"
                            aria-label={`Xóa ${item.name}`}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            <button className="ob-add-btn" onClick={onAddClick} type="button">
                + Thêm
            </button>

            {error && <p className="ob-error-msg">{error}</p>}

            <div className="ob-total-row">
                <span className="ob-total-label">Tổng</span>
                <span className="ob-total-value">
                    {total === 0 ? "0" : total.toLocaleString("en-US")}
                </span>
            </div>
        </div>
    );
};

interface Step4Props {
    cycleStartDay: number;
    targetCurrency: string;
    items: BudgetItem[];
}
const Step4 = ({ cycleStartDay, targetCurrency, items }: Step4Props) => {
    const currencyName =
        CURRENCIES.find((c) => c.code === targetCurrency)?.name ?? targetCurrency;
    const total = items.reduce((s, b) => s + b.amount, 0);

    return (
        <div>
            <div className="ob-review-field">
                <span className="ob-review-label">Ngày bắt đầu tháng:</span>
                <span className="ob-review-value">Ngày {cycleStartDay} hàng tháng</span>
            </div>
            <div className="ob-review-field">
                <span className="ob-review-label">Đơn vị tiền tệ đích:</span>
                <span className="ob-review-value">{currencyName} ({targetCurrency})</span>
            </div>

            <p className="ob-section-title">Khoản chi tiêu dự kiến</p>

            <div className="ob-review-table">
                {items.map((item) => (
                    <div key={item.categoryId} className="ob-review-row">
                        <span className="ob-review-row-name">{item.name}</span>
                        <span className="ob-review-row-amount">
                            {item.amount.toLocaleString("en-US")}
                        </span>
                    </div>
                ))}
            </div>

            <div className="ob-total-row">
                <span className="ob-total-label">Tổng</span>
                <span className="ob-total-value">
                    {total.toLocaleString("en-US")}
                </span>
            </div>
        </div>
    );
};

/* ─── Main Component ─────────────────────────────────────────── */

export const OnboardingPage = () => {
    const { completeOnboarding } = useAuth();
    const navigate = useNavigate();

    /* Step state */
    const [step, setStep] = useState(1);

    /* Step 1 */
    const [cycleStartDay, setCycleStartDay] = useState(20);
    const [faq1Open, setFaq1Open] = useState(false);

    /* Step 2 */
    const [targetCurrency, setTargetCurrency] = useState("VND");
    const [faq2Open, setFaq2Open] = useState(false);

    /* Step 3 */
    const [categories, setCategories] = useState<Category[]>([]);
    const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
    const [showPicker, setShowPicker] = useState(false);
    const [step3Error, setStep3Error] = useState<string | null>(null);

    /* Submit */
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    /* Fetch categories on mount */
    useEffect(() => {
        onboardingApi
            .getCategories()
            .then((cats) => {
                setCategories(cats);
                // Pre-select first 4 categories
                setBudgetItems(
                    cats.slice(0, 4).map((c) => ({
                        categoryId: c.id,
                        name: c.name,
                        amount: 0,
                    })),
                );
            })
            .catch(() => {
                /* Categories not available — user starts with empty list */
            });
    }, []);

    /* ─── Budget helpers ─────────────────────────────────────── */

    const availableCategories = categories.filter(
        (c) => !budgetItems.find((b) => b.categoryId === c.id),
    );

    const updateAmount = (categoryId: string, raw: string) => {
        const amount = parseRaw(raw);
        setBudgetItems((prev) =>
            prev.map((b) =>
                b.categoryId === categoryId ? { ...b, amount } : b,
            ),
        );
    };

    const removeItem = (categoryId: string) => {
        setBudgetItems((prev) => prev.filter((b) => b.categoryId !== categoryId));
    };

    const addCategory = (cat: Category) => {
        setBudgetItems((prev) => [
            ...prev,
            { categoryId: cat.id, name: cat.name, amount: 0 },
        ]);
        setShowPicker(false);
    };

    /* ─── Navigation ─────────────────────────────────────────── */

    const goNext = () => {
        if (step === 3) {
            if (budgetItems.length === 0) {
                setStep3Error("Vui lòng thêm ít nhất một khoản chi tiêu.");
                return;
            }
            const hasBlank = budgetItems.some((b) => b.amount <= 0);
            if (hasBlank) {
                setStep3Error("Vui lòng nhập số tiền cho tất cả các khoản.");
                return;
            }
            setStep3Error(null);
        }
        setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    };

    const goBack = () => {
        setStep((s) => Math.max(s - 1, 1));
        setSubmitError(null);
    };

    /* ─── Submit ─────────────────────────────────────────────── */

    const handleSubmit = async () => {
        setSubmitting(true);
        setSubmitError(null);
        try {
            await onboardingApi.setup({
                cycleStartDay,
                targetCurrency,
                budgets: budgetItems.map((b) => ({
                    categoryId: b.categoryId,
                    amount: b.amount,
                })),
            });
            completeOnboarding();
            navigate("/", { replace: true });
        } catch (err: unknown) {
            const msg =
                (err as { error?: { message?: string } })?.error?.message ??
                "Đã có lỗi xảy ra. Vui lòng thử lại.";
            setSubmitError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    /* ─── Render ─────────────────────────────────────────────── */

    return (
        <div className="ob-page">
            {/* Header: back arrow (hidden on step 1) */}
            <div className="ob-header">
                {step > 1 && (
                    <button
                        className="ob-back"
                        onClick={goBack}
                        type="button"
                        aria-label="Quay lại"
                    >
                        <BackArrow />
                    </button>
                )}
            </div>

            <h1 className="ob-title">Thiết lập kế hoạch chi tiêu</h1>

            {/* Step content */}
            <div className="ob-content">
                {step === 1 && (
                    <Step1
                        value={cycleStartDay}
                        onChange={setCycleStartDay}
                        faqOpen={faq1Open}
                        onToggleFaq={() => setFaq1Open((o) => !o)}
                    />
                )}
                {step === 2 && (
                    <Step2
                        value={targetCurrency}
                        onChange={setTargetCurrency}
                        faqOpen={faq2Open}
                        onToggleFaq={() => setFaq2Open((o) => !o)}
                    />
                )}
                {step === 3 && (
                    <Step3
                        items={budgetItems}
                        onUpdateAmount={updateAmount}
                        onRemove={removeItem}
                        onAddClick={() => setShowPicker(true)}
                        error={step3Error}
                    />
                )}
                {step === 4 && (
                    <Step4
                        cycleStartDay={cycleStartDay}
                        targetCurrency={targetCurrency}
                        items={budgetItems}
                    />
                )}
            </div>

            {/* Footer: CTA button + dots */}
            <div className="ob-footer">
                {step < TOTAL_STEPS ? (
                    <button
                        className="ob-btn-primary"
                        onClick={goNext}
                        type="button"
                    >
                        Tiếp theo
                    </button>
                ) : (
                    <button
                        className="ob-btn-primary"
                        onClick={handleSubmit}
                        disabled={submitting}
                        type="button"
                    >
                        {submitting ? "Đang lưu..." : "Lưu kế hoạch"}
                    </button>
                )}

                {submitError && (
                    <p className="ob-error-msg" style={{ margin: 0 }}>
                        {submitError}
                    </p>
                )}

                {/* Step indicator */}
                <div className="ob-dots" role="progressbar" aria-valuenow={step} aria-valuemax={TOTAL_STEPS}>
                    {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                        <div
                            key={i}
                            className={`ob-dot${i + 1 === step ? " ob-dot--active" : ""}`}
                        />
                    ))}
                </div>
            </div>

            {/* Category picker bottom sheet */}
            {showPicker && (
                <div
                    className="ob-picker-overlay"
                    onClick={() => setShowPicker(false)}
                >
                    <div
                        className="ob-picker-sheet"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="ob-picker-title">Chọn khoản chi tiêu</div>
                        <div className="ob-picker-list">
                            {availableCategories.length > 0 ? (
                                availableCategories.map((cat) => (
                                    <div
                                        key={cat.id}
                                        className="ob-picker-item"
                                        onClick={() => addCategory(cat)}
                                    >
                                        {cat.name}
                                    </div>
                                ))
                            ) : (
                                <p className="ob-picker-empty">
                                    Không còn khoản nào để thêm.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
