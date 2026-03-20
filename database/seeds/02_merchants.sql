-- =============================================================================
-- seeds/02_merchants.sql
-- Domain   : Merchants
-- Inserts  : merchants (~25 rows), merchant_aliases (~55 rows)
-- Depends  : 005_create_merchants.sql
--            01_categories.sql  (category IDs referenced in default_category_id)
-- Idempotent: INSERT ... ON CONFLICT DO NOTHING — safe to run multiple times.
--
-- Covers merchants most likely to appear on Vietnamese receipts:
--   F&B chains, convenience stores, ride-hailing, fuel, supermarkets,
--   healthcare, fashion, and telecom top-ups.
-- Merchant IDs use the same stable text-constant pattern as 01_categories.sql.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. MERCHANTS
-- =============================================================================

-- ── F&B ──────────────────────────────────────────────────────────────────────
INSERT INTO merchants (id, name, normalized_name, default_category_id, country) VALUES
  ('mer_starbucks',   'Starbucks',          'starbucks',          'cat_expense_food', 'US'),
  ('mer_highland',    'Highlands Coffee',   'highlands coffee',   'cat_expense_food', 'VN'),
  ('mer_thecoffee',   'The Coffee House',   'the coffee house',   'cat_expense_food', 'VN'),
  ('mer_trungnayen',  'Trung Nguyên Legend','trung nguyen legend','cat_expense_food', 'VN'),
  ('mer_mcdonalds',   'McDonald''s',        'mcdonalds',          'cat_expense_food', 'US'),
  ('mer_kfc',         'KFC',                'kfc',                'cat_expense_food', 'US'),
  ('mer_jollibee',    'Jollibee',           'jollibee',           'cat_expense_food', 'PH'),
  ('mer_gongcha',     'Gong Cha',           'gong cha',           'cat_expense_food', 'TW'),
  ('mer_tocotoco',    'TocoToco',           'tocotoco',           'cat_expense_food', 'VN')
ON CONFLICT (id) DO NOTHING;

-- ── Convenience stores ───────────────────────────────────────────────────────
INSERT INTO merchants (id, name, normalized_name, default_category_id, country) VALUES
  ('mer_circlek',    'Circle K',    'circle k',    'cat_expense_food', 'US'),
  ('mer_familymart', 'FamilyMart',  'familymart',  'cat_expense_food', 'JP'),
  ('mer_ministop',   'Ministop',    'ministop',    'cat_expense_food', 'JP'),
  ('mer_7eleven',    '7-Eleven',    '7-eleven',    'cat_expense_food', 'US')
ON CONFLICT (id) DO NOTHING;

-- ── Supermarkets ─────────────────────────────────────────────────────────────
INSERT INTO merchants (id, name, normalized_name, default_category_id, country) VALUES
  ('mer_winmart',    'WinMart',     'winmart',     'cat_expense_food', 'VN'),
  ('mer_coopmart',   'Co.opmart',   'coopmart',    'cat_expense_food', 'VN'),
  ('mer_bacheho',    'Bách Hoá Xanh','bach hoa xanh','cat_expense_food','VN')
ON CONFLICT (id) DO NOTHING;

-- ── Ride-hailing & transport ─────────────────────────────────────────────────
INSERT INTO merchants (id, name, normalized_name, default_category_id, country) VALUES
  ('mer_grab',       'Grab',        'grab',        'cat_expense_transport', 'SG'),
  ('mer_be',         'Be',          'be',          'cat_expense_transport', 'VN'),
  ('mer_gojek',      'Gojek',       'gojek',       'cat_expense_transport', 'ID'),
  ('mer_petrolimex', 'Petrolimex',  'petrolimex',  'cat_expense_transport', 'VN')
ON CONFLICT (id) DO NOTHING;

-- ── Healthcare & pharmacy ────────────────────────────────────────────────────
INSERT INTO merchants (id, name, normalized_name, default_category_id, country) VALUES
  ('mer_pharmacity', 'Pharmacity',  'pharmacity',  'cat_expense_health', 'VN'),
  ('mer_longchau',   'Long Châu',   'long chau',   'cat_expense_health', 'VN')
ON CONFLICT (id) DO NOTHING;

-- ── Fashion ──────────────────────────────────────────────────────────────────
INSERT INTO merchants (id, name, normalized_name, default_category_id, country) VALUES
  ('mer_uniqlo',     'Uniqlo',      'uniqlo',      'cat_expense_fashion', 'JP'),
  ('mer_zara',       'Zara',        'zara',        'cat_expense_fashion', 'ES')
ON CONFLICT (id) DO NOTHING;

-- ── Telecom top-up ───────────────────────────────────────────────────────────
INSERT INTO merchants (id, name, normalized_name, default_category_id, country) VALUES
  ('mer_viettel',    'Viettel',     'viettel',     'cat_expense_living', 'VN'),
  ('mer_mobifone',   'MobiFone',    'mobifone',    'cat_expense_living', 'VN'),
  ('mer_vinaphone',  'VinaPhone',   'vinaphone',   'cat_expense_living', 'VN')
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 2. MERCHANT ALIASES
-- Common OCR variants and abbreviations for each merchant above.
-- Format: raw strings as they appear on printed receipts or app notifications.
-- =============================================================================

-- ── Starbucks ─────────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_starbucks', 'STARBUCKS'),
  ('mer_starbucks', 'Starbucks Coffee'),
  ('mer_starbucks', 'STARBUCKS COFFEE'),
  ('mer_starbucks', 'SBX')
ON CONFLICT DO NOTHING;

-- ── Highlands Coffee ─────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_highland', 'HIGHLANDS'),
  ('mer_highland', 'Highlands'),
  ('mer_highland', 'HIGHLAND COFFEE'),
  ('mer_highland', 'HighLands Coffee')
ON CONFLICT DO NOTHING;

-- ── The Coffee House ─────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_thecoffee', 'THE COFFEE HOUSE'),
  ('mer_thecoffee', 'Coffee House'),
  ('mer_thecoffee', 'TCH')
ON CONFLICT DO NOTHING;

-- ── Trung Nguyên ─────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_trungnayen', 'Trung Nguyen'),
  ('mer_trungnayen', 'TRUNG NGUYEN LEGEND'),
  ('mer_trungnayen', 'Trung Nguyên')
ON CONFLICT DO NOTHING;

-- ── McDonald's ───────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_mcdonalds', 'MCDONALD''S'),
  ('mer_mcdonalds', 'McDonalds'),
  ('mer_mcdonalds', 'MC DONALD'),
  ('mer_mcdonalds', 'MCD')
ON CONFLICT DO NOTHING;

-- ── KFC ──────────────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_kfc', 'KFC VIETNAM'),
  ('mer_kfc', 'KFC Viet Nam'),
  ('mer_kfc', 'GA RAN KFC')
ON CONFLICT DO NOTHING;

-- ── Circle K ─────────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_circlek', 'CIRCLE K'),
  ('mer_circlek', 'CircleK'),
  ('mer_circlek', 'CK STORE')
ON CONFLICT DO NOTHING;

-- ── FamilyMart ───────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_familymart', 'FAMILY MART'),
  ('mer_familymart', 'Family Mart'),
  ('mer_familymart', 'FM')
ON CONFLICT DO NOTHING;

-- ── Ministop ─────────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_ministop', 'MINISTOP'),
  ('mer_ministop', 'Mini Stop')
ON CONFLICT DO NOTHING;

-- ── 7-Eleven ─────────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_7eleven', '7 ELEVEN'),
  ('mer_7eleven', '7ELEVEN'),
  ('mer_7eleven', 'Seven Eleven')
ON CONFLICT DO NOTHING;

-- ── WinMart ──────────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_winmart', 'WIN MART'),
  ('mer_winmart', 'Winmart+'),
  ('mer_winmart', 'WINMART+'),
  ('mer_winmart', 'VinMart'),
  ('mer_winmart', 'VINMART')
ON CONFLICT DO NOTHING;

-- ── Co.opmart ────────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_coopmart', 'CO.OPMART'),
  ('mer_coopmart', 'Coop Mart'),
  ('mer_coopmart', 'COOPMART')
ON CONFLICT DO NOTHING;

-- ── Bách Hoá Xanh ────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_bacheho', 'BACH HOA XANH'),
  ('mer_bacheho', 'Bách Hoá Xanh'),
  ('mer_bacheho', 'BHX')
ON CONFLICT DO NOTHING;

-- ── Grab ─────────────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_grab', 'GRAB'),
  ('mer_grab', 'GrabCar'),
  ('mer_grab', 'GrabBike'),
  ('mer_grab', 'GRAB VIETNAM'),
  ('mer_grab', 'Grab Food'),
  ('mer_grab', 'GRAB-')
ON CONFLICT DO NOTHING;

-- ── Be ───────────────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_be', 'BE GROUP'),
  ('mer_be', 'beBike'),
  ('mer_be', 'beCar')
ON CONFLICT DO NOTHING;

-- ── Gojek ────────────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_gojek', 'GOJEK'),
  ('mer_gojek', 'GoViet'),
  ('mer_gojek', 'GO-VIET')
ON CONFLICT DO NOTHING;

-- ── Petrolimex ───────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_petrolimex', 'PETROLIMEX'),
  ('mer_petrolimex', 'Xăng Petrolimex'),
  ('mer_petrolimex', 'PLX'),
  ('mer_petrolimex', 'CUA HANG XANG DAU')
ON CONFLICT DO NOTHING;

-- ── Pharmacity ───────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_pharmacity', 'PHARMACITY'),
  ('mer_pharmacity', 'Nha Thuoc Pharmacity')
ON CONFLICT DO NOTHING;

-- ── Long Châu ────────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_longchau', 'LONG CHAU'),
  ('mer_longchau', 'Nhà Thuốc Long Châu'),
  ('mer_longchau', 'NHA THUOC LONG CHAU'),
  ('mer_longchau', 'FPT Long Chau')
ON CONFLICT DO NOTHING;

-- ── Uniqlo ───────────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_uniqlo', 'UNIQLO'),
  ('mer_uniqlo', 'Uniqlo Vietnam')
ON CONFLICT DO NOTHING;

-- ── Viettel ──────────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_viettel', 'VIETTEL'),
  ('mer_viettel', 'Nap Tien Viettel'),
  ('mer_viettel', 'VIETTEL TELECOM')
ON CONFLICT DO NOTHING;

-- ── MobiFone ─────────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_mobifone', 'MOBIFONE'),
  ('mer_mobifone', 'Nap Tien Mobifone'),
  ('mer_mobifone', 'MBF')
ON CONFLICT DO NOTHING;

-- ── VinaPhone ────────────────────────────────────────────────────────────────
INSERT INTO merchant_aliases (merchant_id, alias_name) VALUES
  ('mer_vinaphone', 'VINAPHONE'),
  ('mer_vinaphone', 'Nap Tien Vinaphone'),
  ('mer_vinaphone', 'VNPT VinaPhone')
ON CONFLICT DO NOTHING;

COMMIT;