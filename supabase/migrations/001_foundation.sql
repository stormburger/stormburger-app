-- StormBurger Foundation Schema
-- Multi-location restaurant ordering platform

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE order_status AS ENUM (
    'pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'cancelled'
);

CREATE TYPE payment_status AS ENUM (
    'pending', 'authorized', 'captured', 'failed', 'refunded'
);

CREATE TYPE item_category AS ENUM (
    'burgers', 'chicken', 'sides', 'drinks', 'combos', 'desserts'
);

CREATE TYPE modifier_type AS ENUM ('single', 'multiple');

CREATE TYPE user_role AS ENUM ('customer', 'staff', 'manager', 'admin');

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================

CREATE TABLE users (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT,
    phone       TEXT,
    display_name TEXT NOT NULL,
    role        user_role NOT NULL DEFAULT 'customer',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LOCATIONS
-- ============================================================

CREATE TABLE locations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    address             TEXT NOT NULL,
    city                TEXT NOT NULL,
    state               TEXT NOT NULL DEFAULT 'CA',
    zip                 TEXT NOT NULL,
    lat                 DOUBLE PRECISION NOT NULL,
    lng                 DOUBLE PRECISION NOT NULL,
    phone               TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_accepting_orders BOOLEAN NOT NULL DEFAULT TRUE,
    timezone            TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE location_hours (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time   TIME NOT NULL,
    close_time  TIME NOT NULL,
    is_closed   BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (location_id, day_of_week)
);

-- ============================================================
-- MENU
-- ============================================================

CREATE TABLE menu_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category    item_category NOT NULL,
    base_price  INTEGER NOT NULL,  -- cents
    image_url   TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-location menu availability and price overrides
CREATE TABLE location_menu_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id     UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    menu_item_id    UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    price_override  INTEGER,          -- cents, null = use base_price
    is_available    BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (location_id, menu_item_id)
);

-- ============================================================
-- MODIFIERS (toppings, sizes, extras)
-- ============================================================

CREATE TABLE modifier_groups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    type            modifier_type NOT NULL DEFAULT 'multiple',
    is_required     BOOLEAN NOT NULL DEFAULT FALSE,
    min_selections  SMALLINT NOT NULL DEFAULT 0,
    max_selections  SMALLINT NOT NULL DEFAULT 10,
    sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE modifiers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    price_adjustment INTEGER NOT NULL DEFAULT 0,  -- cents
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INTEGER NOT NULL DEFAULT 0
);

-- Link menu items to modifier groups
CREATE TABLE menu_item_modifier_groups (
    menu_item_id      UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (menu_item_id, modifier_group_id)
);

-- ============================================================
-- ORDERS
-- ============================================================

CREATE TABLE orders (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number          TEXT NOT NULL UNIQUE,
    user_id               UUID NOT NULL REFERENCES users(id),
    location_id           UUID NOT NULL REFERENCES locations(id),
    status                order_status NOT NULL DEFAULT 'pending',
    subtotal              INTEGER NOT NULL,  -- cents
    tax                   INTEGER NOT NULL,  -- cents
    total                 INTEGER NOT NULL,  -- cents
    estimated_pickup_at   TIMESTAMPTZ,
    special_instructions  TEXT,
    idempotency_key       TEXT NOT NULL UNIQUE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id              UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id          UUID NOT NULL REFERENCES menu_items(id),
    quantity              SMALLINT NOT NULL DEFAULT 1,
    unit_price            INTEGER NOT NULL,  -- cents
    total_price           INTEGER NOT NULL,  -- cents
    special_instructions  TEXT,
    menu_item_name        TEXT NOT NULL  -- denormalized
);

CREATE TABLE order_item_modifiers (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id     UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    modifier_id       UUID NOT NULL REFERENCES modifiers(id),
    modifier_name     TEXT NOT NULL,       -- denormalized
    price_adjustment  INTEGER NOT NULL     -- cents
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                  UUID NOT NULL REFERENCES orders(id),
    stripe_payment_intent_id  TEXT NOT NULL UNIQUE,
    amount                    INTEGER NOT NULL,  -- cents
    status                    payment_status NOT NULL DEFAULT 'pending',
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_location ON orders(location_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_location_menu_items_location ON location_menu_items(location_id);
CREATE INDEX idx_payments_order ON payments(order_id);

-- ============================================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Public read for menu/locations (anyone can browse)
CREATE POLICY "public_read_locations" ON locations FOR SELECT USING (TRUE);
CREATE POLICY "public_read_location_hours" ON location_hours FOR SELECT USING (TRUE);
CREATE POLICY "public_read_menu_items" ON menu_items FOR SELECT USING (is_active = TRUE);
CREATE POLICY "public_read_location_menu" ON location_menu_items FOR SELECT USING (TRUE);
CREATE POLICY "public_read_modifier_groups" ON modifier_groups FOR SELECT USING (TRUE);
CREATE POLICY "public_read_modifiers" ON modifiers FOR SELECT USING (is_active = TRUE);
CREATE POLICY "public_read_item_modifier_groups" ON menu_item_modifier_groups FOR SELECT USING (TRUE);

-- Users can read their own profile
CREATE POLICY "users_read_own" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (id = auth.uid());

-- Staff/admin can read all users
CREATE POLICY "staff_read_users" ON users FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('staff', 'manager', 'admin'))
);

-- Orders: customers see their own, staff see all at their location
CREATE POLICY "customers_read_own_orders" ON orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "staff_read_orders" ON orders FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('staff', 'manager', 'admin'))
);
CREATE POLICY "customers_read_own_order_items" ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
);
CREATE POLICY "staff_read_order_items" ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('staff', 'manager', 'admin'))
);
CREATE POLICY "customers_read_own_order_modifiers" ON order_item_modifiers FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.id = order_item_modifiers.order_item_id AND o.user_id = auth.uid()
    )
);
CREATE POLICY "staff_read_order_modifiers" ON order_item_modifiers FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('staff', 'manager', 'admin'))
);

-- Payments: customers see their own
CREATE POLICY "customers_read_own_payments" ON payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = payments.order_id AND o.user_id = auth.uid())
);

-- Admin full access for management
CREATE POLICY "admin_all_locations" ON locations FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY "admin_all_location_hours" ON location_hours FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY "admin_all_menu_items" ON menu_items FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY "admin_all_location_menu" ON location_menu_items FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY "admin_all_modifier_groups" ON modifier_groups FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY "admin_all_modifiers" ON modifiers FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY "admin_all_orders" ON orders FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- ============================================================
-- REALTIME (for kitchen order feed)
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- ============================================================
-- SEED: StormBurger Locations
-- ============================================================

INSERT INTO locations (name, address, city, state, zip, lat, lng, phone) VALUES
    ('StormBurger Inglewood', '1500 N La Brea Ave', 'Inglewood', 'CA', '90302', 33.9617, -118.3440, NULL),
    ('StormBurger Long Beach', '5801 Cherry Ave', 'Long Beach', 'CA', '90805', 33.8658, -118.1852, NULL);

-- Hours: Mon-Sun 10:30 AM - 10:00 PM for both locations
DO $$
DECLARE
    loc RECORD;
    d INTEGER;
BEGIN
    FOR loc IN SELECT id FROM locations LOOP
        FOR d IN 0..6 LOOP
            INSERT INTO location_hours (location_id, day_of_week, open_time, close_time)
            VALUES (loc.id, d, '10:30', '22:00');
        END LOOP;
    END LOOP;
END $$;

-- ============================================================
-- SEED: Menu Items
-- ============================================================

INSERT INTO menu_items (name, description, category, base_price, sort_order) VALUES
    -- Burgers
    ('Classic StormBurger', 'Our signature burger with fresh lettuce, tomato, onion, and Storm sauce', 'burgers', 899, 1),
    ('Double Classic StormBurger', 'Double patty with all the classic fixings', 'burgers', 1199, 2),
    ('Bacon BBQ Burger', 'Crispy bacon, BBQ sauce, cheddar cheese, onion rings', 'burgers', 1099, 3),
    ('Jalapeño Lightning Burger', 'Pepper jack, fresh jalapeños, spicy mayo', 'burgers', 1099, 4),
    -- Chicken
    ('Chicken Sandwich', 'Crispy chicken breast with pickles and mayo', 'chicken', 899, 10),
    ('Spicy Chicken Sandwich', 'Crispy chicken with spicy seasoning and jalapeño mayo', 'chicken', 949, 11),
    ('Deluxe Chicken Sandwich', 'Crispy chicken with lettuce, tomato, and special sauce', 'chicken', 999, 12),
    ('Spicy Deluxe Chicken Sandwich', 'Spicy crispy chicken loaded with all the fixings', 'chicken', 1049, 13),
    ('Chicken Strips', '4 crispy chicken tenders with your choice of sauce', 'chicken', 799, 14),
    -- Combos
    ('Classic StormBurger Combo', 'Classic StormBurger with fries and a drink', 'combos', 1299, 20),
    ('Double Classic Combo', 'Double Classic with fries and a drink', 'combos', 1599, 21),
    ('Bacon BBQ Combo', 'Bacon BBQ Burger with fries and a drink', 'combos', 1499, 22),
    ('Jalapeño Lightning Combo', 'Jalapeño Lightning Burger with fries and a drink', 'combos', 1499, 23),
    ('Chicken Sandwich Combo', 'Chicken Sandwich with fries and a drink', 'combos', 1299, 24),
    ('Spicy Chicken Combo', 'Spicy Chicken Sandwich with fries and a drink', 'combos', 1349, 25),
    ('Deluxe Chicken Combo', 'Deluxe Chicken Sandwich with fries and a drink', 'combos', 1399, 26),
    ('Spicy Deluxe Chicken Combo', 'Spicy Deluxe Chicken Sandwich with fries and a drink', 'combos', 1449, 27),
    ('Chicken Strips Combo', 'Chicken Strips with fries and a drink', 'combos', 1199, 28),
    -- Sides
    ('Storm Fries', 'Crispy seasoned fries', 'sides', 399, 30),
    ('Onion Rings', 'Beer-battered onion rings', 'sides', 449, 31),
    -- Drinks
    ('Fountain Drink', 'Choose from Coke, Sprite, Fanta, Lemonade', 'drinks', 249, 40),
    ('Bottled Water', 'Purified water', 'drinks', 199, 41);

-- Link all menu items to both locations
INSERT INTO location_menu_items (location_id, menu_item_id)
SELECT l.id, m.id FROM locations l CROSS JOIN menu_items m;

-- ============================================================
-- SEED: Modifier Groups
-- ============================================================

INSERT INTO modifier_groups (name, type, is_required, min_selections, max_selections, sort_order) VALUES
    ('Burger Toppings', 'multiple', FALSE, 0, 10, 1),
    ('Cheese', 'single', FALSE, 0, 1, 2),
    ('Drink Choice', 'single', TRUE, 1, 1, 3),
    ('Sauce', 'multiple', FALSE, 0, 3, 4);

-- Modifiers
INSERT INTO modifiers (group_id, name, price_adjustment, is_default, sort_order)
SELECT mg.id, m.name, m.price, m.is_default, m.sort_order
FROM modifier_groups mg
CROSS JOIN LATERAL (VALUES
    -- Burger Toppings
    ('Burger Toppings', 'Extra Patty', 300, FALSE, 1),
    ('Burger Toppings', 'Bacon', 150, FALSE, 2),
    ('Burger Toppings', 'Avocado', 150, FALSE, 3),
    ('Burger Toppings', 'Extra Cheese', 100, FALSE, 4),
    ('Burger Toppings', 'No Onion', 0, FALSE, 5),
    ('Burger Toppings', 'No Tomato', 0, FALSE, 6),
    ('Burger Toppings', 'No Lettuce', 0, FALSE, 7),
    -- Cheese
    ('Cheese', 'American', 0, TRUE, 1),
    ('Cheese', 'Cheddar', 0, FALSE, 2),
    ('Cheese', 'Pepper Jack', 0, FALSE, 3),
    ('Cheese', 'Swiss', 0, FALSE, 4),
    ('Cheese', 'No Cheese', 0, FALSE, 5),
    -- Drink Choice
    ('Drink Choice', 'Coca-Cola', 0, TRUE, 1),
    ('Drink Choice', 'Sprite', 0, FALSE, 2),
    ('Drink Choice', 'Fanta Orange', 0, FALSE, 3),
    ('Drink Choice', 'Lemonade', 0, FALSE, 4),
    ('Drink Choice', 'Dr Pepper', 0, FALSE, 5),
    -- Sauce
    ('Sauce', 'Storm Sauce', 0, FALSE, 1),
    ('Sauce', 'Ranch', 0, FALSE, 2),
    ('Sauce', 'BBQ', 0, FALSE, 3),
    ('Sauce', 'Hot Sauce', 0, FALSE, 4),
    ('Sauce', 'Honey Mustard', 0, FALSE, 5)
) AS m(group_name, name, price, is_default, sort_order)
WHERE mg.name = m.group_name;

-- Link modifier groups to menu items
-- Burger toppings + cheese → all burgers
INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id)
SELECT mi.id, mg.id
FROM menu_items mi
CROSS JOIN modifier_groups mg
WHERE mi.category = 'burgers' AND mg.name IN ('Burger Toppings', 'Cheese');

-- Sauce → chicken items
INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id)
SELECT mi.id, mg.id
FROM menu_items mi
CROSS JOIN modifier_groups mg
WHERE mi.category = 'chicken' AND mg.name = 'Sauce';

-- Drink choice → all combos
INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id)
SELECT mi.id, mg.id
FROM menu_items mi
CROSS JOIN modifier_groups mg
WHERE mi.category = 'combos' AND mg.name = 'Drink Choice';

-- Burger toppings + cheese → burger combos
INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id)
SELECT mi.id, mg.id
FROM menu_items mi
CROSS JOIN modifier_groups mg
WHERE mi.category = 'combos'
  AND mi.name ILIKE '%burger%'
  AND mg.name IN ('Burger Toppings', 'Cheese')
ON CONFLICT DO NOTHING;

-- Sauce → chicken combos
INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id)
SELECT mi.id, mg.id
FROM menu_items mi
CROSS JOIN modifier_groups mg
WHERE mi.category = 'combos'
  AND (mi.name ILIKE '%chicken%')
  AND mg.name = 'Sauce'
ON CONFLICT DO NOTHING;
