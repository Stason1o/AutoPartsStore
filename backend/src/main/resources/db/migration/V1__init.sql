CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  markup_percent NUMERIC(6,2),
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  brand TEXT,
  description TEXT,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  purchase_price NUMERIC(12,2),
  purchase_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  markup_percent NUMERIC(6,2),
  retail_price NUMERIC(12,2),
  retail_price_manual BOOLEAN NOT NULL DEFAULT FALSE,
  wholesale_price NUMERIC(12,2),
  stock_qty INT NOT NULL DEFAULT 0,
  reserved_qty INT NOT NULL DEFAULT 0,
  shelf TEXT,
  admin_note TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_sku_trgm ON products USING gin (sku gin_trgm_ops);
CREATE INDEX idx_products_category ON products(category_id);

CREATE TABLE product_oem_numbers (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  oem_number TEXT NOT NULL,
  normalized TEXT NOT NULL
);
CREATE INDEX idx_oem_normalized ON product_oem_numbers(normalized);
CREATE INDEX idx_oem_product ON product_oem_numbers(product_id);

CREATE TABLE product_photos (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  data BYTEA NOT NULL,
  thumbnail BYTEA NOT NULL,
  content_type TEXT NOT NULL,
  is_main BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  size_bytes INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_photos_product ON product_photos(product_id);

CREATE TABLE vehicles (
  id BIGSERIAL PRIMARY KEY,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year_from INT,
  year_to INT,
  engine TEXT,
  CONSTRAINT uq_vehicle UNIQUE NULLS NOT DISTINCT (make, model, year_from, year_to, engine)
);

CREATE TABLE product_vehicles (
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  auto_matched BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (product_id, vehicle_id)
);
CREATE INDEX idx_pv_vehicle ON product_vehicles(vehicle_id);

CREATE TABLE exchange_rates (
  id BIGSERIAL PRIMARY KEY,
  currency VARCHAR(3) NOT NULL,
  rate NUMERIC(12,6) NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('BANK','MANUAL')),
  rate_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rates_lookup ON exchange_rates(currency, rate_date DESC, created_at DESC);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN
    ('NEW','CONFIRMED','ASSEMBLING','DELIVERING','READY_FOR_PICKUP','DONE','CANCELLED')),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('COURIER','PICKUP')),
  payment_method TEXT NOT NULL CHECK (payment_method IN
    ('CASH_COURIER','CARD_PICKUP','CASH_PICKUP')),
  comment TEXT,
  wholesale BOOLEAN NOT NULL DEFAULT FALSE,
  discount_percent NUMERIC(5,2),
  discount_amount NUMERIC(12,2),
  delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  items_total NUMERIC(12,2) NOT NULL,
  grand_total NUMERIC(12,2) NOT NULL,
  cancel_reason TEXT,
  viewed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  qty INT NOT NULL CHECK (qty > 0),
  retail_price NUMERIC(12,2) NOT NULL,
  wholesale_price NUMERIC(12,2),
  applied_price NUMERIC(12,2) NOT NULL
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TABLE vin_cache (
  vin VARCHAR(17) PRIMARY KEY,
  make TEXT,
  model TEXT,
  model_year INT,
  raw_response JSONB,
  decoded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wmi_codes (
  wmi VARCHAR(6) PRIMARY KEY,
  make TEXT NOT NULL
);

CREATE TABLE snapshots (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('SCHEDULED','MANUAL')),
  product_count INT NOT NULL,
  csv_data BYTEA NOT NULL,
  xlsx_data BYTEA NOT NULL
);

CREATE TABLE admin_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB
);
