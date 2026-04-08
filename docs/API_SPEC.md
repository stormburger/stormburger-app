# StormBurger — V1 API Specification

**Version:** 1.0
**Date:** April 6, 2026
**Base URL:** `https://api.stormburger.com/api`
**Protocol:** HTTPS only
**Content-Type:** `application/json`
**Auth:** Supabase JWT in `Authorization: Bearer <token>` header

---

## Conventions

### Authentication Levels

| Level | Header | Description |
|---|---|---|
| `public` | None required | Anyone can call. Used for browsing stores and menus. |
| `customer` | `Authorization: Bearer <jwt>` | Authenticated user with any role. |
| `staff+` | `Authorization: Bearer <jwt>` | User with role `staff`, `manager`, or `admin`. |
| `manager+` | `Authorization: Bearer <jwt>` | User with role `manager` or `admin`. |
| `admin` | `Authorization: Bearer <jwt>` | User with role `admin` only. |
| `webhook` | `Stripe-Signature` header | Stripe signature verification. No JWT. |

### Response Format

All responses follow this envelope:

```json
// Success
{
  "data": { ... },
  "meta": { "request_id": "uuid" }
}

// Error
{
  "error": {
    "code": "STORE_CLOSED",
    "message": "This location is not currently accepting orders.",
    "details": {}
  },
  "meta": { "request_id": "uuid" }
}
```

### Pagination

List endpoints that return many results use cursor-based pagination:

```
GET /api/orders/mine?limit=20&cursor=<last_item_id>
```

### Money

All monetary values are in **cents** (integers). `899` = $8.99. No floating point.

### Timestamps

All timestamps are **ISO 8601 with timezone**: `2026-04-06T20:30:00.000Z`

---

## 1. Auth APIs

### 1.1 Sign Up

Creates a new customer account.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/auth/signup` |
| **Auth** | `public` |

**Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "securePass123",
  "display_name": "John Smith",
  "phone": "+13105551234",
  "marketing_opt_in": true
}
```

**Response (201):**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "customer@example.com",
      "role": "customer"
    },
    "session": {
      "access_token": "jwt...",
      "refresh_token": "rt...",
      "expires_at": "2026-04-07T20:30:00.000Z"
    },
    "profile": {
      "display_name": "John Smith",
      "loyalty_enrolled": true,
      "points_balance": 0
    }
  }
}
```

**Edge Cases:**
- Email already registered → `409 EMAIL_TAKEN`
- Phone already registered → `409 PHONE_TAKEN`
- Password too short (< 8 chars) → `422 WEAK_PASSWORD`
- Invalid email format → `422 INVALID_EMAIL`
- Missing required fields → `422 VALIDATION_ERROR`

**Side Effects:**
- Creates `users` row
- Creates `user_profiles` row
- Creates `loyalty_accounts` row with 0 points
- Sends welcome email (async via queue)

---

### 1.2 Sign In

Authenticates an existing user.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/auth/signin` |
| **Auth** | `public` |

**Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "securePass123"
}
```

**Response (200):**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "customer@example.com",
      "role": "customer"
    },
    "session": {
      "access_token": "jwt...",
      "refresh_token": "rt...",
      "expires_at": "2026-04-07T20:30:00.000Z"
    },
    "profile": {
      "display_name": "John Smith",
      "loyalty_enrolled": true,
      "points_balance": 150
    }
  }
}
```

**Edge Cases:**
- Wrong password → `401 INVALID_CREDENTIALS`
- Account disabled → `403 ACCOUNT_DISABLED`
- Email not found → `401 INVALID_CREDENTIALS` (same error — don't leak existence)

---

### 1.3 Refresh Token

Exchanges a refresh token for a new access token.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/auth/refresh` |
| **Auth** | `public` |

**Request Body:**
```json
{
  "refresh_token": "rt..."
}
```

**Response (200):**
```json
{
  "data": {
    "access_token": "jwt...",
    "refresh_token": "rt_new...",
    "expires_at": "2026-04-07T20:30:00.000Z"
  }
}
```

**Edge Cases:**
- Expired refresh token → `401 TOKEN_EXPIRED`
- Invalid refresh token → `401 INVALID_TOKEN`

---

### 1.4 Sign Out

Invalidates the current session.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/auth/signout` |
| **Auth** | `customer` |

**Response (200):**
```json
{
  "data": { "signed_out": true }
}
```

---

### 1.5 Get Current User

Returns the authenticated user's profile.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/auth/me` |
| **Auth** | `customer` |

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "email": "customer@example.com",
    "phone": "+13105551234",
    "role": "customer",
    "profile": {
      "display_name": "John Smith",
      "avatar_url": null,
      "date_of_birth": null,
      "marketing_opt_in": true,
      "total_orders": 12,
      "total_spent": 18945,
      "last_order_at": "2026-04-05T19:30:00.000Z"
    },
    "loyalty": {
      "points_balance": 150,
      "lifetime_points": 450,
      "tier": "silver",
      "next_tier": "gold",
      "points_to_next_tier": 550
    }
  }
}
```

---

### 1.6 Update Profile

Updates the user's profile information.

| | |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/auth/me` |
| **Auth** | `customer` |

**Request Body (all fields optional):**
```json
{
  "display_name": "Johnny Smith",
  "date_of_birth": "1995-03-15",
  "marketing_opt_in": false,
  "push_token": "fcm_token_here"
}
```

**Response (200):** Updated profile object.

**Edge Cases:**
- Invalid date format → `422 VALIDATION_ERROR`

---

## 2. Store APIs

### 2.1 List Stores

Returns all active StormBurger locations.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/stores` |
| **Auth** | `public` |
| **Query Params** | `lat`, `lng` (optional — sorts by distance if provided) |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "StormBurger Inglewood",
      "slug": "inglewood",
      "address": {
        "line1": "1500 N La Brea Ave",
        "city": "Inglewood",
        "state": "CA",
        "zip": "90302"
      },
      "lat": 33.9617,
      "lng": -118.3440,
      "phone": "(310) 555-0100",
      "is_accepting_orders": true,
      "is_open": true,
      "today_hours": { "open": "10:30", "close": "22:00" },
      "estimated_prep_minutes": 18,
      "distance_miles": 2.4,
      "image_url": "https://..."
    }
  ]
}
```

**Notes:**
- `is_open` is calculated server-side from store hours and timezone.
- `distance_miles` only present when `lat`/`lng` are provided.

---

### 2.2 Get Store Detail

Returns a single store with full hours.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/stores/:storeId` |
| **Auth** | `public` |

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "name": "StormBurger Inglewood",
    "slug": "inglewood",
    "address": {
      "line1": "1500 N La Brea Ave",
      "city": "Inglewood",
      "state": "CA",
      "zip": "90302"
    },
    "lat": 33.9617,
    "lng": -118.3440,
    "phone": "(310) 555-0100",
    "is_accepting_orders": true,
    "is_open": true,
    "estimated_prep_minutes": 18,
    "tax_rate": 0.0975,
    "image_url": "https://...",
    "hours": [
      { "day": 0, "day_name": "Sunday", "open": "10:30", "close": "22:00", "is_closed": false },
      { "day": 1, "day_name": "Monday", "open": "10:30", "close": "22:00", "is_closed": false }
    ]
  }
}
```

**Edge Cases:**
- Store not found → `404 STORE_NOT_FOUND`
- Store inactive → `404 STORE_NOT_FOUND` (don't expose inactive stores)

---

### 2.3 Get Store Status

Lightweight endpoint for checking if a store is currently accepting orders.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/stores/:storeId/status` |
| **Auth** | `public` |

**Response (200):**
```json
{
  "data": {
    "store_id": "uuid",
    "is_open": true,
    "is_accepting_orders": true,
    "current_wait_minutes": 18,
    "closes_at": "22:00",
    "reason": null
  }
}
```

When closed:
```json
{
  "data": {
    "store_id": "uuid",
    "is_open": false,
    "is_accepting_orders": false,
    "current_wait_minutes": null,
    "closes_at": null,
    "reason": "Outside operating hours. Opens at 10:30 AM."
  }
}
```

---

## 3. Menu APIs

### 3.1 Get Menu for Store

Returns the full menu for a specific store, grouped by category.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/stores/:storeId/menu` |
| **Auth** | `public` |

**Response (200):**
```json
{
  "data": {
    "store_id": "uuid",
    "categories": [
      {
        "id": "uuid",
        "name": "Combos",
        "slug": "combos",
        "items": [
          {
            "id": "uuid",
            "name": "Classic StormBurger Combo",
            "slug": "classic-stormburger-combo",
            "description": "Classic StormBurger with fries and a drink",
            "price": 1299,
            "image_url": "https://...",
            "calories": 1150,
            "is_featured": true,
            "tags": ["popular"],
            "has_modifiers": true
          }
        ]
      },
      {
        "id": "uuid",
        "name": "Burgers",
        "slug": "burgers",
        "items": [ ... ]
      }
    ]
  }
}
```

**Notes:**
- Items not available at this store are excluded.
- Prices reflect store-specific overrides.
- `has_modifiers` tells the client whether to show a customization screen or add directly to cart.

**Edge Cases:**
- Invalid store ID → `404 STORE_NOT_FOUND`

---

### 3.2 Get Menu Item Detail

Returns a single item with full modifier groups and options.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/stores/:storeId/menu/items/:itemId` |
| **Auth** | `public` |

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "name": "Classic StormBurger Combo",
    "description": "Classic StormBurger with fries and a drink",
    "price": 1299,
    "image_url": "https://...",
    "calories": 1150,
    "prep_time_minutes": 12,
    "tags": ["popular"],
    "modifier_groups": [
      {
        "id": "uuid",
        "name": "Choose Your Toppings",
        "type": "multiple",
        "is_required": false,
        "min_selections": 0,
        "max_selections": 10,
        "modifiers": [
          {
            "id": "uuid",
            "name": "Extra Patty",
            "price_adjustment": 300,
            "calories": 250,
            "is_default": false
          },
          {
            "id": "uuid",
            "name": "Bacon",
            "price_adjustment": 150,
            "calories": 80,
            "is_default": false
          },
          {
            "id": "uuid",
            "name": "No Onion",
            "price_adjustment": 0,
            "calories": 0,
            "is_default": false
          }
        ]
      },
      {
        "id": "uuid",
        "name": "Choose Your Drink",
        "type": "single",
        "is_required": true,
        "min_selections": 1,
        "max_selections": 1,
        "modifiers": [
          {
            "id": "uuid",
            "name": "Coca-Cola",
            "price_adjustment": 0,
            "is_default": true
          },
          {
            "id": "uuid",
            "name": "Sprite",
            "price_adjustment": 0,
            "is_default": false
          }
        ]
      }
    ]
  }
}
```

**Edge Cases:**
- Item not found → `404 ITEM_NOT_FOUND`
- Item not available at this store → `404 ITEM_NOT_AVAILABLE_AT_STORE`

---

## 4. Cart APIs

### 4.1 Get Cart

Returns the user's current cart for a store.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/stores/:storeId/cart` |
| **Auth** | `customer` |

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "store_id": "uuid",
    "items": [
      {
        "id": "uuid",
        "menu_item": {
          "id": "uuid",
          "name": "Classic StormBurger Combo",
          "image_url": "https://..."
        },
        "quantity": 2,
        "unit_price": 1449,
        "line_total": 2898,
        "modifiers": [
          { "id": "uuid", "name": "Bacon", "price_adjustment": 150 }
        ],
        "special_instructions": null
      }
    ],
    "promo_code": null,
    "subtotal": 2898,
    "item_count": 2
  }
}
```

If no cart exists, returns empty cart:
```json
{
  "data": {
    "id": null,
    "store_id": "uuid",
    "items": [],
    "subtotal": 0,
    "item_count": 0
  }
}
```

---

### 4.2 Add Item to Cart

Adds an item with modifiers to the cart. Creates the cart if it doesn't exist.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/stores/:storeId/cart/items` |
| **Auth** | `customer` |

**Request Body:**
```json
{
  "menu_item_id": "uuid",
  "quantity": 1,
  "modifier_ids": ["uuid", "uuid"],
  "special_instructions": "Extra sauce please"
}
```

**Response (201):**
```json
{
  "data": {
    "cart_item_id": "uuid",
    "cart": { ... }
  }
}
```

**Validation (server-side):**
1. Store exists and is active
2. Menu item exists and is active
3. Menu item is available at this store
4. All modifier_ids are valid and belong to modifier groups linked to this item
5. Required modifier groups have selections
6. Single-select groups have at most one selection
7. Multi-select groups respect min/max limits
8. Quantity is ≥ 1

**Edge Cases:**
- Item unavailable at store → `400 ITEM_NOT_AVAILABLE`
- Invalid modifier → `400 INVALID_MODIFIER`
- Required modifier group missing → `400 REQUIRED_MODIFIER_MISSING`
- Max selections exceeded → `400 MAX_SELECTIONS_EXCEEDED`
- Cart expired → creates new cart silently

---

### 4.3 Update Cart Item

Updates quantity or modifiers for an existing cart item.

| | |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/stores/:storeId/cart/items/:cartItemId` |
| **Auth** | `customer` |

**Request Body (all optional):**
```json
{
  "quantity": 3,
  "modifier_ids": ["uuid", "uuid", "uuid"],
  "special_instructions": "No pickles"
}
```

**Response (200):** Updated cart.

**Edge Cases:**
- Cart item not found → `404 CART_ITEM_NOT_FOUND`
- Quantity 0 → removes item (same as DELETE)
- Cart doesn't belong to user → `403 FORBIDDEN`

---

### 4.4 Remove Cart Item

Removes an item from the cart.

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/api/stores/:storeId/cart/items/:cartItemId` |
| **Auth** | `customer` |

**Response (200):** Updated cart. If last item removed, cart still exists but is empty.

---

### 4.5 Clear Cart

Removes all items from the cart.

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/api/stores/:storeId/cart` |
| **Auth** | `customer` |

**Response (200):**
```json
{
  "data": { "cleared": true }
}
```

---

### 4.6 Apply Promo Code

Validates and applies a promo code to the cart.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/stores/:storeId/cart/promo` |
| **Auth** | `customer` |

**Request Body:**
```json
{
  "code": "STORM20"
}
```

**Response (200):**
```json
{
  "data": {
    "promo": {
      "id": "uuid",
      "code": "STORM20",
      "name": "20% Off Your Order",
      "type": "percentage_off",
      "value": 20,
      "discount_amount": 580,
      "description": "20% off orders over $15"
    },
    "cart": { ... }
  }
}
```

**Validation (server-side):**
1. Promo code exists and is active
2. Current date is within starts_at / expires_at window
3. Total uses have not exceeded max_uses_total
4. This user has not exceeded max_uses_per_user
5. If store-scoped, the cart's store matches
6. If min_order_amount set, cart subtotal meets minimum
7. All promotion_rules pass (day_of_week, time_range, first_order, etc.)

**Edge Cases:**
- Invalid code → `400 INVALID_PROMO_CODE`
- Expired → `400 PROMO_EXPIRED`
- Already used max times → `400 PROMO_MAX_USES_REACHED`
- User already used it → `400 PROMO_ALREADY_USED`
- Min order not met → `400 PROMO_MIN_NOT_MET` with `details.min_amount`
- Not valid at this store → `400 PROMO_WRONG_STORE`
- Not valid today/this time → `400 PROMO_NOT_VALID_NOW`

---

### 4.7 Remove Promo Code

Removes the applied promo code from the cart.

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/api/stores/:storeId/cart/promo` |
| **Auth** | `customer` |

**Response (200):** Updated cart without discount.

---

## 5. Checkout APIs

### 5.1 Checkout Preview

Returns a complete price breakdown before payment. This is what the customer sees on the checkout screen.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/stores/:storeId/checkout/preview` |
| **Auth** | `customer` |

**Request Body:**
```json
{
  "tip_amount": 200,
  "loyalty_points_to_redeem": 100,
  "scheduled_for": null
}
```

**Response (200):**
```json
{
  "data": {
    "store": {
      "id": "uuid",
      "name": "StormBurger Inglewood",
      "address": "1500 N La Brea Ave, Inglewood, CA 90302",
      "is_open": true,
      "estimated_pickup_at": "2026-04-06T21:00:00.000Z"
    },
    "items": [
      {
        "name": "Classic StormBurger Combo",
        "quantity": 2,
        "unit_price": 1449,
        "line_total": 2898,
        "modifiers": ["Bacon (+$1.50)"]
      }
    ],
    "pricing": {
      "subtotal": 2898,
      "discount": {
        "amount": 580,
        "promo_code": "STORM20",
        "description": "20% Off Your Order"
      },
      "subtotal_after_discount": 2318,
      "tax_rate": 0.0975,
      "tax_amount": 226,
      "tip_amount": 200,
      "loyalty_discount": 100,
      "total": 2644
    },
    "loyalty": {
      "points_to_earn": 26,
      "points_to_redeem": 100,
      "remaining_balance": 50
    },
    "warnings": []
  }
}
```

**Validation (full checkout validation, same as order creation):**
1. Store is open and accepting orders
2. All cart items are still available at this store
3. All modifier selections are still valid
4. Prices are recalculated from the database (not trusted from client)
5. Promo code is re-validated (could have expired since it was applied)
6. Loyalty points balance is sufficient for redemption
7. If scheduled_for is set, it's within allowed scheduling window (e.g., next 7 days)
8. Store is not at order capacity for the requested time window

**Warnings (non-blocking):**
```json
{
  "warnings": [
    { "code": "PRICE_CHANGED", "message": "Bacon BBQ Burger price changed from $10.99 to $11.49", "item_id": "uuid" },
    { "code": "STORE_CLOSING_SOON", "message": "This location closes in 30 minutes" }
  ]
}
```

**Edge Cases:**
- Cart is empty → `400 CART_EMPTY`
- Store closed → `400 STORE_CLOSED`
- Item no longer available → `400 ITEM_UNAVAILABLE` with item details
- Insufficient loyalty points → `400 INSUFFICIENT_POINTS`
- Store at capacity → `400 STORE_AT_CAPACITY`

---

### 5.2 Create Order

Creates the order and initiates payment. This is the single most critical endpoint in the system.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/stores/:storeId/checkout` |
| **Auth** | `customer` |

**Request Body:**
```json
{
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440000",
  "tip_amount": 200,
  "loyalty_points_to_redeem": 100,
  "scheduled_for": null,
  "special_instructions": "Ring the bell please"
}
```

**Response (201):**
```json
{
  "data": {
    "order": {
      "id": "uuid",
      "order_number": "SB-20260406-042",
      "status": "pending",
      "total": 2644,
      "estimated_pickup_at": "2026-04-06T21:00:00.000Z",
      "created_at": "2026-04-06T20:42:00.000Z"
    },
    "payment": {
      "payment_intent_id": "pi_...",
      "client_secret": "pi_..._secret_...",
      "publishable_key": "pk_test_...",
      "amount": 2644
    }
  }
}
```

**Server-Side Operations (in order):**

1. **Idempotency check** — Check Redis, then DB. If key exists, return existing order.
2. **Full validation** — Same as checkout/preview. Every field re-validated.
3. **Recalculate prices** — Never trust client-side totals.
4. **Validate promo** — Re-check eligibility, increment `current_uses`.
5. **Validate loyalty** — Check balance, calculate earn/redeem.
6. **Generate order number** — `SB-YYYYMMDD-NNN` format, sequential per day.
7. **Insert order** — `orders` + `order_items` + `order_item_modifiers` in a single transaction.
8. **Create Stripe PaymentIntent** — Amount = order total. Metadata includes order_id.
9. **Insert payment record** — Link PaymentIntent to order.
10. **Store idempotency key in Redis** — 24h TTL.
11. **Clear cart** — Remove all cart items.
12. **Enqueue notifications** — "Order received" push notification (async).

**Edge Cases:**
- Duplicate idempotency key → `200` with existing order (not 201)
- Race condition on idempotency → DB unique constraint catches it, returns existing order
- Stripe PaymentIntent fails → `502 PAYMENT_INIT_FAILED`. Order is NOT created.
- Item price changed since preview → Order uses current prices. Response includes `price_warnings`.
- Item became unavailable → `400 ITEM_UNAVAILABLE`
- Store went offline between preview and checkout → `400 STORE_CLOSED`
- Promo expired between preview and checkout → `400 PROMO_EXPIRED`. Order created without discount.

**Error Codes:**
- `400 CART_EMPTY`
- `400 STORE_CLOSED`
- `400 STORE_AT_CAPACITY`
- `400 ITEM_UNAVAILABLE`
- `400 INVALID_MODIFIER`
- `400 PROMO_EXPIRED`
- `400 INSUFFICIENT_POINTS`
- `400 INVALID_SCHEDULED_TIME`
- `409 DUPLICATE_ORDER` (idempotency key already used — returns existing order)
- `502 PAYMENT_INIT_FAILED`

---

## 6. Order APIs

### 6.1 Get My Orders

Returns the customer's order history.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/orders/mine` |
| **Auth** | `customer` |
| **Query Params** | `limit` (default 20, max 50), `cursor` (order ID for pagination), `status` (filter) |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "order_number": "SB-20260406-042",
      "status": "ready",
      "total": 2644,
      "item_count": 2,
      "store_name": "StormBurger Inglewood",
      "created_at": "2026-04-06T20:42:00.000Z",
      "estimated_pickup_at": "2026-04-06T21:00:00.000Z"
    }
  ],
  "meta": {
    "has_more": true,
    "next_cursor": "uuid"
  }
}
```

---

### 6.2 Get Order Detail

Returns full order details including items and payment.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/orders/:orderId` |
| **Auth** | `customer` (own orders) or `staff+` (any order) |

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "order_number": "SB-20260406-042",
    "status": "preparing",
    "store": {
      "id": "uuid",
      "name": "StormBurger Inglewood",
      "address": "1500 N La Brea Ave, Inglewood, CA 90302",
      "phone": "(310) 555-0100"
    },
    "items": [
      {
        "id": "uuid",
        "name": "Classic StormBurger Combo",
        "quantity": 2,
        "unit_price": 1449,
        "total_price": 2898,
        "category": "combos",
        "modifiers": [
          { "name": "Bacon", "group": "Choose Your Toppings", "price_adjustment": 150 },
          { "name": "Sprite", "group": "Choose Your Drink", "price_adjustment": 0 }
        ],
        "special_instructions": null
      }
    ],
    "pricing": {
      "subtotal": 2898,
      "discount_amount": 580,
      "promo_code": "STORM20",
      "tax_rate": 0.0975,
      "tax_amount": 226,
      "tip_amount": 200,
      "loyalty_points_redeemed": 100,
      "total": 2644
    },
    "loyalty_points_earned": 26,
    "special_instructions": "Ring the bell please",
    "payment": {
      "method": "apple_pay",
      "status": "captured",
      "last4": "4242"
    },
    "timeline": {
      "created_at": "2026-04-06T20:42:00.000Z",
      "confirmed_at": "2026-04-06T20:42:30.000Z",
      "preparing_at": "2026-04-06T20:45:00.000Z",
      "ready_at": null,
      "picked_up_at": null
    },
    "estimated_pickup_at": "2026-04-06T21:00:00.000Z"
  }
}
```

**Edge Cases:**
- Order not found → `404 ORDER_NOT_FOUND`
- Order belongs to another user (customer role) → `403 FORBIDDEN`

---

### 6.3 Get Active Order

Returns the user's most recent active order (not picked_up/cancelled/refunded). Used by the home screen to show current order status.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/orders/active` |
| **Auth** | `customer` |

**Response (200):** Order object (same as 6.2) or `null` if no active order.

---

### 6.4 Cancel Order

Customer cancels their own order. Only allowed before preparation starts.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/orders/:orderId/cancel` |
| **Auth** | `customer` |

**Request Body:**
```json
{
  "reason": "Changed my mind"
}
```

**Response (200):**
```json
{
  "data": {
    "order_id": "uuid",
    "status": "cancelled",
    "refund": {
      "amount": 2644,
      "status": "refunded"
    }
  }
}
```

**Validation:**
- Order must belong to the requesting user
- Order status must be `pending` or `confirmed`
- Orders in `preparing`, `ready`, or `picked_up` cannot be cancelled by customers

**Edge Cases:**
- Already preparing → `400 ORDER_ALREADY_PREPARING`
- Already cancelled → `400 ORDER_ALREADY_CANCELLED`
- Not the order owner → `403 FORBIDDEN`

**Side Effects:**
- Order status → cancelled
- Stripe refund initiated (full amount)
- Payment status → refunded
- Loyalty points earned from this order are revoked
- Promo redemption record removed, `current_uses` decremented
- Push notification: "Your order has been cancelled"
- Audit log entry

---

## 7. Loyalty APIs

### 7.1 Get Loyalty Account

Returns the customer's loyalty balance and tier.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/loyalty` |
| **Auth** | `customer` |

**Response (200):**
```json
{
  "data": {
    "points_balance": 150,
    "lifetime_points": 450,
    "tier": "silver",
    "tier_benefits": {
      "earn_multiplier": 1.5,
      "perks": ["Priority pickup", "Free birthday item"]
    },
    "next_tier": {
      "name": "gold",
      "points_needed": 550,
      "benefits": ["2x points", "Free monthly item", "Exclusive menu access"]
    },
    "recent_activity": [
      {
        "type": "earn",
        "points": 26,
        "description": "Order SB-20260406-042",
        "created_at": "2026-04-06T20:42:00.000Z"
      },
      {
        "type": "redeem",
        "points": -100,
        "description": "Redeemed for $1.00 off",
        "created_at": "2026-04-06T20:42:00.000Z"
      }
    ]
  }
}
```

---

### 7.2 Get Loyalty Transactions

Full transaction history.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/loyalty/transactions` |
| **Auth** | `customer` |
| **Query Params** | `limit` (default 20), `cursor` |

**Response (200):** Array of transaction objects with pagination.

---

### 7.3 Get Redemption Options

Returns what the customer can redeem their points for.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/loyalty/redeem/options` |
| **Auth** | `customer` |

**Response (200):**
```json
{
  "data": {
    "available_points": 150,
    "options": [
      {
        "id": "dollar_off",
        "name": "$1 Off Your Order",
        "points_required": 100,
        "discount_cents": 100,
        "can_redeem": true
      },
      {
        "id": "free_fries",
        "name": "Free Storm Fries",
        "points_required": 200,
        "menu_item_id": "uuid",
        "can_redeem": false,
        "reason": "Need 50 more points"
      },
      {
        "id": "free_drink",
        "name": "Free Fountain Drink",
        "points_required": 150,
        "menu_item_id": "uuid",
        "can_redeem": true
      }
    ]
  }
}
```

---

## 8. Favorites APIs

### 8.1 Get Favorites

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/favorites` |
| **Auth** | `customer` |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "menu_item": {
        "id": "uuid",
        "name": "Classic StormBurger Combo",
        "price": 1299,
        "image_url": "https://..."
      },
      "created_at": "2026-04-01T10:00:00.000Z"
    }
  ]
}
```

---

### 8.2 Add Favorite

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/favorites` |
| **Auth** | `customer` |

**Request Body:**
```json
{
  "menu_item_id": "uuid"
}
```

**Response (201):** Favorite object.

**Edge Cases:**
- Already favorited → `409 ALREADY_FAVORITED`
- Item not found → `404 ITEM_NOT_FOUND`

---

### 8.3 Remove Favorite

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/api/favorites/:menuItemId` |
| **Auth** | `customer` |

**Response (200):**
```json
{
  "data": { "removed": true }
}
```

---

## 9. Notifications APIs

### 9.1 Register Push Token

Registers the device's push notification token.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/notifications/token` |
| **Auth** | `customer` |

**Request Body:**
```json
{
  "token": "fcm_or_apns_token",
  "platform": "ios",
  "device_id": "unique_device_id"
}
```

**Response (200):**
```json
{
  "data": { "registered": true }
}
```

---

### 9.2 Get Notification Preferences

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/notifications/preferences` |
| **Auth** | `customer` |

**Response (200):**
```json
{
  "data": {
    "order_updates": true,
    "promotions": true,
    "loyalty_updates": true
  }
}
```

---

### 9.3 Update Notification Preferences

| | |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/notifications/preferences` |
| **Auth** | `customer` |

**Request Body:**
```json
{
  "promotions": false
}
```

---

## 10. Catering / Events APIs

### 10.1 Submit Event Inquiry

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/events` |
| **Auth** | `customer` (optional — can be public with contact info) |

**Request Body:**
```json
{
  "contact_name": "Sarah Johnson",
  "contact_email": "sarah@company.com",
  "contact_phone": "+13105559876",
  "event_date": "2026-05-15",
  "event_time": "12:00",
  "event_type": "corporate",
  "guest_count": 50,
  "location_description": "123 Main St, Los Angeles, CA — outdoor parking lot",
  "dietary_requirements": "5 vegetarian options needed"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "status": "submitted",
    "message": "We'll be in touch within 24 hours!"
  }
}
```

**Side Effects:**
- Email sent to events@stormburger.com (async)
- Record created in admin dashboard
- Audit log entry

---

### 10.2 Get My Event Inquiries

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/events/mine` |
| **Auth** | `customer` |

**Response (200):** Array of event request objects with status.

---

## 11. Admin: Order Management APIs

### 11.1 Get Active Orders

Returns all active orders for the kitchen dashboard. Real-time updates via Supabase Realtime, but this endpoint provides the initial load and polling fallback.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/orders` |
| **Auth** | `staff+` |
| **Query Params** | `store_id` (required for non-admin staff), `status` (filter), `limit` |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "order_number": "SB-20260406-042",
      "status": "pending",
      "store": { "id": "uuid", "name": "StormBurger Inglewood" },
      "customer_name": "John S.",
      "items": [
        {
          "name": "Classic StormBurger Combo",
          "quantity": 2,
          "modifiers": ["Bacon", "Sprite"],
          "special_instructions": null
        }
      ],
      "total": 2644,
      "special_instructions": "Ring the bell please",
      "scheduled_for": null,
      "estimated_pickup_at": "2026-04-06T21:00:00.000Z",
      "created_at": "2026-04-06T20:42:00.000Z",
      "time_since_created": "3 min ago"
    }
  ]
}
```

---

### 11.2 Update Order Status

Advances an order through the fulfillment pipeline.

| | |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/orders/:orderId/status` |
| **Auth** | `staff+` |

**Request Body:**
```json
{
  "status": "confirmed"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "order_number": "SB-20260406-042",
    "status": "confirmed",
    "confirmed_at": "2026-04-06T20:42:30.000Z"
  }
}
```

**Valid Transitions:**

| From | Allowed To |
|---|---|
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `preparing`, `cancelled` |
| `preparing` | `ready`, `cancelled` |
| `ready` | `picked_up` |
| `picked_up` | (terminal) |
| `cancelled` | (terminal) |
| `refunded` | (terminal) |

**Edge Cases:**
- Invalid transition → `400 INVALID_STATUS_TRANSITION`
- Order not found → `404 ORDER_NOT_FOUND`

**Side Effects:**
- Timestamp column updated (confirmed_at, preparing_at, ready_at, picked_up_at)
- Push notification sent to customer (async)
- If `picked_up`: loyalty points awarded (async)
- If `cancelled`: refund initiated, loyalty points revoked
- Audit log entry
- Supabase Realtime broadcasts the change

---

### 11.3 Issue Refund

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/orders/:orderId/refund` |
| **Auth** | `manager+` |

**Request Body:**
```json
{
  "amount": 2644,
  "reason": "Customer received wrong order"
}
```

**Response (200):**
```json
{
  "data": {
    "refund_amount": 2644,
    "payment_status": "refunded",
    "order_status": "refunded",
    "stripe_refund_id": "re_..."
  }
}
```

**Validation:**
- Amount cannot exceed original payment amount
- Partial refunds allowed (payment status → `partially_refunded`)
- Full refund changes order status to `refunded`
- Cannot refund an already fully refunded order

**Side Effects:**
- Stripe refund created
- Payment record updated
- Order status updated (if full refund)
- Loyalty points earned from this order revoked
- Push notification to customer
- Audit log with refund details and staff member who issued it

---

## 12. Admin: Menu Management APIs

### 12.1 List All Menu Items

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/menu/items` |
| **Auth** | `manager+` |
| **Query Params** | `category`, `is_active`, `search` |

**Response (200):** Array of all menu items (including inactive) with full details.

---

### 12.2 Create Menu Item

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/menu/items` |
| **Auth** | `admin` |

**Request Body:**
```json
{
  "name": "Mushroom Swiss Burger",
  "slug": "mushroom-swiss-burger",
  "category_id": "uuid",
  "description": "Sautéed mushrooms and Swiss cheese on a beef patty",
  "base_price": 1149,
  "image_url": "https://...",
  "calories": 680,
  "prep_time_minutes": 10,
  "tags": ["new"],
  "modifier_group_ids": ["uuid", "uuid"],
  "store_availability": [
    { "store_id": "uuid", "is_available": true, "price_override": null },
    { "store_id": "uuid", "is_available": true, "price_override": 1199 }
  ]
}
```

**Response (201):** Created item with full details.

**Side Effects:**
- Menu cache invalidated for affected stores
- Audit log entry

---

### 12.3 Update Menu Item

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/api/admin/menu/items/:itemId` |
| **Auth** | `manager+` |

**Request Body:** Same as create (all fields optional for partial update).

**Response (200):** Updated item.

**Side Effects:**
- Menu cache invalidated
- Audit log with field-level diff

---

### 12.4 Toggle Item Active/Inactive

| | |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/menu/items/:itemId/toggle` |
| **Auth** | `manager+` |

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "name": "Mushroom Swiss Burger",
    "is_active": false
  }
}
```

---

### 12.5 Update Store Availability

Toggle item availability or price for a specific store.

| | |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/menu/items/:itemId/stores/:storeId` |
| **Auth** | `manager+` |

**Request Body:**
```json
{
  "is_available": false,
  "price_override": 1199
}
```

**Response (200):** Updated availability record.

---

## 13. Admin: Store Management APIs

### 13.1 Update Store Settings

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/api/admin/stores/:storeId` |
| **Auth** | `admin` |

**Request Body:**
```json
{
  "name": "StormBurger Inglewood",
  "phone": "(310) 555-0100",
  "is_accepting_orders": false,
  "estimated_prep_minutes": 25,
  "max_orders_per_window": 20,
  "tax_rate": 0.0975
}
```

**Response (200):** Updated store.

---

### 13.2 Update Store Hours

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/api/admin/stores/:storeId/hours` |
| **Auth** | `admin` |

**Request Body:**
```json
{
  "hours": [
    { "day_of_week": 0, "open_time": "11:00", "close_time": "21:00", "is_closed": false },
    { "day_of_week": 1, "open_time": "10:30", "close_time": "22:00", "is_closed": false },
    { "day_of_week": 2, "open_time": "10:30", "close_time": "22:00", "is_closed": false },
    { "day_of_week": 3, "open_time": "10:30", "close_time": "22:00", "is_closed": false },
    { "day_of_week": 4, "open_time": "10:30", "close_time": "22:00", "is_closed": false },
    { "day_of_week": 5, "open_time": "10:30", "close_time": "23:00", "is_closed": false },
    { "day_of_week": 6, "open_time": "10:30", "close_time": "23:00", "is_closed": false }
  ]
}
```

**Response (200):** Updated hours.

---

### 13.3 Toggle Order Acceptance

Emergency kill switch — stop accepting orders at a location.

| | |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/stores/:storeId/accepting` |
| **Auth** | `manager+` |

**Request Body:**
```json
{
  "is_accepting_orders": false,
  "reason": "Kitchen equipment failure"
}
```

**Response (200):**
```json
{
  "data": {
    "store_id": "uuid",
    "is_accepting_orders": false,
    "reason": "Kitchen equipment failure"
  }
}
```

**Side Effects:**
- New orders immediately rejected with `STORE_CLOSED`
- Existing orders in progress are NOT affected
- Audit log entry

---

## 14. Webhook Endpoints

### 14.1 Stripe Payment Webhook

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/webhooks/stripe` |
| **Auth** | `webhook` (Stripe-Signature verification) |

**Handled Events:**

| Event | Action |
|---|---|
| `payment_intent.succeeded` | Update payment → `captured`. Update order → `confirmed`. Enqueue confirmation notification. |
| `payment_intent.payment_failed` | Update payment → `failed`. Enqueue failure notification. |
| `charge.refunded` | Update payment → `refunded`. Update order → `refunded`. Revoke loyalty points. |
| `charge.dispute.created` | Flag order for review. Notify admin. |

**Response:** Always `200 { "received": true }` to prevent Stripe retries on handled events.

**Security:**
- Raw body preserved for signature verification
- `stripe.webhooks.constructEvent(body, sig, secret)` — reject if invalid
- Idempotent — processing the same event twice has no side effects
- Events logged to audit_logs

---

## 15. Error Code Reference

| Code | HTTP | Description |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Request body failed validation. `details` contains field-level errors. |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token. |
| `FORBIDDEN` | 403 | User lacks permission for this action. |
| `NOT_FOUND` | 404 | Resource not found. |
| `STORE_NOT_FOUND` | 404 | Store ID doesn't exist or is inactive. |
| `STORE_CLOSED` | 400 | Store is not currently accepting orders. |
| `STORE_AT_CAPACITY` | 400 | Store has reached max orders for this time window. |
| `ITEM_NOT_FOUND` | 404 | Menu item doesn't exist. |
| `ITEM_UNAVAILABLE` | 400 | Menu item not available at this store. |
| `INVALID_MODIFIER` | 400 | Modifier doesn't exist or doesn't belong to this item. |
| `REQUIRED_MODIFIER_MISSING` | 400 | A required modifier group has no selection. |
| `MAX_SELECTIONS_EXCEEDED` | 400 | Too many modifiers selected for a group. |
| `CART_EMPTY` | 400 | Attempted checkout with empty cart. |
| `CART_ITEM_NOT_FOUND` | 404 | Cart item doesn't exist. |
| `DUPLICATE_ORDER` | 409 | Idempotency key already used. Existing order returned. |
| `ORDER_NOT_FOUND` | 404 | Order doesn't exist. |
| `ORDER_ALREADY_PREPARING` | 400 | Cannot cancel — order is being prepared. |
| `ORDER_ALREADY_CANCELLED` | 400 | Order is already cancelled. |
| `INVALID_STATUS_TRANSITION` | 400 | Invalid order status change. |
| `INVALID_PROMO_CODE` | 400 | Promo code doesn't exist. |
| `PROMO_EXPIRED` | 400 | Promo code has expired. |
| `PROMO_MAX_USES_REACHED` | 400 | Promo has reached its total use limit. |
| `PROMO_ALREADY_USED` | 400 | User has already used this promo. |
| `PROMO_MIN_NOT_MET` | 400 | Cart doesn't meet minimum order amount. |
| `PROMO_WRONG_STORE` | 400 | Promo not valid at this store. |
| `PROMO_NOT_VALID_NOW` | 400 | Promo not valid at this day/time. |
| `INSUFFICIENT_POINTS` | 400 | Not enough loyalty points to redeem. |
| `INVALID_SCHEDULED_TIME` | 400 | Scheduled pickup time is invalid. |
| `PAYMENT_INIT_FAILED` | 502 | Stripe PaymentIntent creation failed. |
| `PAYMENT_FAILED` | 400 | Payment was declined or failed. |
| `REFUND_FAILED` | 502 | Stripe refund failed. |
| `EMAIL_TAKEN` | 409 | Email already registered. |
| `PHONE_TAKEN` | 409 | Phone already registered. |
| `WEAK_PASSWORD` | 422 | Password doesn't meet requirements. |
| `INVALID_EMAIL` | 422 | Email format is invalid. |
| `TOKEN_EXPIRED` | 401 | Auth token has expired. |
| `RATE_LIMITED` | 429 | Too many requests. `Retry-After` header included. |
| `INTERNAL_ERROR` | 500 | Unexpected server error. |

---

## 16. Rate Limits

| Endpoint Group | Limit | Window | Key |
|---|---|---|---|
| Auth (signup, signin) | 10 requests | 15 minutes | IP address |
| Menu (read) | 100 requests | 1 minute | IP address |
| Cart (write) | 30 requests | 1 minute | User ID |
| Checkout | 5 requests | 15 minutes | User ID |
| Orders (read) | 60 requests | 1 minute | User ID |
| Admin (all) | 120 requests | 1 minute | User ID |

Rate limited responses return `429` with `Retry-After` header (seconds until reset).

---

*This API specification covers the complete V1 surface area for StormBurger. All endpoints are designed for the mobile-first experience with consistent error handling, idempotent mutations, and clear separation between customer, admin, and internal webhook interfaces.*
