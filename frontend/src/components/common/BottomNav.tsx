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

/* ─── Sheet 1: chọn loại giao dịch ─── */
function Sheet1({ onClose, onSelect }: { onClose: () => void; onSelect: (t: TxType) => void }) {
    return (
        <>
            <div className="sheet-overlay" onClick={onClose} />
            <div className="sheet">
                <div className="sheet__handle" />
                <div className="sheet__title">Loại giao dịch</div>
                <div className="sheet__options">
                    {TX_OPTIONS.map((opt) => (
                        <button
                            key={opt.type}
                            className={`sheet-option sheet-option--${opt.type}`}
                            onClick={() => onSelect(opt.type)}
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
                    ))}
                </div>
            </div>
        </>
    );
}

/* ─── Sheet 2: chọn phương thức nhập ─── */
function Sheet2({ txType, onClose }: { txType: TxType; onClose: () => void }) {
    const navigate = useNavigate();
    const opt = TX_OPTIONS.find((o) => o.type === txType)!;

    function handleSelect(key: string) {
        onClose();
        if (key === "manual") {
            navigate(`/add-transaction?type=${txType}`);
        }
        // camera / gallery: TODO
    }

    return (
        <>
            <div className="sheet-overlay" onClick={onClose} />
            <div className="sheet">
                <div className="sheet__handle" />
                <div className="sheet__title">Phương thức — {opt.label}</div>
                <div className="sheet__options">
                    {INPUT_METHODS.map((m) => (
                        <button
                            key={m.key}
                            className={`sheet-option${m.highlighted ? " sheet-option--income sheet-option--highlighted" : ""}`}
                            onClick={() => handleSelect(m.key)}
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
                    ))}
                </div>
            </div>
        </>
    );
}

/* ─── Shared Bottom Nav ─── */
export const BottomNav = () => {
    const navigate      = useNavigate();
    const { pathname }  = useLocation();
    const [fabOpen, setFabOpen]             = useState(false);
    const [selectedTxType, setSelectedTxType] = useState<TxType | null>(null);

    function isActive(path: string) {
        if (path === "/") return pathname === "/";
        return pathname.startsWith(path);
    }

    function closeFab() { setFabOpen(false); setSelectedTxType(null); }

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

            {fabOpen && !selectedTxType && (
                <Sheet1 onClose={closeFab} onSelect={(t) => setSelectedTxType(t)} />
            )}
            {fabOpen && selectedTxType && (
                <Sheet2 txType={selectedTxType} onClose={closeFab} />
            )}
        </>
    );
};
