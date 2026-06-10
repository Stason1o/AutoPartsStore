-- Фото категории (для плитки на главной витрины), хранится в БД как и фото товаров
ALTER TABLE categories ADD COLUMN image BYTEA;
ALTER TABLE categories ADD COLUMN image_content_type TEXT;
