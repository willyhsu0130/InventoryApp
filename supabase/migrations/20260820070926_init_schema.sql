-- ==========================================
-- 1. INDEPENDENT / ROOT TABLES
-- ==========================================

CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    line1 VARCHAR(255) NOT NULL,
    line2 VARCHAR(255),
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    line1 VARCHAR(255) NOT NULL,
    line2 VARCHAR(255),
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    company VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    uom VARCHAR(50) NOT NULL,
    batch_tracked BOOLEAN DEFAULT false NOT NULL,
   configs JSONB DEFAULT '[]' NOT NULL,
    is_archived BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. DEPENDENT CORE & SCOREBOARD TABLES
-- ==========================================

CREATE TABLE variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(255) UNIQUE,
    sales_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    configs JSONB DEFAULT '[]' NOT NULL,
    is_archived BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE batches (
    id SERIAL PRIMARY KEY,
    variant_id INTEGER REFERENCES variants(id) ON DELETE CASCADE,
    batch_number VARCHAR(255) UNIQUE NOT NULL,
    quantity INTEGER DEFAULT 0 NOT NULL,
    expired_at DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_levels (
    id SERIAL PRIMARY KEY,
    variant_id INTEGER REFERENCES variants(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(variant_id, location_id)
);

-- ==========================================
-- 3. ORDERS & TRANSACTIONS
-- ==========================================

CREATE TABLE sales_orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT,
    location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
    sales_order_status VARCHAR(50) DEFAULT 'PENDING' CHECK (sales_order_status IN ('PENDING', 'COMPLETED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sales_order_items (
    id SERIAL PRIMARY KEY,
    sales_order_id INTEGER REFERENCES sales_orders(id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES variants(id) ON DELETE RESTRICT,
    batch_id INTEGER REFERENCES batches(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_per_unit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_movements (
    id SERIAL PRIMARY KEY,
    variant_id INTEGER REFERENCES variants(id) ON DELETE RESTRICT,
    location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
    batch_id INTEGER REFERENCES batches(id) ON DELETE RESTRICT,
    quantity_adjusted INTEGER NOT NULL CHECK (quantity_adjusted != 0),
    reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN ('MANUFACTURE', 'SALES', 'ADJUSTMENT')),
    reference_id VARCHAR(255) NOT NULL,
    adjusted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. FUNCTIONS & TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION update_inventory_scoreboards()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Update location inventory levels (Upsert)
    INSERT INTO inventory_levels (variant_id, location_id, quantity, updated_at)
    VALUES (NEW.variant_id, NEW.location_id, NEW.quantity_adjusted, NOW())
    ON CONFLICT (variant_id, location_id)
    DO UPDATE SET 
        quantity = inventory_levels.quantity + NEW.quantity_adjusted,
        updated_at = NOW();

    -- 2. Update batch stock if batch_id is present
    IF NEW.batch_id IS NOT NULL THEN
        UPDATE batches
        SET quantity = batches.quantity + NEW.quantity_adjusted
        WHERE id = NEW.batch_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_scoreboards
AFTER INSERT ON inventory_movements
FOR EACH ROW
EXECUTE FUNCTION update_inventory_scoreboards();

CREATE OR REPLACE FUNCTION archive_variant_and_clear_stock(
    target_variant_id INTEGER,
    reason_note TEXT DEFAULT 'Product Archived / Scrapped'
)
RETURNS VOID AS $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Zero out every active batch for this variant
    FOR r IN 
        SELECT b.id AS batch_id, b.quantity, il.location_id
        FROM batches b
        LEFT JOIN inventory_levels il ON il.variant_id = b.variant_id
        WHERE b.variant_id = target_variant_id AND b.quantity > 0
    LOOP
        INSERT INTO inventory_movements (
            variant_id,
            location_id,
            batch_id,
            quantity_adjusted,
            reference_type,
            reference_id
        ) VALUES (
            target_variant_id,
            COALESCE(r.location_id, 1),
            r.batch_id,
            -r.quantity,
            'ADJUSTMENT',
            reason_note
        );
    END LOOP;

    -- 2. Zero out any non-batched remaining stock
    FOR r IN 
        SELECT location_id, quantity
        FROM inventory_levels
        WHERE variant_id = target_variant_id AND quantity > 0
    LOOP
        INSERT INTO inventory_movements (
            variant_id,
            location_id,
            batch_id,
            quantity_adjusted,
            reference_type,
            reference_id
        ) VALUES (
            target_variant_id,
            r.location_id,
            NULL,
            -r.quantity,
            'ADJUSTMENT',
            reason_note
        );
    END LOOP;

    -- 3. Mark variant as archived
    UPDATE variants
    SET is_archived = true
    WHERE id = target_variant_id;

END;
$$ LANGUAGE plpgsql;