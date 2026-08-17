CREATE TABLE inventory_levels (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  variant_id BIGINT REFERENCES product_variants(id) ON DELETE CASCADE NOT NULL,
  location_id BIGINT REFERENCES locations(id) ON DELETE RESTRICT NOT NULL,
  reorder_point NUMERIC(12, 4) DEFAULT 0.0000 NOT NULL,
  average_cost NUMERIC(12, 4) DEFAULT 0.0000 NOT NULL,
  value_in_stock NUMERIC(14, 4) DEFAULT 0.0000 NOT NULL,
  quantity_in_stock NUMERIC(12, 4) DEFAULT 0.0000 NOT NULL,
  quantity_committed NUMERIC(12, 4) DEFAULT 0.0000 NOT NULL,
  quantity_expected NUMERIC(12, 4) DEFAULT 0.0000 NOT NULL,
  quantity_missing_or_excess NUMERIC(12, 4) GENERATED ALWAYS AS (quantity_in_stock - quantity_committed + quantity_expected) STORED,
  quantity_potential NUMERIC(12, 4) GENERATED ALWAYS AS (quantity_in_stock + quantity_expected) STORED,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_variant_location UNIQUE (variant_id, location_id)
);

CREATE TABLE batches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_number TEXT NOT NULL,
  variant_id BIGINT REFERENCES product_variants(id) ON DELETE CASCADE NOT NULL,
  location_id BIGINT REFERENCES locations(id) ON DELETE SET NULL,
  quantity_in_stock NUMERIC(12, 4) DEFAULT 0.0000 NOT NULL,
  expiration_date TIMESTAMPTZ,
  batch_created_date TIMESTAMPTZ DEFAULT NOW(),
  batch_barcode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE stock_adjustments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  location_id BIGINT REFERENCES locations(id) ON DELETE RESTRICT NOT NULL,
  stock_adjustment_number TEXT NOT NULL UNIQUE,
  stock_adjustment_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  reason TEXT,
  additional_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE stock_adjustment_rows (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  stock_adjustment_id BIGINT REFERENCES stock_adjustments(id) ON DELETE CASCADE NOT NULL,
  variant_id BIGINT REFERENCES product_variants(id) ON DELETE RESTRICT NOT NULL,
  quantity NUMERIC(12, 4) NOT NULL,
  cost_per_unit NUMERIC(12, 4),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE stock_adjustment_traceability (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  stock_adjustment_row_id BIGINT REFERENCES stock_adjustment_rows(id) ON DELETE CASCADE NOT NULL,
  batch_id BIGINT REFERENCES batches(id) ON DELETE SET NULL,
  serial_number_id BIGINT,
  bin_location_id BIGINT,
  quantity NUMERIC(12, 4) NOT NULL
);