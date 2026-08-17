CREATE TABLE products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  uom VARCHAR(7) DEFAULT 'pcs' NOT NULL,
  category_name TEXT,
  default_supplier_id BIGINT,
  additional_info TEXT,
  type TEXT CHECK (type IN ('product', 'material')) DEFAULT 'product' NOT NULL,
  purchase_uom VARCHAR(7),
  purchase_uom_conversion_rate NUMERIC(12, 4),
  is_sellable BOOLEAN DEFAULT TRUE NOT NULL,
  is_purchasable BOOLEAN DEFAULT TRUE NOT NULL,
  is_producible BOOLEAN DEFAULT FALSE NOT NULL,
  is_auto_assembly BOOLEAN DEFAULT FALSE NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  batch_tracked BOOLEAN DEFAULT FALSE NOT NULL,
  serial_tracked BOOLEAN DEFAULT FALSE NOT NULL,
  operations_in_sequence BOOLEAN DEFAULT FALSE NOT NULL,
  custom_field_collection_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE product_configs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  values TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE product_variants (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('product', 'material')) DEFAULT 'product' NOT NULL,
  sku TEXT UNIQUE,
  sales_price NUMERIC(12, 2) DEFAULT 0.00,
  purchase_price NUMERIC(12, 2) DEFAULT 0.00,
  material_id BIGINT,
  internal_barcode TEXT,
  registered_barcode TEXT,
  supplier_item_codes TEXT[] DEFAULT '{}'::TEXT[],
  lead_time INTEGER,
  minimum_order_quantity NUMERIC(12, 4),
  abc_classification VARCHAR(1) CHECK (abc_classification IN ('A', 'B', 'C')),
  config_attributes JSONB DEFAULT '[]'::JSONB NOT NULL,
  custom_fields JSONB DEFAULT '[]'::JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);