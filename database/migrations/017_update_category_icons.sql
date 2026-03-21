-- =============================================================================
-- migration 017 — fix category icons to valid Material Symbols Rounded names
-- =============================================================================

BEGIN;

-- expense
UPDATE categories SET icon = 'restaurant'        WHERE name = 'Ăn uống'                     AND type = 'expense';
UPDATE categories SET icon = 'directions_car'    WHERE name = 'Di chuyển'                   AND type = 'expense';
UPDATE categories SET icon = 'home'              WHERE name = 'Phí sinh hoạt'               AND type = 'expense';
UPDATE categories SET icon = 'school'            WHERE name = 'Giáo dục'                    AND type = 'expense';
UPDATE categories SET icon = 'checkroom'         WHERE name = 'Thời trang'                  AND type = 'expense';
UPDATE categories SET icon = 'health_and_safety' WHERE name = 'Sức khỏe'                    AND type = 'expense';
UPDATE categories SET icon = 'card_giftcard'     WHERE name = 'Quà tặng'                    AND type = 'expense';
UPDATE categories SET icon = 'celebration'       WHERE name = 'Giải trí'                    AND type = 'expense';
UPDATE categories SET icon = 'pets'              WHERE name = 'Thú cưng'                    AND type = 'expense';
UPDATE categories SET icon = 'category'          WHERE name = 'Khác'                        AND type = 'expense';

-- income
UPDATE categories SET icon = 'work'              WHERE name = 'Lương'                       AND type = 'income';
UPDATE categories SET icon = 'star'              WHERE name = 'Thưởng'                      AND type = 'income';
UPDATE categories SET icon = 'card_giftcard'     WHERE name = 'Quà tặng'                    AND type = 'income';

-- investment
UPDATE categories SET icon = 'diamond'           WHERE name = 'Mua vàng'                    AND type = 'investment';
UPDATE categories SET icon = 'apartment'         WHERE name = 'Mua bất động sản'            AND type = 'investment';
UPDATE categories SET icon = 'show_chart'        WHERE name = 'Mua chứng khoán / cổ phiếu' AND type = 'investment';
UPDATE categories SET icon = 'store'             WHERE name = 'Kinh doanh'                  AND type = 'investment';

-- saving
UPDATE categories SET icon = 'savings'           WHERE name = 'Gửi tiết kiệm cá nhân'       AND type = 'saving';
UPDATE categories SET icon = 'shield'            WHERE name = 'Đóng bảo hiểm dài hạn'       AND type = 'saving';

COMMIT;
