CREATE TABLE customers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  currency VARCHAR(3) DEFAULT 'USD',
  reference_id TEXT,
  category TEXT,
  comment TEXT,
  discount_rate NUMERIC(5, 2) DEFAULT 0.00,
  default_billing_id BIGINT,
  default_shipping_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE customer_addresses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('billing', 'shipping')) NOT NULL,
  "default" BOOLEAN DEFAULT FALSE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  phone TEXT,
  line_1 TEXT,
  line_2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);