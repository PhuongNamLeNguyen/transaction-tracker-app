import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Icon } from "@/components/common/Icon";

/* ─── Types ─── */
type TxType = "income" | "expense" | "investment" | "saving";

const TX_OPTIONS: Array<{ type: TxType; label: string; icon: string; desc: string }> = [
    { type: "income",     label: "Nhập tiền thu",  icon: "trending_up",       desc: "Ghi nhận khoản thu nhập" },
    { type: "expense",    label: "Nhập tiền chi",  icon: "shopping_bag",      desc: "Ghi nhận khoản chi tiêu" },
    { type: "investment", label: "Đầu tư",          icon: "candlestick_chart", desc: "Ghi nhận khoản đầu tư" },
    { type: "saving",     label: "Tiết kiệm",       icon: "savings",           desc: "Ghi nhận khoản tiết kiệm" },
];

const INPUT_METHODS = [
    { key: "camera",  label: "Chụp ảnh hóa đơn",   icon: "photo_camera", desc: "Chụp ảnh để nhập tự động",  highlighted: true  },
    { key: "gallery", label: "Tải ảnh từ thư viện", icon: "image",        desc: "Chọn ảnh đã chụp sẵn",     highlighted: false },
    { key: "manual",  label: "Nhập thủ công",        icon: "edit",         desc: "Điền thông tin bằng tay",  highlighted: false },
];

/* ─── Combined Sheet: chọn loại → chọn phương thức ─── */
function TxSheet({ onClose }: { onClose: () => void }) {
    const navigate = useNavigate();
    const [selectedType, setSelectedType] = useState<TxType | null>(null);

    function handleMethodSelect(key: string) {
        onClose();
        if (key === "manual" && selectedType) {
            navigate(`/add-transaction?type=${selectedType}`);
        }
        // camera / gallery: TODO
    }

    const txOpt = selectedType ? TX_OPTIONS.find((o) => o.type === selectedType)! : null;

    return (
        <>
            <div className="sheet-overlay" onClick={onClose} />
            <div className="sheet">
                <div className="sheet__handle" />

                {/* Header with optional back button */}
                <div className="sheet__title-row">
                    {selectedType && (
                        <button
                            className="sheet__back"
                            onClick={() => setSelectedType(null)}
                            aria-label="Quay lại"
                            type="button"
                        >
                            <Icon name="arrow_back" size={20} />
                        </button>
                    )}
                    <span className="sheet__title">
                        {selectedType ? `Phương thức — ${txOpt!.label}` : "Loại giao dịch"}
                    </span>
                </div>

                <div className="sheet__options">
                    {!selectedType
                        ? TX_OPTIONS.map((opt) => (
                            <button
                                key={opt.type}
                                className={`sheet-option sheet-option--${opt.type}`}
                                onClick={() => setSelectedType(opt.type)}
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
                        : INPUT_METHODS.map((m) => (
                            <button
                                key={m.key}
                                className={`sheet-option${m.highlighted ? " sheet-option--income sheet-option--highlighted" : ""}`}
                                onClick={() => handleMethodSelect(m.key)}
                            >
                                <span className={`sheet-option__icon sheet-option__icon--${m.highlighted ? "income" : m.key === "gallery" ? "investment" : "saving"}`}>
                                    <Icon name={m.icon} size={22} />
                                </span>
                                <span className="sheet-option__body">
                                    <span className="sheet-option__name">{m.label}</span>
                                    <span className="sheet-option__desc">{m.desc}</span>
                                </span>
                                <Icon name="chevron_right" size={18} className="sheet-option__chevron" />
                            </button>
                        ))
                    }
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

    function isActive(path: string) {
        if (path === "/") return pathname === "/";
        return pathname.startsWith(path);
    }

    function closeFab() { setFabOpen(false); }

    return (
        <>
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
                    className={`bottom-nav__item${isActive("/budgets") ? " bottom-nav__item--active" : ""}`}
                    onClick={() => navigate("/budgets")}
                >
                    <Icon name="account_balance_wallet" size={22} filled={isActive("/budgets")} />
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

            {fabOpen && <TxSheet onClose={closeFab} />}
        </>
    );
};
