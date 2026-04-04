import { useNavigate, useLocation } from "react-router-dom";
import { useState, useRef } from "react";
import { Icon } from "@/components/common/Icon";

/* ─── Types ─── */
type TxType = "income" | "expense" | "investment" | "saving";

const TX_OPTIONS: Array<{ type: TxType; label: string; icon: string; desc: string }> = [
    { type: "income",     label: "Nhập tiền thu",  icon: "trending_up",       desc: "Ghi nhận khoản thu nhập" },
    { type: "expense",    label: "Nhập tiền chi",  icon: "shopping_bag",      desc: "Ghi nhận khoản chi tiêu" },
    { type: "investment", label: "Đầu tư",          icon: "candlestick_chart", desc: "Ghi nhận khoản đầu tư" },
    { type: "saving",     label: "Tiết kiệm",       icon: "savings",           desc: "Ghi nhận khoản tiết kiệm" },
];

/* ─── TxSheet ─── */
function TxSheet({
    onClose,
    onCameraSelect,
    onGallerySelect,
}: {
    onClose: () => void;
    onCameraSelect: () => void;
    onGallerySelect: () => void;
}) {
    const navigate = useNavigate();
    // "manual" sub-step: show type selection only for manual entry
    const [manualStep, setManualStep] = useState(false);

    return (
        <>
            <div className="sheet-overlay" onClick={onClose} />
            <div className="sheet">
                <div className="sheet__handle" />

                <div className="sheet__title-row">
                    {manualStep && (
                        <button
                            className="sheet__back"
                            onClick={() => setManualStep(false)}
                            aria-label="Quay lại"
                            type="button"
                        >
                            <Icon name="arrow_back" size={20} />
                        </button>
                    )}
                    <span className="sheet__title">
                        {manualStep ? "Chọn loại giao dịch" : "Thêm giao dịch"}
                    </span>
                </div>

                <div className="sheet__options">
                    {manualStep ? (
                        TX_OPTIONS.map((opt) => (
                            <button
                                key={opt.type}
                                className={`sheet-option sheet-option--${opt.type}`}
                                onClick={() => {
                                    onClose();
                                    navigate(`/add-transaction?type=${opt.type}`);
                                }}
                            >
                                <span className={`sheet-option__icon sheet-option__icon--${opt.type}`}>
                                    <Icon name={opt.icon} size={22} />
                                </span>
                                <span className="sheet-option__body">
                                    <span className="sheet-option__name">{opt.label}</span>
                                    <span className="sheet-option__desc">{opt.desc}</span>
                                </span>
                                <Icon name="chevron_right" size={18} className="sheet-option__chevron" />
                            </button>
                        ))
                    ) : (
                        <>
                            <button
                                className="sheet-option sheet-option--income sheet-option--highlighted"
                                onClick={onCameraSelect}
                            >
                                <span className="sheet-option__icon sheet-option__icon--income">
                                    <Icon name="photo_camera" size={22} />
                                </span>
                                <span className="sheet-option__body">
                                    <span className="sheet-option__name">Chụp ảnh hóa đơn</span>
                                    <span className="sheet-option__desc">Chụp ảnh để nhập tự động</span>
                                </span>
                                <Icon name="chevron_right" size={18} className="sheet-option__chevron" />
                            </button>
                            <button
                                className="sheet-option"
                                onClick={onGallerySelect}
                            >
                                <span className="sheet-option__icon sheet-option__icon--gallery">
                                    <Icon name="image" size={22} />
                                </span>
                                <span className="sheet-option__body">
                                    <span className="sheet-option__name">Thêm ảnh từ thư viện</span>
                                    <span className="sheet-option__desc">Chọn ảnh đã chụp sẵn</span>
                                </span>
                                <Icon name="chevron_right" size={18} className="sheet-option__chevron" />
                            </button>
                            <button
                                className="sheet-option"
                                onClick={() => setManualStep(true)}
                            >
                                <span className="sheet-option__icon sheet-option__icon--manual">
                                    <Icon name="edit" size={22} />
                                </span>
                                <span className="sheet-option__body">
                                    <span className="sheet-option__name">Nhập thủ công</span>
                                    <span className="sheet-option__desc">Điền thông tin bằng tay</span>
                                </span>
                                <Icon name="chevron_right" size={18} className="sheet-option__chevron" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

/* ─── Shared Bottom Nav ─── */
export const BottomNav = () => {
    const navigate      = useNavigate();
    const { pathname }  = useLocation();
    const [fabOpen, setFabOpen] = useState(false);

    // Hidden file inputs for camera and gallery
    const cameraInputRef  = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const pendingTypeRef  = useRef<TxType | null>(null);

    function isActive(path: string) {
        if (path === "/") return pathname === "/";
        return pathname.startsWith(path);
    }

    function closeFab() { setFabOpen(false); }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file && pendingTypeRef.current) {
            navigate("/receipt-review", { state: { file, type: pendingTypeRef.current } });
        }
        // Reset so the same file can be re-selected
        e.target.value = "";
    }

    function handleCameraSelect() {
        pendingTypeRef.current = "expense";
        setTimeout(() => cameraInputRef.current?.click(), 120);
    }

    function handleGallerySelect() {
        pendingTypeRef.current = "expense";
        setTimeout(() => galleryInputRef.current?.click(), 120);
    }

    return (
        <>
            {/* Hidden file inputs — must live outside the sheet so they persist after sheet unmounts */}
            <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/heic,application/pdf"
                style={{ display: "none" }}
                onChange={handleFileChange}
            />
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={handleFileChange}
            />

            <nav className="bottom-nav" aria-label="Điều hướng chính">
                {/* Trang chủ */}
                <button
                    className={`bottom-nav__item${isActive("/") ? " bottom-nav__item--active" : ""}`}
                    onClick={() => navigate("/")}
                >
                    <Icon name="home" size={22} filled={isActive("/")} />
                    Trang chủ
                </button>

                {/* Chi tiết */}
                <button
                    className={`bottom-nav__item${isActive("/transactions") ? " bottom-nav__item--active" : ""}`}
                    onClick={() => navigate("/transactions")}
                >
                    <Icon name="receipt_long" size={22} filled={isActive("/transactions")} />
                    Chi tiết
                </button>

                {/* FAB */}
                <div className="bottom-nav__fab-slot">
                    <button
                        className={`fab${fabOpen ? " fab--open" : ""}`}
                        onClick={() => setFabOpen((v) => !v)}
                        aria-label="Thêm giao dịch"
                    >
                        <Icon name={fabOpen ? "close" : "add"} size={24} />
                    </button>
                </div>

                {/* Kế hoạch */}
                <button
                    className={`bottom-nav__item${isActive("/plans") ? " bottom-nav__item--active" : ""}`}
                    onClick={() => navigate("/plans")}
                >
                    <Icon name="account_balance_wallet" size={22} filled={isActive("/plans")} />
                    Kế hoạch
                </button>

                {/* Cài đặt */}
                <button
                    className={`bottom-nav__item${isActive("/settings") ? " bottom-nav__item--active" : ""}`}
                    onClick={() => navigate("/settings")}
                >
                    <Icon name="settings" size={22} filled={isActive("/settings")} />
                    Cài đặt
                </button>
            </nav>

            {fabOpen && (
                <TxSheet
                    onClose={closeFab}
                    onCameraSelect={() => { closeFab(); handleCameraSelect(); }}
                    onGallerySelect={() => { closeFab(); handleGallerySelect(); }}
                />
            )}
        </>
    );
};
