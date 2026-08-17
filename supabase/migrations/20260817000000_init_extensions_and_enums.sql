CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE katana_sales_order_status AS ENUM (
  'NOT_SHIPPED',
  'PARTIALLY_PACKED',
  'PARTIALLY_DELIVERED',
  'PACKED',
  'DELIVERED',
  'PENDING',
  'CANCELLED'
);

CREATE TYPE katana_product_availability AS ENUM (
  'IN_STOCK',
  'EXPECTED',
  'PICKED',
  'NOT_AVAILABLE',
  'NOT_APPLICABLE'
);

CREATE TYPE katana_ingredient_availability AS ENUM (
  'PROCESSED',
  'IN_STOCK',
  'NOT_AVAILABLE',
  'EXPECTED',
  'NO_RECIPE',
  'NOT_APPLICABLE'
);

CREATE TYPE katana_production_status AS ENUM (
  'NOT_STARTED',
  'NONE',
  'NOT_APPLICABLE',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE'
);

CREATE TYPE katana_mo_status AS ENUM (
  'NOT_STARTED',
  'BLOCKED',
  'IN_PROGRESS',
  'DONE'
);

CREATE TYPE katana_po_status AS ENUM (
  'NOT_RECEIVED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED'
);