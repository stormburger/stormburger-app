# StormBurger — Production PostgreSQL Schema Design

**Version:** 2.0
**Date:** April 6, 2026
**Status:** Active

---

## 1. Entity Relationship Overview

The schema is organized into seven domains. Each domain is self-contained but connected through foreign keys to form the complete ordering platform.

### Domain Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                        IDENTITY DOMAIN                             │
│                                                                     │
│   auth.users ◄──── users ◄──── user_profiles                      │
│                      │              │                               │
│                      │         favorites                            │
│                      │                                              │
│               admin_users                                           │
└──────────────────────┼──────────────────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────────────────┐
│                      │     STORE DOMAIN                             │
│                      │                                              │
│                   stores ◄──── store_hours                         │
│                      │                                              │
└──────────────────────┼──────────────────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────────────────┐
│                      │     MENU DOMAIN                              │
│                      │                                              │
│              menu_categories                                        │
│                      │                                              │
│                 menu_items ◄──── menu_item_store_availability       │
│                      │              (per-store price + availability) │
│                      │                                              │
│          item_modifier_group_links                                   │
│                      │                                              │
│              modifier_groups                                        │
│                      │                                              │
│                  modifiers                                          │
└──────────────────────┼──────────────────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────────────────┐
│                      │     CART DOMAIN                               │
│                      │                                              │
│                    carts ◄──── cart_items ◄──── cart_item_modifiers │
│                                                                     │
└──────────────────────┼──────────────────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────────────────┐
│                      │     ORDER DOMAIN                             │
│                      │                                              │
│                   orders ◄──── order_items ◄── order_item_modifiers│
│                      │                                              │
│                  payments                                           │
└──────────────────────┼──────────────────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────────────────┐
│                      │     LOYALTY & PROMOS DOMAIN                  │
│                      │                                              │
│             loyalty_accounts ◄──── loyalty_transactions            │
│                                                                     │
│               promotions ◄──── promotion_rules                     │
│                      │                                              │
│           promotion_redemptions                                     │
└──────────────────────┼──────────────────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────────────────┐
│                      │     OPERATIONS DOMAIN                        │
│                      │                                              │
│              event_requests                                         │
│                                                                     │
│                audit_logs                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Relationships

- A **user** has one **user_profile**, one **loyalty_account**, many **orders**, many **favorites**, and one active **cart** per store.
- A **store** has many **store_hours**, many **menu_item_store_availability** entries (controlling what's sold and at what price), and many **orders**.
- A **menu_item** belongs to a **menu_category**. It is linked to **modifier_groups** through a join table. Its availability and price at each store is controlled by **menu_item_store_availability**.
- An **order** contains many **order_items**, each with its own **order_item_modifiers**. The order has one **payment**. All prices are denormalized at order time — the order is a permanent financial record that doesn't change if the menu changes.
- **Promotions** have **promotion_rules** that define conditions (minimum spend, specific items, date ranges). **Promotion_redemptions** track usage per user.
- **Loyalty_transactions** log every point earn and burn. The **loyalty_account** balance is the source of truth (updated atomically with each transaction).

---

## 2. SQL Table Definitions

### 2.1 Identity Domain

```sql
-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('customer', 'staff', 'manager', 'admin');
CREATE TYPE order_status AS ENUM (
    'pending', 'confirmed', 'preparing', 'ready',
    'picked_up', 'cancelled', 'refunded'
);
CREATE TYPE payment_status AS ENUM (
    'pending', 'authorized', 'captured', 'failed',
    'refunded', 'partially_refunded'
);
CREATE TYPE payment_method AS ENUM (
    'card', 'apple_pay', 'google_pay', 'cash'
);
CREATE TYPE item_category_type AS ENUM (
    'burgers', 'chicken', 'sides', 'drinks', 'combos', 'desserts', 'limited_time'
);
CREATE TYPE modifier_type AS ENUM ('single', 'multiple');
CREATE TYPE loyalty_tx_type AS ENUM ('earn', 'redeem', 'expire', 'adjust');
CREATE TYPE promo_type AS ENUM (
    'percentage_off', 'fixed_amount_off', 'free_item', 'bogo'
);
CREATE TYPE promo_scope AS ENUM ('order', 'item', 'category');
CREATE TYPE event_request_status AS ENUM (
    'submitted', 'contacted', 'quoted', 'confirmed',
    'completed', 'cancelled'
);
CREATE TYPE audit_action AS ENUM (
    'create', 'update', 'delete', 'status_change',
    'login', 'logout', 'refund', 'promo_apply',
    'loyalty_redeem', 'menu_change', 'price_change'
);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           TEXT UNIQUE,
    phone           TEXT UNIQUE,
    role            user_role NOT NULL DEFAULT 'customer',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Core user record linked to Supabase Auth. Minimal — profile data lives in user_profiles.';

CREATE TABLE user_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name    TEXT NOT NULL,
    avatar_url      TEXT,
    date_of_birth   DATE,
    marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    push_token      TEXT,
    device_os       TEXT,
    app_version     TEXT,
    last_order_at   TIMESTAMPTZ,
    total_orders    INTEGER NOT NULL DEFAULT 0,
    total_spent     INTEGER NOT NULL DEFAULT 0,  -- cents
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_profiles IS 'Extended profile data. Separated from users to keep the auth-linked table lean.';
COMMENT ON COLUMN user_profiles.total_spent IS 'Lifetime spend in cents. Denormalized for fast loyalty tier calculation.';

CREATE TABLE admin_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    store_id        UUID,  -- NULL = all stores. Set = scoped to one store.
    permissions     JSONB NOT NULL DEFAULT '{}',
    pin_hash        TEXT,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE admin_users IS 'Staff/manager/admin accounts with store-scoped permissions.';
COMMENT ON COLUMN admin_users.store_id IS 'NULL means access to all stores. Non-null scopes the admin to a single store.';
COMMENT ON COLUMN admin_users.permissions IS 'JSON object of granular permissions: {"can_refund": true, "can_edit_menu": true, ...}';
```

### 2.2 Store Domain

```sql
CREATE TABLE stores (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    slug                TEXT NOT NULL UNIQUE,
    address_line1       TEXT NOT NULL,
    address_line2       TEXT,
    city                TEXT NOT NULL,
    state               TEXT NOT NULL DEFAULT 'CA',
    zip                 TEXT NOT NULL,
    country             TEXT NOT NULL DEFAULT 'US',
    lat                 DOUBLE PRECISION NOT NULL,
    lng                 DOUBLE PRECISION NOT NULL,
    phone               TEXT,
    email               TEXT,
    image_url           TEXT,
    timezone            TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_accepting_orders BOOLEAN NOT NULL DEFAULT TRUE,
    max_orders_per_window INTEGER NOT NULL DEFAULT 30,
    estimated_prep_minutes INTEGER NOT NULL DEFAULT 18,
    tax_rate            NUMERIC(5, 4) NOT NULL DEFAULT 0.0975,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    metadata            JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN stores.max_orders_per_window IS 'Max orders accepted per 15-minute window. Used for throttling.';
COMMENT ON COLUMN stores.tax_rate IS 'Tax rate for this store. Supports different rates if stores are in different tax jurisdictions.';
COMMENT ON COLUMN stores.metadata IS 'Flexible key-value store for store-specific config without schema changes.';

CREATE TABLE store_hours (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time       TIME NOT NULL,
    close_time      TIME NOT NULL,
    is_closed       BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (store_id, day_of_week)
);

COMMENT ON COLUMN store_hours.day_of_week IS '0 = Sunday, 6 = Saturday.';
```

### 2.3 Menu Domain

```sql
CREATE TABLE menu_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    type            item_category_type NOT NULL,
    description     TEXT,
    image_url       TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE menu_categories IS 'Top-level menu categories. Global across all stores.';

CREATE TABLE menu_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id     UUID NOT NULL REFERENCES menu_categories(id) ON DELETE RESTRICT,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    description     TEXT NOT NULL DEFAULT '',
    base_price      INTEGER NOT NULL,  -- cents
    image_url       TEXT,
    calories        INTEGER,
    prep_time_minutes INTEGER,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    tags            TEXT[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE menu_items IS 'Global menu items. Prices and availability are overridden per store in menu_item_store_availability.';
COMMENT ON COLUMN menu_items.base_price IS 'Default price in cents. Stores can override via menu_item_store_availability.price_override.';
COMMENT ON COLUMN menu_items.tags IS 'Array of tags for filtering: {"spicy", "new", "popular", "gluten-free"}';

CREATE TABLE menu_item_store_availability (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    menu_item_id    UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    is_available    BOOLEAN NOT NULL DEFAULT TRUE,
    price_override  INTEGER,  -- cents. NULL = use base_price
    sort_order_override INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (store_id, menu_item_id)
);

COMMENT ON TABLE menu_item_store_availability IS 'Per-store availability and pricing. If no row exists for a store+item pair, the item is NOT available at that store.';
COMMENT ON COLUMN menu_item_store_availability.price_override IS 'Store-specific price in cents. NULL means use menu_items.base_price.';

CREATE TABLE modifier_groups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    type            modifier_type NOT NULL DEFAULT 'multiple',
    is_required     BOOLEAN NOT NULL DEFAULT FALSE,
    min_selections  SMALLINT NOT NULL DEFAULT 0,
    max_selections  SMALLINT NOT NULL DEFAULT 10,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN modifier_groups.name IS 'Internal name: "burger_toppings". Used in code.';
COMMENT ON COLUMN modifier_groups.display_name IS 'Customer-facing name: "Choose Your Toppings"';

CREATE TABLE modifiers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    price_adjustment INTEGER NOT NULL DEFAULT 0,  -- cents
    calories        INTEGER,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE item_modifier_group_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id    UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    UNIQUE (menu_item_id, modifier_group_id)
);
```

### 2.4 Cart Domain

```sql
CREATE TABLE carts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    promo_code      TEXT,
    special_instructions TEXT,
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, store_id)
);

COMMENT ON TABLE carts IS 'Server-side cart. One active cart per user per store. Expires after 24 hours.';

CREATE TABLE cart_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id         UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    menu_item_id    UUID NOT NULL REFERENCES menu_items(id),
    quantity        SMALLINT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    special_instructions TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_item_modifiers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_item_id    UUID NOT NULL REFERENCES cart_items(id) ON DELETE CASCADE,
    modifier_id     UUID NOT NULL REFERENCES modifiers(id),
    UNIQUE (cart_item_id, modifier_id)
);
```

### 2.5 Order Domain

```sql
CREATE TABLE orders (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number            TEXT NOT NULL UNIQUE,
    user_id                 UUID NOT NULL REFERENCES users(id),
    store_id                UUID NOT NULL REFERENCES stores(id),
    status                  order_status NOT NULL DEFAULT 'pending',
    
    -- Pricing (all in cents, denormalized at order time)
    subtotal                INTEGER NOT NULL,
    discount_amount         INTEGER NOT NULL DEFAULT 0,
    tax_amount              INTEGER NOT NULL,
    tip_amount              INTEGER NOT NULL DEFAULT 0,
    total                   INTEGER NOT NULL,
    tax_rate                NUMERIC(5, 4) NOT NULL,
    
    -- Fulfillment
    estimated_pickup_at     TIMESTAMPTZ,
    scheduled_for           TIMESTAMPTZ,  -- NULL = ASAP. Set = scheduled order
    confirmed_at            TIMESTAMPTZ,
    preparing_at            TIMESTAMPTZ,
    ready_at                TIMESTAMPTZ,
    picked_up_at            TIMESTAMPTZ,
    cancelled_at            TIMESTAMPTZ,
    cancel_reason           TEXT,
    
    -- Context
    special_instructions    TEXT,
    promo_id                UUID REFERENCES promotions(id),
    promo_code              TEXT,
    loyalty_points_earned   INTEGER NOT NULL DEFAULT 0,
    loyalty_points_redeemed INTEGER NOT NULL DEFAULT 0,
    
    -- Integrity
    idempotency_key         TEXT NOT NULL UNIQUE,
    
    -- Denormalized for display
    store_name              TEXT NOT NULL,
    item_count              SMALLINT NOT NULL,
    
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE orders IS 'Immutable financial record. All prices are captured at order time and never change.';
COMMENT ON COLUMN orders.scheduled_for IS 'NULL means ASAP order. A timestamp means the customer requested pickup at this time.';
COMMENT ON COLUMN orders.store_name IS 'Denormalized. Even if a store is renamed, the order record shows the name at time of purchase.';

CREATE TABLE order_items (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id            UUID NOT NULL REFERENCES menu_items(id),
    quantity                SMALLINT NOT NULL DEFAULT 1,
    unit_price              INTEGER NOT NULL,  -- cents (item + modifiers, per unit)
    total_price             INTEGER NOT NULL,  -- cents (unit_price × quantity)
    special_instructions    TEXT,
    
    -- Denormalized for permanent record
    menu_item_name          TEXT NOT NULL,
    menu_item_category      TEXT NOT NULL,
    
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_item_modifiers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id       UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    modifier_id         UUID NOT NULL REFERENCES modifiers(id),
    modifier_name       TEXT NOT NULL,      -- denormalized
    modifier_group_name TEXT NOT NULL,      -- denormalized
    price_adjustment    INTEGER NOT NULL,   -- cents, denormalized
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE order_item_modifiers IS 'Denormalized modifier snapshot. Prices here are what the customer paid, regardless of current modifier prices.';
```

### 2.6 Payment Domain

```sql
CREATE TABLE payments (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                    UUID NOT NULL REFERENCES orders(id),
    stripe_payment_intent_id    TEXT UNIQUE,
    stripe_charge_id            TEXT,
    method                      payment_method NOT NULL DEFAULT 'card',
    amount                      INTEGER NOT NULL,  -- cents
    tip_amount                  INTEGER NOT NULL DEFAULT 0,
    status                      payment_status NOT NULL DEFAULT 'pending',
    failure_reason              TEXT,
    refund_amount               INTEGER NOT NULL DEFAULT 0,
    refund_reason               TEXT,
    refunded_by                 UUID REFERENCES users(id),
    refunded_at                 TIMESTAMPTZ,
    metadata                    JSONB NOT NULL DEFAULT '{}',
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN payments.refunded_by IS 'User ID of the staff/manager who issued the refund.';
COMMENT ON COLUMN payments.metadata IS 'Stripe metadata, card brand, last 4 digits, etc.';
```

### 2.7 Loyalty & Promos Domain

```sql
CREATE TABLE loyalty_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    points_balance  INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
    lifetime_points INTEGER NOT NULL DEFAULT 0,
    tier            TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    tier_updated_at TIMESTAMPTZ,
    enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE loyalty_accounts IS 'One per customer. Points balance is the source of truth — transactions are the audit trail.';
COMMENT ON COLUMN loyalty_accounts.lifetime_points IS 'Total points ever earned (never decreases). Used for tier calculation.';

CREATE TABLE loyalty_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
    order_id        UUID REFERENCES orders(id),
    type            loyalty_tx_type NOT NULL,
    points          INTEGER NOT NULL,  -- positive for earn, negative for redeem
    balance_after   INTEGER NOT NULL,
    description     TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE loyalty_transactions IS 'Immutable ledger. Every point change is recorded with the resulting balance.';
COMMENT ON COLUMN loyalty_transactions.points IS 'Positive = earn. Negative = redeem or expire.';

CREATE TABLE promotions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    description     TEXT,
    type            promo_type NOT NULL,
    scope           promo_scope NOT NULL DEFAULT 'order',
    value           INTEGER NOT NULL,  -- percentage (e.g. 15) or cents (e.g. 500)
    
    -- Constraints
    min_order_amount INTEGER,           -- cents. NULL = no minimum
    max_discount     INTEGER,           -- cents. Cap on percentage discounts
    max_uses_total   INTEGER,           -- NULL = unlimited
    max_uses_per_user INTEGER NOT NULL DEFAULT 1,
    current_uses     INTEGER NOT NULL DEFAULT 0,
    
    -- Targeting
    store_id         UUID REFERENCES stores(id),  -- NULL = all stores
    category_id      UUID REFERENCES menu_categories(id),  -- for scope = 'category'
    menu_item_id     UUID REFERENCES menu_items(id),  -- for scope = 'item'
    
    -- Scheduling
    starts_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE promotions IS 'Promo codes with validation rules. Scope determines what the discount applies to.';
COMMENT ON COLUMN promotions.value IS 'For percentage_off: the percentage (15 = 15%). For fixed_amount_off: cents (500 = $5.00).';
COMMENT ON COLUMN promotions.store_id IS 'NULL = valid at all stores. Set = valid only at this store.';

CREATE TABLE promotion_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id    UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    rule_type       TEXT NOT NULL,  -- 'day_of_week', 'time_range', 'first_order', 'min_items', 'specific_item'
    rule_value      JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE promotion_rules IS 'Additional validation rules for promotions.';
COMMENT ON COLUMN promotion_rules.rule_type IS 'Extensible rule system. Examples: "day_of_week" with value {"days": [1,2,3]}, "time_range" with value {"start": "11:00", "end": "14:00"}, "first_order" with value {"enabled": true}.';

CREATE TABLE promotion_redemptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id    UUID NOT NULL REFERENCES promotions(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    order_id        UUID NOT NULL REFERENCES orders(id),
    discount_amount INTEGER NOT NULL,  -- cents actually discounted
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.8 Favorites

```sql
CREATE TABLE favorites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    menu_item_id    UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, menu_item_id)
);
```

### 2.9 Events / Catering

```sql
CREATE TABLE event_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id),  -- NULL if submitted without account
    status              event_request_status NOT NULL DEFAULT 'submitted',
    
    -- Contact
    contact_name        TEXT NOT NULL,
    contact_email       TEXT NOT NULL,
    contact_phone       TEXT NOT NULL,
    
    -- Event details
    event_date          DATE NOT NULL,
    event_time          TIME,
    event_type          TEXT NOT NULL,  -- 'corporate', 'private', 'wedding', 'festival', etc.
    guest_count         INTEGER NOT NULL,
    location_description TEXT,
    dietary_requirements TEXT,
    
    -- Internal
    notes               TEXT,
    quoted_amount       INTEGER,  -- cents
    assigned_to         UUID REFERENCES users(id),
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE event_requests IS 'Catering and food truck booking inquiries.';
```

### 2.10 Audit Logs

```sql
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    action          audit_action NOT NULL,
    entity_type     TEXT NOT NULL,      -- 'order', 'menu_item', 'store', 'payment', etc.
    entity_id       UUID,
    changes         JSONB,             -- {"field": {"old": X, "new": Y}}
    ip_address      INET,
    user_agent      TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Append-only audit trail. Never updated or deleted.';
COMMENT ON COLUMN audit_logs.changes IS 'JSON diff of what changed. Only populated for update actions.';
```

---

## 3. Indexes

```sql
-- ============================================================
-- IDENTITY
-- ============================================================
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX idx_admin_users_store ON admin_users(store_id) WHERE store_id IS NOT NULL;

-- ============================================================
-- STORE
-- ============================================================
CREATE INDEX idx_stores_active ON stores(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_stores_slug ON stores(slug);
CREATE INDEX idx_store_hours_store ON store_hours(store_id);

-- ============================================================
-- MENU
-- ============================================================
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_active ON menu_items(is_active, sort_order) WHERE is_active = TRUE;
CREATE INDEX idx_menu_items_slug ON menu_items(slug);
CREATE INDEX idx_menu_item_store_avail_store ON menu_item_store_availability(store_id);
CREATE INDEX idx_menu_item_store_avail_item ON menu_item_store_availability(menu_item_id);
CREATE INDEX idx_modifiers_group ON modifiers(group_id);
CREATE INDEX idx_item_mod_group_links_item ON item_modifier_group_links(menu_item_id);
CREATE INDEX idx_item_mod_group_links_group ON item_modifier_group_links(modifier_group_id);

-- ============================================================
-- CART
-- ============================================================
CREATE INDEX idx_carts_user ON carts(user_id);
CREATE INDEX idx_carts_expires ON carts(expires_at) WHERE expires_at < NOW();
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);

-- ============================================================
-- ORDER (most critical for performance)
-- ============================================================
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_status ON orders(status) WHERE status NOT IN ('picked_up', 'cancelled', 'refunded');
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_store_status ON orders(store_id, status) WHERE status NOT IN ('picked_up', 'cancelled', 'refunded');
CREATE INDEX idx_orders_scheduled ON orders(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX idx_orders_idempotency ON orders(idempotency_key);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_item_modifiers_item ON order_item_modifiers(order_item_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_stripe_pi ON payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- ============================================================
-- LOYALTY & PROMOS
-- ============================================================
CREATE INDEX idx_loyalty_accounts_user ON loyalty_accounts(user_id);
CREATE INDEX idx_loyalty_tx_account ON loyalty_transactions(account_id);
CREATE INDEX idx_loyalty_tx_order ON loyalty_transactions(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_promotions_code ON promotions(code) WHERE is_active = TRUE;
CREATE INDEX idx_promotions_active ON promotions(is_active, starts_at, expires_at) WHERE is_active = TRUE;
CREATE INDEX idx_promo_redemptions_user ON promotion_redemptions(user_id);
CREATE INDEX idx_promo_redemptions_promo ON promotion_redemptions(promotion_id);

-- ============================================================
-- OPERATIONS
-- ============================================================
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_event_requests_status ON event_requests(status) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

**Index design notes:**

- Partial indexes (WHERE clauses) reduce index size and speed up the most common queries. The kitchen dashboard only queries active orders — the index on `orders.status` excludes terminal states.
- The `orders` table has the most indexes because it's queried by customers (my orders), kitchen (active orders by store), and reporting (date ranges, aggregations).
- `audit_logs` uses a descending index on `created_at` because the most common query is "show me the most recent activity."

---

## 4. Auto-Update Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema = 'public'
          AND table_name != 'audit_logs'
    LOOP
        EXECUTE format(
            'CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
            t, t
        );
    END LOOP;
END $$;
```

---

## 5. Row-Level Security Strategy

### 5.1 Helper Function

```sql
-- Bypass-RLS function to check a user's role without recursion
CREATE OR REPLACE FUNCTION get_user_role(uid UUID)
RETURNS user_role AS $$
    SELECT role FROM users WHERE id = uid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if a user is staff+ for a specific store
CREATE OR REPLACE FUNCTION is_store_staff(uid UUID, sid UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM admin_users
        WHERE user_id = uid
          AND (store_id IS NULL OR store_id = sid)
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### 5.2 Policy Strategy by Table

```sql
-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_store_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_modifier_group_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PUBLIC READ (anyone can browse, no auth required)
-- ============================================================
CREATE POLICY "public_read" ON stores FOR SELECT USING (is_active = TRUE);
CREATE POLICY "public_read" ON store_hours FOR SELECT USING (TRUE);
CREATE POLICY "public_read" ON menu_categories FOR SELECT USING (is_active = TRUE);
CREATE POLICY "public_read" ON menu_items FOR SELECT USING (is_active = TRUE);
CREATE POLICY "public_read" ON menu_item_store_availability FOR SELECT USING (TRUE);
CREATE POLICY "public_read" ON modifier_groups FOR SELECT USING (TRUE);
CREATE POLICY "public_read" ON modifiers FOR SELECT USING (is_active = TRUE);
CREATE POLICY "public_read" ON item_modifier_group_links FOR SELECT USING (TRUE);
CREATE POLICY "public_read" ON promotions FOR SELECT USING (is_active = TRUE AND starts_at <= NOW() AND (expires_at IS NULL OR expires_at > NOW()));

-- ============================================================
-- USER-SCOPED (customers see only their own data)
-- ============================================================
CREATE POLICY "own_data" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "own_data" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "own_data" ON user_profiles FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_data" ON carts FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_data" ON cart_items FOR ALL USING (
    EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
);
CREATE POLICY "own_data" ON cart_item_modifiers FOR ALL USING (
    EXISTS (
        SELECT 1 FROM cart_items ci
        JOIN carts c ON c.id = ci.cart_id
        WHERE ci.id = cart_item_modifiers.cart_item_id AND c.user_id = auth.uid()
    )
);
CREATE POLICY "own_orders" ON orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own_order_items" ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "own_order_modifiers" ON order_item_modifiers FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.id = order_item_modifiers.order_item_id AND o.user_id = auth.uid()
    )
);
CREATE POLICY "own_payments" ON payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "own_loyalty" ON loyalty_accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own_loyalty_tx" ON loyalty_transactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM loyalty_accounts WHERE loyalty_accounts.id = loyalty_transactions.account_id AND loyalty_accounts.user_id = auth.uid())
);
CREATE POLICY "own_redemptions" ON promotion_redemptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own_favorites" ON favorites FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_events" ON event_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "insert_events" ON event_requests FOR INSERT WITH CHECK (TRUE);

-- ============================================================
-- STAFF+ (read all operational data for their store)
-- ============================================================
CREATE POLICY "staff_read" ON users FOR SELECT USING (
    get_user_role(auth.uid()) IN ('staff', 'manager', 'admin')
);
CREATE POLICY "staff_orders" ON orders FOR SELECT USING (
    get_user_role(auth.uid()) IN ('staff', 'manager', 'admin')
);
CREATE POLICY "staff_order_items" ON order_items FOR SELECT USING (
    get_user_role(auth.uid()) IN ('staff', 'manager', 'admin')
);
CREATE POLICY "staff_order_modifiers" ON order_item_modifiers FOR SELECT USING (
    get_user_role(auth.uid()) IN ('staff', 'manager', 'admin')
);
CREATE POLICY "staff_payments" ON payments FOR SELECT USING (
    get_user_role(auth.uid()) IN ('staff', 'manager', 'admin')
);
CREATE POLICY "staff_events" ON event_requests FOR ALL USING (
    get_user_role(auth.uid()) IN ('staff', 'manager', 'admin')
);

-- ============================================================
-- ADMIN (full access to management tables)
-- ============================================================
CREATE POLICY "admin_all" ON stores FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "admin_all" ON store_hours FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "admin_all" ON menu_categories FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "admin_all" ON menu_items FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "admin_all" ON menu_item_store_availability FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "admin_all" ON modifier_groups FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "admin_all" ON modifiers FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "admin_all" ON item_modifier_group_links FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "admin_all" ON admin_users FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "admin_all" ON promotions FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "admin_all" ON promotion_rules FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "admin_all" ON orders FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "admin_all" ON payments FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "admin_all" ON loyalty_accounts FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "admin_all" ON loyalty_transactions FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Audit logs: append-only. Staff+ can read. Only service role can insert.
CREATE POLICY "staff_read_audit" ON audit_logs FOR SELECT USING (
    get_user_role(auth.uid()) IN ('staff', 'manager', 'admin')
);

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
```

### 5.3 RLS Strategy Summary

| Access Level | Who | Can Read | Can Write |
|---|---|---|---|
| **Public** | Anyone (no auth) | Stores, hours, menu, categories, modifiers, active promos | Nothing |
| **Customer** | Authenticated user | Own profile, own orders, own cart, own loyalty, own favorites | Own profile, own cart, own favorites, submit event requests |
| **Staff** | role = staff | Everything customers can + all orders, all payments, all events | Order status updates (via API, not direct) |
| **Manager** | role = manager | Same as staff + audit logs | Menu edits, refunds (via API) |
| **Admin** | role = admin | Everything | Everything |
| **Service Role** | Backend only | Everything (bypasses RLS) | Everything (used for order creation, payment processing, loyalty) |

**Critical rule:** All business-critical writes (orders, payments, loyalty, promos) go through the NestJS backend using the service role key. RLS protects direct Supabase access but is not the only layer of defense.

---

## 6. Performance and Scaling Notes

### 6.1 Query Performance

**Menu loading** is the most frequent query. The join path is: `menu_item_store_availability` → `menu_items` → `menu_categories`, plus `item_modifier_group_links` → `modifier_groups` → `modifiers`. This is 3–4 joins but on small tables (hundreds of rows, not millions). With the Redis cache (5-minute TTL), this query hits the database at most once per 5 minutes per store.

**Kitchen dashboard** queries active orders: `SELECT * FROM orders WHERE store_id = X AND status IN ('pending', 'confirmed', 'preparing', 'ready')`. The partial index `idx_orders_store_status` makes this instant even with millions of total orders, because it only indexes non-terminal orders (typically < 100 rows per store at any time).

**Order history** queries by user with a descending created_at index and LIMIT 20. Fast regardless of total order count.

### 6.2 Table Growth Projections

| Table | Growth Pattern | 1 Year (2 stores) | 3 Years (10 stores) |
|---|---|---|---|
| `orders` | ~200/day → ~1000/day | 73K rows | 800K rows |
| `order_items` | ~3x orders | 220K rows | 2.4M rows |
| `order_item_modifiers` | ~2x order_items | 440K rows | 4.8M rows |
| `payments` | 1:1 with orders | 73K rows | 800K rows |
| `users` | Downloads | 50K rows | 200K rows |
| `audit_logs` | ~10x orders | 730K rows | 8M rows |
| `menu_items` | Rarely changes | < 100 rows | < 500 rows |
| `loyalty_transactions` | ~1.5x orders | 110K rows | 1.2M rows |

### 6.3 Scaling Recommendations

**Year 1 (current):**
- Supabase Pro plan is sufficient
- No partitioning needed
- Single NestJS instance handles the load
- Redis on Upstash serverless

**Year 2 (5+ stores, 100K users):**
- Add read replica for reporting queries
- Enable connection pooling (Supabase Supavisor)
- Consider partitioning `audit_logs` by month (first table to grow large)
- Scale NestJS to 2–3 instances

**Year 3 (10+ stores, 200K+ users):**
- Partition `orders` and `order_items` by created_at month
- Archive orders older than 2 years to cold storage
- Materialized views for reporting aggregations (daily sales by store, top items)
- Dedicated analytics database (replicated) to avoid reporting load on primary

### 6.4 Partition Strategy (When Needed)

```sql
-- Example: partition orders by month when table exceeds 1M rows
-- This is a FUTURE migration, not applied at launch.

-- Convert orders to partitioned table
CREATE TABLE orders_partitioned (
    LIKE orders INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE orders_2026_01 PARTITION OF orders_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE orders_2026_02 PARTITION OF orders_partitioned
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- ... auto-generate future partitions with pg_cron
```

### 6.5 Denormalization Decisions

Several fields are intentionally denormalized for performance and data integrity:

| Field | Table | Why |
|---|---|---|
| `store_name` | orders | Store could be renamed. Order must show the name at purchase time. |
| `menu_item_name` | order_items | Menu item could be renamed or deleted. Order record is permanent. |
| `menu_item_category` | order_items | Same reason. |
| `modifier_name` | order_item_modifiers | Modifier could change. Order shows what customer selected. |
| `modifier_group_name` | order_item_modifiers | Same reason. |
| `price_adjustment` | order_item_modifiers | Modifier price could change. Order captured the price at purchase. |
| `item_count` | orders | Avoids JOIN to count items for order list display. |
| `total_orders` | user_profiles | Avoids COUNT(*) on orders table for profile display. |
| `total_spent` | user_profiles | Same. Updated atomically on order completion. |
| `tax_rate` | orders | Tax rate could change. Order records the rate applied. |

**Rule:** An order is a financial receipt. Every value in the order tables represents what happened at the moment of purchase, not what the current state of the menu or store is.

---

*This schema supports StormBurger from 2 stores to 20+, from launch to 200K+ users, without structural changes. New stores are added as rows, not schema changes. New menu items are rows. New modifier groups are rows. The only schema changes needed over time are new feature tables (e.g., delivery addresses, driver assignments) and eventual table partitioning for scale.*
