-- Hibernate генерирует lower(name) LIKE '%…%' — старые trgm-индексы по name/sku не используются.
DROP INDEX IF EXISTS idx_products_name_trgm;
DROP INDEX IF EXISTS idx_products_sku_trgm;
CREATE INDEX idx_products_name_lower_trgm ON products USING gin (lower(name) gin_trgm_ops);
CREATE INDEX idx_products_sku_lower_trgm  ON products USING gin (lower(sku)  gin_trgm_ops);

-- Поиск по OEM идёт подстрокой (LIKE '%X%') — b-tree idx_oem_normalized такое не умеет.
CREATE INDEX idx_oem_normalized_trgm ON product_oem_numbers USING gin (normalized gin_trgm_ops);

-- Кандидаты VIN-декодера: LOWER(make) = LOWER(:make).
CREATE INDEX idx_vehicles_make_lower ON vehicles (lower(make));
