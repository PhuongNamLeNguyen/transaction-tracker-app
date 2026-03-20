-- =============================================================================
-- seeds/01_categories.sql
-- Domain   : Categories
-- Inserts  : categories (20 rows), category_keywords (~120 rows)
-- Depends  : 004_create_categories.sql
-- Idempotent: INSERT ... ON CONFLICT DO NOTHING — safe to run multiple times.
--
-- Category types map to TransactionType enum:
--   expense    → 10 categories (daily life spending)
--   income     →  3 categories
--   investment →  4 categories
--   saving     →  2 categories
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. CATEGORIES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- expense
-- -----------------------------------------------------------------------------
INSERT INTO categories (id, name, type, icon) VALUES
  ('cat_expense_food',       'Ăn uống',      'expense', 'fork_knife'),
  ('cat_expense_transport',  'Di chuyển',    'expense', 'car'),
  ('cat_expense_living',     'Phí sinh hoạt','expense', 'house'),
  ('cat_expense_education',  'Giáo dục',     'expense', 'book'),
  ('cat_expense_fashion',    'Thời trang',   'expense', 'shirt'),
  ('cat_expense_health',     'Sức khỏe',     'expense', 'heart'),
  ('cat_expense_gift',       'Quà tặng',     'expense', 'gift'),
  ('cat_expense_entertain',  'Giải trí',     'expense', 'smile'),
  ('cat_expense_pet',        'Thú cưng',     'expense', 'paw'),
  ('cat_expense_other',      'Khác',         'expense', 'dots')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- income
-- -----------------------------------------------------------------------------
INSERT INTO categories (id, name, type, icon) VALUES
  ('cat_income_salary',  'Lương',    'income', 'briefcase'),
  ('cat_income_bonus',   'Thưởng',   'income', 'star'),
  ('cat_income_gift',    'Quà tặng', 'income', 'gift')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- investment
-- -----------------------------------------------------------------------------
INSERT INTO categories (id, name, type, icon) VALUES
  ('cat_invest_gold',    'Mua vàng',               'investment', 'gold_bar'),
  ('cat_invest_realty',  'Mua bất động sản',        'investment', 'building'),
  ('cat_invest_stock',   'Mua chứng khoán / cổ phiếu', 'investment', 'chart_up'),
  ('cat_invest_biz',     'Kinh doanh',              'investment', 'store')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- saving
-- -----------------------------------------------------------------------------
INSERT INTO categories (id, name, type, icon) VALUES
  ('cat_saving_deposit',    'Gửi tiết kiệm cá nhân', 'saving', 'piggy_bank'),
  ('cat_saving_insurance',  'Đóng bảo hiểm dài hạn', 'saving', 'shield')
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 2. CATEGORY KEYWORDS
-- Used by the AI pipeline to auto-assign a category from receipt item_name
-- or merchant name. Keywords are lowercase, no diacritics stripped — the AI
-- service normalises text before matching.
-- =============================================================================

-- ── Ăn uống ──────────────────────────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_expense_food', 'ăn uống'),
  ('cat_expense_food', 'nhà hàng'),
  ('cat_expense_food', 'quán ăn'),
  ('cat_expense_food', 'cơm'),
  ('cat_expense_food', 'phở'),
  ('cat_expense_food', 'bún'),
  ('cat_expense_food', 'bánh mì'),
  ('cat_expense_food', 'cafe'),
  ('cat_expense_food', 'cà phê'),
  ('cat_expense_food', 'trà sữa'),
  ('cat_expense_food', 'siêu thị thực phẩm'),
  ('cat_expense_food', 'rau củ'),
  ('cat_expense_food', 'thịt cá'),
  ('cat_expense_food', 'hoa quả'),
  ('cat_expense_food', 'tiệm bánh'),
  ('cat_expense_food', 'pizza'),
  ('cat_expense_food', 'burger'),
  ('cat_expense_food', 'sushi'),
  ('cat_expense_food', 'grab food'),
  ('cat_expense_food', 'shopeefood'),
  ('cat_expense_food', 'baemin'),
  ('cat_expense_food', 'grocery'),
  ('cat_expense_food', 'supermarket'),
  ('cat_expense_food', 'convenience store'),
  ('cat_expense_food', 'family mart'),
  ('cat_expense_food', 'circle k'),
  ('cat_expense_food', 'ministop'),
  ('cat_expense_food', '7-eleven')
ON CONFLICT DO NOTHING;

-- ── Di chuyển ────────────────────────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_expense_transport', 'xăng'),
  ('cat_expense_transport', 'đổ xăng'),
  ('cat_expense_transport', 'petrolimex'),
  ('cat_expense_transport', 'grab'),
  ('cat_expense_transport', 'be'),
  ('cat_expense_transport', 'gojek'),
  ('cat_expense_transport', 'taxi'),
  ('cat_expense_transport', 'uber'),
  ('cat_expense_transport', 'vé tàu'),
  ('cat_expense_transport', 'vé xe buýt'),
  ('cat_expense_transport', 'vé máy bay'),
  ('cat_expense_transport', 'vietnam airlines'),
  ('cat_expense_transport', 'vietjet'),
  ('cat_expense_transport', 'bamboo airways'),
  ('cat_expense_transport', 'giữ xe'),
  ('cat_expense_transport', 'gửi xe'),
  ('cat_expense_transport', 'phí đỗ xe'),
  ('cat_expense_transport', 'cầu đường'),
  ('cat_expense_transport', 'phí cầu'),
  ('cat_expense_transport', 'bảo dưỡng xe'),
  ('cat_expense_transport', 'sửa xe'),
  ('cat_expense_transport', 'rửa xe')
ON CONFLICT DO NOTHING;

-- ── Phí sinh hoạt ────────────────────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_expense_living', 'tiền thuê nhà'),
  ('cat_expense_living', 'tiền trọ'),
  ('cat_expense_living', 'tiền điện'),
  ('cat_expense_living', 'tiền nước'),
  ('cat_expense_living', 'hóa đơn điện'),
  ('cat_expense_living', 'hóa đơn nước'),
  ('cat_expense_living', 'wifi'),
  ('cat_expense_living', 'internet'),
  ('cat_expense_living', 'tiền điện thoại'),
  ('cat_expense_living', 'cước điện thoại'),
  ('cat_expense_living', 'viettel'),
  ('cat_expense_living', 'mobifone'),
  ('cat_expense_living', 'vinaphone'),
  ('cat_expense_living', 'gas'),
  ('cat_expense_living', 'dọn nhà'),
  ('cat_expense_living', 'vệ sinh'),
  ('cat_expense_living', 'đồ gia dụng'),
  ('cat_expense_living', 'điện gia dụng')
ON CONFLICT DO NOTHING;

-- ── Giáo dục ─────────────────────────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_expense_education', 'học phí'),
  ('cat_expense_education', 'khóa học'),
  ('cat_expense_education', 'giáo trình'),
  ('cat_expense_education', 'sách giáo khoa'),
  ('cat_expense_education', 'sách'),
  ('cat_expense_education', 'văn phòng phẩm'),
  ('cat_expense_education', 'bút'),
  ('cat_expense_education', 'vở'),
  ('cat_expense_education', 'gia sư'),
  ('cat_expense_education', 'tiếng anh'),
  ('cat_expense_education', 'ielts'),
  ('cat_expense_education', 'toeic'),
  ('cat_expense_education', 'trung tâm anh ngữ'),
  ('cat_expense_education', 'udemy'),
  ('cat_expense_education', 'coursera')
ON CONFLICT DO NOTHING;

-- ── Thời trang ───────────────────────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_expense_fashion', 'áo'),
  ('cat_expense_fashion', 'quần'),
  ('cat_expense_fashion', 'váy'),
  ('cat_expense_fashion', 'giày'),
  ('cat_expense_fashion', 'dép'),
  ('cat_expense_fashion', 'túi xách'),
  ('cat_expense_fashion', 'trang sức'),
  ('cat_expense_fashion', 'đồng hồ'),
  ('cat_expense_fashion', 'thắt lưng'),
  ('cat_expense_fashion', 'uniqlo'),
  ('cat_expense_fashion', 'zara'),
  ('cat_expense_fashion', 'h&m'),
  ('cat_expense_fashion', 'shopee thời trang'),
  ('cat_expense_fashion', 'lazada thời trang'),
  ('cat_expense_fashion', 'mỹ phẩm'),
  ('cat_expense_fashion', 'nước hoa'),
  ('cat_expense_fashion', 'son'),
  ('cat_expense_fashion', 'kem dưỡng')
ON CONFLICT DO NOTHING;

-- ── Sức khỏe ─────────────────────────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_expense_health', 'khám bệnh'),
  ('cat_expense_health', 'bệnh viện'),
  ('cat_expense_health', 'phòng khám'),
  ('cat_expense_health', 'thuốc'),
  ('cat_expense_health', 'nhà thuốc'),
  ('cat_expense_health', 'thực phẩm chức năng'),
  ('cat_expense_health', 'vitamin'),
  ('cat_expense_health', 'gym'),
  ('cat_expense_health', 'tập gym'),
  ('cat_expense_health', 'vé bơi'),
  ('cat_expense_health', 'bể bơi'),
  ('cat_expense_health', 'yoga'),
  ('cat_expense_health', 'spa'),
  ('cat_expense_health', 'massage'),
  ('cat_expense_health', 'nha sĩ'),
  ('cat_expense_health', 'răng')
ON CONFLICT DO NOTHING;

-- ── Quà tặng (expense) ───────────────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_expense_gift', 'quà'),
  ('cat_expense_gift', 'quà tặng'),
  ('cat_expense_gift', 'tiền mừng cưới'),
  ('cat_expense_gift', 'phong bì'),
  ('cat_expense_gift', 'lì xì'),
  ('cat_expense_gift', 'gửi tiền gia đình'),
  ('cat_expense_gift', 'chuyển tiền cho bố mẹ'),
  ('cat_expense_gift', 'sinh nhật'),
  ('cat_expense_gift', 'hoa'),
  ('cat_expense_gift', 'bó hoa')
ON CONFLICT DO NOTHING;

-- ── Giải trí ─────────────────────────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_expense_entertain', 'cafe bạn bè'),
  ('cat_expense_entertain', 'nhậu'),
  ('cat_expense_entertain', 'bia'),
  ('cat_expense_entertain', 'quán bar'),
  ('cat_expense_entertain', 'xem phim'),
  ('cat_expense_entertain', 'cgv'),
  ('cat_expense_entertain', 'rạp chiếu phim'),
  ('cat_expense_entertain', 'bida'),
  ('cat_expense_entertain', 'game'),
  ('cat_expense_entertain', 'net'),
  ('cat_expense_entertain', 'tất niên'),
  ('cat_expense_entertain', 'liên hoan'),
  ('cat_expense_entertain', 'tiệc'),
  ('cat_expense_entertain', 'du lịch'),
  ('cat_expense_entertain', 'khách sạn'),
  ('cat_expense_entertain', 'resort'),
  ('cat_expense_entertain', 'netflix'),
  ('cat_expense_entertain', 'spotify'),
  ('cat_expense_entertain', 'youtube premium'),
  ('cat_expense_entertain', 'karaoke')
ON CONFLICT DO NOTHING;

-- ── Thú cưng ─────────────────────────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_expense_pet', 'thức ăn chó'),
  ('cat_expense_pet', 'thức ăn mèo'),
  ('cat_expense_pet', 'đồ ăn thú cưng'),
  ('cat_expense_pet', 'thú y'),
  ('cat_expense_pet', 'bác sĩ thú y'),
  ('cat_expense_pet', 'tiêm phòng chó mèo'),
  ('cat_expense_pet', 'cắt tỉa lông'),
  ('cat_expense_pet', 'tắm chó'),
  ('cat_expense_pet', 'đồ chơi thú cưng'),
  ('cat_expense_pet', 'petmart'),
  ('cat_expense_pet', 'petshop')
ON CONFLICT DO NOTHING;

-- ── Khác ─────────────────────────────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_expense_other', 'khác'),
  ('cat_expense_other', 'linh tinh'),
  ('cat_expense_other', 'chi tiêu khác'),
  ('cat_expense_other', 'phí dịch vụ'),
  ('cat_expense_other', 'phí ngân hàng'),
  ('cat_expense_other', 'atm')
ON CONFLICT DO NOTHING;

-- ── Lương ────────────────────────────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_income_salary', 'lương'),
  ('cat_income_salary', 'lương tháng'),
  ('cat_income_salary', 'lương cơ bản'),
  ('cat_income_salary', 'lương thực lĩnh'),
  ('cat_income_salary', 'thu nhập'),
  ('cat_income_salary', 'salary'),
  ('cat_income_salary', 'payroll'),
  ('cat_income_salary', 'freelance'),
  ('cat_income_salary', 'thù lao')
ON CONFLICT DO NOTHING;

-- ── Thưởng ───────────────────────────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_income_bonus', 'thưởng'),
  ('cat_income_bonus', 'thưởng tết'),
  ('cat_income_bonus', 'thưởng kpi'),
  ('cat_income_bonus', 'thưởng doanh số'),
  ('cat_income_bonus', 'bonus'),
  ('cat_income_bonus', 'hoa hồng'),
  ('cat_income_bonus', 'commission')
ON CONFLICT DO NOTHING;

-- ── Quà tặng (income) ────────────────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_income_gift', 'nhận quà'),
  ('cat_income_gift', 'tiền mừng'),
  ('cat_income_gift', 'lì xì nhận'),
  ('cat_income_gift', 'nhận tiền gia đình'),
  ('cat_income_gift', 'bố mẹ cho'),
  ('cat_income_gift', 'được tặng')
ON CONFLICT DO NOTHING;

-- ── Mua vàng ─────────────────────────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_invest_gold', 'mua vàng'),
  ('cat_invest_gold', 'vàng sjc'),
  ('cat_invest_gold', 'vàng nhẫn'),
  ('cat_invest_gold', 'tiệm vàng'),
  ('cat_invest_gold', 'phú nhuận gold'),
  ('cat_invest_gold', 'doji'),
  ('cat_invest_gold', 'pnj vàng')
ON CONFLICT DO NOTHING;

-- ── Mua bất động sản ─────────────────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_invest_realty', 'bất động sản'),
  ('cat_invest_realty', 'mua nhà'),
  ('cat_invest_realty', 'mua đất'),
  ('cat_invest_realty', 'đặt cọc nhà'),
  ('cat_invest_realty', 'trả góp nhà'),
  ('cat_invest_realty', 'tiền đất'),
  ('cat_invest_realty', 'real estate')
ON CONFLICT DO NOTHING;

-- ── Mua chứng khoán / cổ phiếu ───────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_invest_stock', 'chứng khoán'),
  ('cat_invest_stock', 'cổ phiếu'),
  ('cat_invest_stock', 'mua cổ phiếu'),
  ('cat_invest_stock', 'nạp tiền chứng khoán'),
  ('cat_invest_stock', 'vps securities'),
  ('cat_invest_stock', 'ssi'),
  ('cat_invest_stock', 'vcbs'),
  ('cat_invest_stock', 'crypto'),
  ('cat_invest_stock', 'bitcoin'),
  ('cat_invest_stock', 'binance'),
  ('cat_invest_stock', 'stock')
ON CONFLICT DO NOTHING;

-- ── Kinh doanh ───────────────────────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_invest_biz', 'kinh doanh'),
  ('cat_invest_biz', 'vốn kinh doanh'),
  ('cat_invest_biz', 'nhập hàng'),
  ('cat_invest_biz', 'chi phí kinh doanh'),
  ('cat_invest_biz', 'tiền vốn'),
  ('cat_invest_biz', 'mở quán'),
  ('cat_invest_biz', 'thuê mặt bằng kinh doanh')
ON CONFLICT DO NOTHING;

-- ── Gửi tiết kiệm cá nhân ────────────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_saving_deposit', 'tiết kiệm'),
  ('cat_saving_deposit', 'gửi tiết kiệm'),
  ('cat_saving_deposit', 'sổ tiết kiệm'),
  ('cat_saving_deposit', 'nạp ví tiết kiệm'),
  ('cat_saving_deposit', 'tài khoản tiết kiệm'),
  ('cat_saving_deposit', 'saving account'),
  ('cat_saving_deposit', 'momo tiết kiệm'),
  ('cat_saving_deposit', 'vcb tiết kiệm')
ON CONFLICT DO NOTHING;

-- ── Đóng bảo hiểm dài hạn ────────────────────────────────────────────────────
INSERT INTO category_keywords (category_id, keyword) VALUES
  ('cat_saving_insurance', 'bảo hiểm'),
  ('cat_saving_insurance', 'đóng bảo hiểm'),
  ('cat_saving_insurance', 'phí bảo hiểm'),
  ('cat_saving_insurance', 'bảo hiểm nhân thọ'),
  ('cat_saving_insurance', 'prudential'),
  ('cat_saving_insurance', 'manulife'),
  ('cat_saving_insurance', 'dai-ichi'),
  ('cat_saving_insurance', 'aia'),
  ('cat_saving_insurance', 'sun life'),
  ('cat_saving_insurance', 'bảo việt nhân thọ')
ON CONFLICT DO NOTHING;

COMMIT;