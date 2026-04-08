# StormBurger — Technical Architecture Blueprint

**Version:** 1.0
**Date:** April 6, 2026
**Author:** Engineering
**Status:** Active

---

## 1. Overall System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                     │
│                                                                     │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│   │  Mobile App   │    │   Admin       │    │  Kitchen     │         │
│   │  (React       │    │   Dashboard   │    │  Tablet      │         │
│   │   Native)     │    │   (React)     │    │  (React)     │         │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘         │
│          │                   │                   │                   │
└──────────┼───────────────────┼───────────────────┼───────────────────┘
           │                   │                   │
           │ HTTPS             │ HTTPS             │ WSS (Realtime)
           │                   │                   │
┌──────────┼───────────────────┼───────────────────┼───────────────────┐
│          ▼                   ▼                   │                   │
│   ┌──────────────────────────────────┐           │                   │
│   │         API Gateway / LB         │           │                   │
│   │      (Nginx / Cloud LB)         │           │                   │
│   └──────────────┬───────────────────┘           │                   │
│                  │                               │                   │
│                  ▼                               │                   │
│   ┌──────────────────────────────────┐           │                   │
│   │        NestJS Backend            │           │                   │
│   │                                  │           │                   │
│   │  ┌────────┐ ┌────────┐          │           │                   │
│   │  │ Orders │ │Payments│          │           │                   │
│   │  └────────┘ └────────┘          │           │                   │
│   │  ┌────────┐ ┌────────┐          │           │                   │
│   │  │  Menu  │ │  Auth  │          │           │                   │
│   │  └────────┘ └────────┘          │           │                   │
│   │  ┌────────┐ ┌────────┐          │           │                   │
│   │  │Loyalty │ │ Promos │          │           │                   │
│   │  └────────┘ └────────┘          │           │                   │
│   │  ┌────────┐ ┌────────┐          │           │                   │
│   │  │  POS   │ │Catering│          │           │                   │
│   │  └────────┘ └────────┘          │           │                   │
│   └──────────────┬───────────────────┘           │                   │
│                  │                               │                   │
│        ┌─────────┼──────────┐                    │                   │
│        │         │          │                    │                   │
│        ▼         ▼          ▼                    ▼                   │
│   ┌────────┐ ┌────────┐ ┌──────────────────────────────┐           │
│   │ Redis  │ │ Stripe │ │        Supabase              │           │
│   │        │ │        │ │                              │           │
│   │ Cache  │ │Payment │ │  ┌──────────┐ ┌──────────┐  │           │
│   │ Queues │ │Process │ │  │ Postgres │ │   Auth   │  │           │
│   │ Rate   │ │        │ │  │    DB    │ │          │  │           │
│   │ Limit  │ │        │ │  └──────────┘ └──────────┘  │           │
│   │        │ │        │ │  ┌──────────┐ ┌──────────┐  │           │
│   └────────┘ └────────┘ │  │ Storage  │ │ Realtime │──┼───────────┘
│                         │  │ (images) │ │  (WSS)   │  │
│                         │  └──────────┘ └──────────┘  │
│                         └──────────────────────────────┘
│                                                                     │
│                         INFRASTRUCTURE                              │
└─────────────────────────────────────────────────────────────────────┘
```

**Data flow principle:** Clients never write directly to the database for business-critical operations. All mutations that involve money, inventory, or order state flow through the NestJS backend, which validates, orchestrates, and commits as a single authority.

Clients may read directly from Supabase for public data (menu, locations) and subscribe to Realtime channels for live updates (order status).

---

## 2. Responsibility Boundaries

### 2.1 Supabase Responsibilities

Supabase is the **data platform** — it stores, authenticates, serves files, and pushes real-time events. It does not contain business logic.

| Responsibility | How |
|---|---|
| **Postgres Database** | All tables, indexes, RLS policies, and triggers |
| **Authentication** | User sign-up, sign-in, JWT issuance, session management, password reset |
| **Row-Level Security** | Customers see only their own orders; staff see all orders; public reads for menu/locations |
| **Realtime** | WebSocket subscriptions for `orders` table changes — kitchen dashboard receives instant updates |
| **Storage** | Menu item images, receipt PDFs, location photos |
| **Edge Functions** | Lightweight webhooks or transformations that don't justify a full backend call (e.g., email triggers) |

**What Supabase does NOT do:**
- Order creation or validation
- Payment processing
- Price calculation or tax computation
- Promo code validation
- Loyalty point calculation
- Any write that involves multiple tables or external services

### 2.2 NestJS Responsibilities

NestJS is the **business logic layer** — it orchestrates operations, validates requests, enforces business rules, and coordinates between Supabase, Stripe, Redis, and external services.

| Responsibility | Module |
|---|---|
| **Order orchestration** | OrdersModule — validate items, calculate prices, apply promos, create order atomically, assign order number |
| **Payment processing** | PaymentsModule — create Stripe PaymentIntent, handle webhooks, manage refunds |
| **Menu serving** | MenuModule — serve location-specific menus with price overrides and availability |
| **Promo validation** | PromosModule (V2) — validate codes, calculate discounts, enforce usage limits |
| **Loyalty** | LoyaltyModule (V2) — calculate points, process redemptions, manage tiers |
| **POS integration** | POSModule (V2) — send orders to Toast, sync menu data |
| **Catering** | CateringModule (V2) — receive inquiries, send notifications |
| **Notifications** | NotificationsModule — push notifications via FCM/APNs on order status changes |
| **Auth middleware** | Extract and validate Supabase JWT from Authorization header |
| **Rate limiting** | Protect endpoints from abuse using Redis-backed rate limiters |
| **Idempotency** | Prevent duplicate orders using idempotency keys |

### 2.3 Redis Responsibilities

Redis serves three purposes: caching, queuing, and rate limiting. It is not a primary data store.

| Responsibility | Pattern |
|---|---|
| **Menu cache** | Cache full menu per location with 5-minute TTL. Invalidate on admin menu update. Eliminates repeated DB queries for the most common read. |
| **Rate limiting** | Sliding window rate limiter on order creation (max 5 orders per user per 15 minutes) and payment intent creation (max 10 per user per hour). |
| **Order throttling** | Per-location order counter with 15-minute window. When the location hits its max (configurable, default 30), new orders are rejected with "Location is currently at capacity." |
| **Async job queue** | BullMQ queues for: push notification delivery, email sending, POS order injection, analytics event processing. Failed jobs retry with exponential backoff. |
| **Idempotency cache** | Store idempotency keys with 24-hour TTL for fast duplicate detection before hitting the database. |

---

## 3. Mobile App Architecture

```
┌─────────────────────────────────────────────┐
│                  App.tsx                     │
│           StripeProvider + Navigation        │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │           Navigation                │   │
│   │   Auth Stack ←→ Main Stack          │   │
│   │   (conditional on auth state)       │   │
│   └─────────────────────────────────────┘   │
│                                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│   │ Screens  │  │  Stores  │  │ Services │ │
│   │          │  │ (Zustand)│  │          │ │
│   │ Auth     │  │          │  │ api.ts   │ │
│   │ Location │  │ authStore│  │ (HTTP)   │ │
│   │ Menu     │  │ cartStore│  │          │ │
│   │ Item     │  │ location │  │ supabase │ │
│   │ Cart     │  │ Store    │  │ .ts      │ │
│   │ Checkout │  │          │  │ (auth +  │ │
│   │ Confirm  │  │          │  │ realtime)│ │
│   │ Orders   │  │          │  │          │ │
│   │ Profile  │  │          │  │          │ │
│   └──────────┘  └──────────┘  └──────────┘ │
│                                             │
│   ┌──────────┐  ┌──────────┐               │
│   │Components│  │  Theme   │               │
│   │          │  │          │               │
│   │ Reusable │  │ colors   │               │
│   │ UI parts │  │ typo     │               │
│   │          │  │ spacing  │               │
│   └──────────┘  └──────────┘               │
└─────────────────────────────────────────────┘
```

**Key architectural decisions:**

1. **Two service layers.** `api.ts` handles all HTTP requests to the NestJS backend. `supabase.ts` handles authentication and Realtime subscriptions. The mobile app never writes to Supabase directly for business operations.

2. **Zustand for state.** Three stores — `authStore` (session, user), `cartStore` (items, location), `locationStore` (selected location, list). Stores are independent and composable. No prop drilling.

3. **Stripe Payment Sheet.** The app uses Stripe's prebuilt Payment Sheet UI — we never handle raw card numbers. The flow is: create order → get `client_secret` from backend → `initPaymentSheet` → `presentPaymentSheet`.

4. **Offline resilience.** Menu data is cached in Zustand after first load. Cart persists in memory. Authentication tokens are persisted in AsyncStorage by Supabase SDK. If the network drops, the user can still browse but cannot place orders.

5. **Navigation structure:**
   - Unauthenticated: Auth screen (sign in / sign up)
   - Authenticated: Bottom tabs (Home, Orders, Profile) with stack navigation within each tab

---

## 4. Backend Service Architecture

```
server/
├── src/
│   ├── main.ts                          # App bootstrap, global pipes, CORS
│   ├── app.module.ts                    # Root module, imports all feature modules
│   │
│   ├── config/
│   │   ├── supabase.module.ts           # Global Supabase client provider
│   │   ├── supabase.config.ts           # Public, user-scoped, and admin clients
│   │   ├── redis.module.ts              # Redis connection + BullMQ setup
│   │   └── stripe.config.ts             # Stripe client initialization
│   │
│   ├── common/
│   │   ├── guards/
│   │   │   ├── auth.guard.ts            # Validates Supabase JWT, attaches user to request
│   │   │   ├── roles.guard.ts           # Enforces role-based access (staff, manager, admin)
│   │   │   └── throttle.guard.ts        # Redis-backed rate limiting
│   │   ├── decorators/
│   │   │   ├── current-user.ts          # @CurrentUser() parameter decorator
│   │   │   └── roles.ts                 # @Roles('admin') decorator
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts # Consistent error response format
│   │   └── interceptors/
│   │       └── logging.interceptor.ts   # Request/response logging with duration
│   │
│   ├── modules/
│   │   ├── auth/                        # JWT validation, user profile CRUD
│   │   ├── locations/                   # Location listing, hours, open status
│   │   ├── menu/                        # Menu serving, item detail with modifiers
│   │   ├── orders/                      # Order creation, validation, status management
│   │   ├── payments/                    # Stripe PaymentIntent, webhooks, refunds
│   │   ├── notifications/              # Push notification dispatch (FCM/APNs)
│   │   ├── loyalty/                     # (V2) Points, tiers, redemption
│   │   ├── promos/                      # (V2) Promo code validation and application
│   │   ├── catering/                    # (V2) Inquiry submission and tracking
│   │   └── pos/                         # (V2) Toast POS order injection
│   │
│   └── jobs/
│       ├── notification.processor.ts    # BullMQ worker: send push notifications
│       ├── pos-sync.processor.ts        # BullMQ worker: sync orders to Toast
│       └── analytics.processor.ts       # BullMQ worker: process analytics events
│
├── test/
├── .env
├── nest-cli.json
├── tsconfig.json
└── package.json
```

**Module interaction rules:**

1. Modules communicate through exported services, never through direct database access across module boundaries.
2. The `OrdersModule` is the orchestrator — it calls `MenuService` for price validation, `PaymentsService` for payment creation, `LoyaltyService` for points, and `NotificationsService` for alerts.
3. Async operations (notifications, POS sync, analytics) are dispatched to BullMQ queues and processed by workers. The order creation response does not wait for these.

---

## 5. Admin Dashboard Architecture

```
apps/admin/
├── src/
│   ├── App.tsx                    # Router + layout shell
│   ├── pages/
│   │   ├── OrdersDashboard.tsx    # Real-time order management
│   │   ├── MenuManager.tsx        # Item CRUD, availability, pricing
│   │   ├── LocationManager.tsx    # Location settings, hours
│   │   ├── ReportsPage.tsx        # Sales and operations analytics
│   │   ├── StaffManager.tsx       # Staff accounts and roles
│   │   ├── PromosPage.tsx         # (V2) Promo code management
│   │   ├── LoyaltyPage.tsx        # (V2) Loyalty program config
│   │   └── CateringPage.tsx       # (V2) Inquiry management
│   ├── components/
│   │   ├── OrderCard.tsx          # Single order display with actions
│   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   └── StatsCard.tsx          # Dashboard metric card
│   ├── hooks/
│   │   ├── useOrders.ts           # Realtime order subscription
│   │   ├── useAuth.ts             # Admin authentication
│   │   └── useApi.ts              # API client wrapper
│   └── services/
│       └── supabase.ts            # Supabase client for auth + realtime
```

**Key decisions:**

1. The admin dashboard authenticates through Supabase Auth (same user table, role = staff/manager/admin).
2. Real-time order updates use Supabase Realtime WebSocket subscriptions directly — no backend polling.
3. All write operations (status updates, menu changes) go through the NestJS API, not direct Supabase writes, to maintain the single-authority principle.
4. The dashboard is a static React SPA deployed to Vercel/Netlify/Cloudflare Pages.

---

## 6. API Classification

### 6.1 Public APIs (Mobile App — Authenticated Customer)

These endpoints require a valid Supabase JWT but are available to any authenticated user with the `customer` role.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/locations` | List all active locations |
| GET | `/api/locations/:id` | Location detail |
| GET | `/api/locations/:id/hours` | Operating hours |
| GET | `/api/locations/:id/status` | Is the location currently open? |
| GET | `/api/menu/location/:locationId` | Full menu for a location |
| GET | `/api/menu/items/:id` | Item detail with modifiers |
| POST | `/api/orders` | Create a new order |
| GET | `/api/orders/mine` | Customer's order history |
| GET | `/api/orders/:id` | Order detail (own orders only) |
| POST | `/api/payments/intent/:orderId` | Create Stripe PaymentIntent |
| POST | `/api/promos/validate` | (V2) Validate a promo code |
| GET | `/api/loyalty/balance` | (V2) Loyalty points balance |
| POST | `/api/loyalty/redeem` | (V2) Redeem loyalty points |
| POST | `/api/catering/inquire` | (V2) Submit catering inquiry |

### 6.2 Admin APIs (Dashboard — Staff/Manager/Admin)

These endpoints require a Supabase JWT with role `staff`, `manager`, or `admin`.

| Method | Endpoint | Required Role | Purpose |
|---|---|---|---|
| PATCH | `/api/orders/:id/status` | staff+ | Update order status |
| GET | `/api/orders/active` | staff+ | All active orders (kitchen feed) |
| PUT | `/api/menu/items/:id` | manager+ | Edit menu item |
| PATCH | `/api/menu/items/:id/toggle` | manager+ | Toggle item active/inactive |
| PATCH | `/api/menu/locations/:locId/items/:itemId` | manager+ | Update location-specific availability/price |
| POST | `/api/menu/items` | admin | Create new menu item |
| DELETE | `/api/menu/items/:id` | admin | Remove menu item |
| PUT | `/api/locations/:id` | admin | Update location settings |
| POST | `/api/locations` | admin | Add new location |
| GET | `/api/reports/sales` | manager+ | Sales report data |
| GET | `/api/reports/items` | manager+ | Item performance data |
| POST | `/api/staff` | admin | Create staff account |
| PATCH | `/api/staff/:id` | admin | Update staff role/status |
| POST | `/api/payments/refund/:orderId` | manager+ | Issue refund |
| POST | `/api/promos` | admin | (V2) Create promo code |
| PUT | `/api/loyalty/config` | admin | (V2) Update loyalty program settings |

### 6.3 Webhook Endpoints (No Auth — Signature Verified)

| Method | Endpoint | Source | Purpose |
|---|---|---|---|
| POST | `/api/payments/webhook` | Stripe | Payment status updates |
| POST | `/api/pos/webhook` | Toast (V2) | POS sync confirmations |

---

## 7. Async Events and Queue Architecture

Not all operations need to complete before the API responds. Operations that are non-blocking to the user experience are dispatched to BullMQ queues backed by Redis.

### 7.1 Queue Definitions

| Queue | Trigger | Job | Retry Policy |
|---|---|---|---|
| `notifications` | Order status change | Send push notification to customer | 3 retries, exponential backoff (5s, 30s, 120s) |
| `pos-sync` | Order confirmed (V2) | Inject order into Toast POS | 5 retries, 30s intervals |
| `email` | Catering inquiry, password reset | Send transactional email | 3 retries, 60s intervals |
| `analytics` | Any tracked event | Write to analytics store | 5 retries, no backoff (fire-and-forget) |
| `loyalty` | Order picked up (V2) | Calculate and award loyalty points | 3 retries, 10s intervals |

### 7.2 Event Flow Example: Order Lifecycle

```
Customer taps "Pay"
    │
    ▼
POST /api/orders (sync)
    ├── Validate items and modifiers
    ├── Calculate prices, tax, total
    ├── Check idempotency key
    ├── Insert order + order_items + order_item_modifiers
    └── Return order to client
    │
    ▼
POST /api/payments/intent/:orderId (sync)
    ├── Create Stripe PaymentIntent
    ├── Insert payment record
    └── Return client_secret
    │
    ▼
Stripe Payment Sheet (client-side)
    │
    ▼
POST /api/payments/webhook (async from Stripe)
    ├── Verify signature
    ├── Update payment status → captured
    ├── Update order status → confirmed
    ├── ENQUEUE: notification (customer: "Order confirmed!")
    ├── ENQUEUE: pos-sync (send to Toast) [V2]
    └── ENQUEUE: analytics (order_confirmed event)
    │
    ▼
Kitchen dashboard receives order via Supabase Realtime
    │
    ▼
Staff taps "Start Preparing"
    ├── PATCH /api/orders/:id/status → preparing
    ├── ENQUEUE: notification (customer: "Being prepared!")
    └── Supabase Realtime broadcasts update
    │
    ▼
Staff taps "Mark Ready"
    ├── PATCH /api/orders/:id/status → ready
    ├── ENQUEUE: notification (customer: "Ready for pickup!")
    └── Supabase Realtime broadcasts update
    │
    ▼
Staff taps "Picked Up"
    ├── PATCH /api/orders/:id/status → picked_up
    ├── ENQUEUE: loyalty (award points) [V2]
    └── ENQUEUE: analytics (order_completed event)
```

---

## 8. Security Architecture

### 8.1 Authentication Flow

```
Mobile App                  NestJS                    Supabase
    │                         │                          │
    │── signUp(email,pass) ──────────────────────────────▶│
    │◀─ JWT + refresh_token ─────────────────────────────│
    │                         │                          │
    │── API request ─────────▶│                          │
    │   Authorization:        │── getUser(JWT) ─────────▶│
    │   Bearer <JWT>          │◀─ user object ──────────│
    │                         │                          │
    │                         │── business logic ──────▶│
    │◀─ response ────────────│                          │
```

1. All authentication is handled by Supabase Auth. The NestJS backend never stores passwords.
2. Every API request includes the Supabase JWT in the `Authorization` header.
3. The `AuthGuard` on the backend calls `supabase.auth.getUser(jwt)` to validate the token and extract the user ID.
4. The `RolesGuard` queries the `users` table (via `get_user_role()` function) to check the user's role.

### 8.2 Security Boundaries

| Boundary | Protection |
|---|---|
| **Client → Backend** | HTTPS/TLS 1.3 only. No HTTP. HSTS headers. |
| **Backend → Supabase** | Service role key for admin operations. Never exposed to clients. |
| **Backend → Stripe** | Secret key server-side only. Publishable key in mobile app. |
| **Backend → Redis** | Private network only. No public access. Password-protected. |
| **Payment data** | Stripe tokenization. PCI compliance through Stripe. Card numbers never touch our systems. |
| **Webhook verification** | Stripe webhook signature verification. Reject unsigned payloads. |
| **Rate limiting** | Redis-backed sliding window: 5 orders/15min per user, 100 requests/min per IP. |
| **Input validation** | NestJS ValidationPipe with whitelist + forbidNonWhitelisted. All DTOs use class-validator. |
| **SQL injection** | Parameterized queries via Supabase client. No raw SQL from user input. |
| **XSS** | React auto-escapes. No dangerouslySetInnerHTML. Content-Security-Policy headers on admin. |

### 8.3 Sensitive Data Handling

| Data | Storage | Access |
|---|---|---|
| User passwords | Supabase Auth (bcrypt) | Never accessible, even to admins |
| Payment card numbers | Stripe (tokenized) | Never stored in our system |
| Stripe secret key | Server .env only | Never in client code or version control |
| Supabase service key | Server .env only | Never in client code |
| User email/phone | `users` table | RLS: user sees own, staff sees all |
| Order history | `orders` table | RLS: user sees own, staff sees all |

---

## 9. Duplicate Order Prevention

Duplicate orders are the single most expensive bug in a food ordering system. A customer double-tapping "Pay" should never result in two charges or two orders.

### 9.1 Defense in Depth (4 layers)

**Layer 1: Client-side**
Each checkout generates a UUID v4 `idempotency_key` before the first API call. This key is reused for retries. The "Pay" button is disabled after the first tap.

**Layer 2: Redis fast-check**
Before hitting the database, the backend checks Redis for the idempotency key. If found, return the cached order immediately. TTL: 24 hours.

**Layer 3: Database constraint**
The `orders` table has a `UNIQUE` constraint on `idempotency_key`. If Redis misses (cold cache, race condition), the database rejects the duplicate insert. The backend catches the unique violation error (code `23505`) and returns the existing order.

**Layer 4: Stripe idempotency**
Stripe PaymentIntents are created with the order ID as metadata. Before creating a new intent, the backend checks if one already exists for this order. Stripe's own idempotency prevents duplicate charges.

```
Client                    Backend                  Redis           Postgres
  │                         │                       │                │
  │── POST /orders ────────▶│                       │                │
  │   {idempotency_key: X}  │── GET key:X ─────────▶│                │
  │                         │◀─ MISS ──────────────│                │
  │                         │── INSERT order ───────────────────────▶│
  │                         │◀─ OK ────────────────────────────────│
  │                         │── SET key:X (24h) ───▶│                │
  │◀─ order ───────────────│                       │                │
  │                         │                       │                │
  │── POST /orders ────────▶│  (retry/double-tap)   │                │
  │   {idempotency_key: X}  │── GET key:X ─────────▶│                │
  │                         │◀─ HIT: order ────────│                │
  │◀─ same order ──────────│  (no DB hit)          │                │
```

---

## 10. Payment and Checkout Flow Protection

### 10.1 Server-Side Price Verification

The client sends item IDs and modifier IDs — never prices. The backend recalculates everything:

1. Look up each `menu_item_id` in the database — verify it exists and is active
2. Check `location_menu_items` — verify item is available at this location
3. Get the effective price: `price_override ?? base_price`
4. Look up each `modifier_id` — verify it belongs to a valid modifier group linked to this item
5. Sum modifier `price_adjustment` values
6. Calculate `unit_price = item_price + modifier_total`
7. Calculate `line_total = unit_price × quantity`
8. Sum all line totals → `subtotal`
9. Calculate `tax = round(subtotal × 0.0975)`
10. Calculate `total = subtotal + tax`

The client's cart total is never trusted. If there's a discrepancy (e.g., a price changed between browsing and checkout), the server's calculation wins.

### 10.2 Payment State Machine

```
                ┌──────────┐
                │  pending  │
                └─────┬────┘
                      │
            ┌─────────┼─────────┐
            ▼                   ▼
      ┌──────────┐        ┌──────────┐
      │authorized│        │  failed  │
      └─────┬────┘        └──────────┘
            │
            ▼
      ┌──────────┐
      │ captured │
      └─────┬────┘
            │
            ▼
      ┌──────────┐
      │ refunded │
      └──────────┘
```

- `pending`: PaymentIntent created, waiting for customer action
- `authorized`: Card hold placed (not used in current flow — we capture immediately)
- `captured`: Money collected. Order is confirmed.
- `failed`: Payment attempt failed. Customer can retry.
- `refunded`: Full or partial refund issued by manager.

### 10.3 Webhook Security

1. Raw request body is preserved (NestJS `rawBody: true` option)
2. Stripe signature is verified using `stripe.webhooks.constructEvent(body, sig, secret)`
3. Invalid signatures are rejected with 400
4. Webhook endpoint has no auth guard — Stripe cannot send JWTs
5. All webhook events are logged for audit

---

## 11. Failure Handling Strategy

### 11.1 Order Creation Failures

| Failure | Handling |
|---|---|
| Menu item no longer available | Return 400 with specific item name. Client removes from cart and shows message. |
| Location closed mid-checkout | Return 400 "Location is not accepting orders." Client returns to location select. |
| Database insert fails | Return 500. Client shows generic error with retry option. Idempotency key ensures retry is safe. |
| Stripe PaymentIntent creation fails | Return 500 with Stripe error. Order remains in `pending` status. Client can retry payment. |
| Payment fails (card declined) | Stripe Payment Sheet shows error. Order remains pending. Client can try different card. |
| Webhook delivery fails | Stripe retries with exponential backoff for up to 72 hours. Order stays in `pending` until webhook succeeds. Dashboard shows pending orders for manual review. |

### 11.2 Real-Time Connection Failures

| Failure | Handling |
|---|---|
| Kitchen WebSocket disconnects | Auto-reconnect with 1/5/15/30 second backoff. Show "Reconnecting..." banner. Fall back to polling every 10 seconds after 60 seconds of failed WebSocket. |
| Customer Realtime drops | App polls order status every 15 seconds as fallback. Status badge shows "Last updated: X ago." |

### 11.3 Queue Job Failures

| Queue | Failure Handling |
|---|---|
| Push notification | 3 retries. If all fail, log error and move on. Notification is best-effort. |
| POS sync | 5 retries. If all fail, flag order in admin dashboard as "POS sync failed" for manual entry. |
| Email | 3 retries. Dead-letter queue for investigation. |

### 11.4 Circuit Breaker Pattern

External service calls (Stripe, Toast, notification services) use a circuit breaker:
- **Closed**: Normal operation. Track failures.
- **Open**: After 5 consecutive failures in 60 seconds, stop calling the service. Return cached/default response.
- **Half-open**: After 30 seconds, allow one request through. If it succeeds, close the circuit.

---

## 12. Scalability Strategy

### 12.1 Current Architecture (V1 — 2 locations, <10K users)

- Single NestJS instance on Railway/Render/Fly.io
- Supabase Pro plan (8GB RAM, 100GB storage)
- Redis on Upstash (serverless, pay-per-request)
- Admin dashboard on Vercel (static hosting)

### 12.2 Growth Phase (5–10 locations, 50K users)

- 2–3 NestJS instances behind a load balancer
- Supabase Team plan with read replicas
- Redis dedicated instance (Upstash Pro or AWS ElastiCache)
- Connection pooling via Supabase Supavisor
- CDN for menu images (Supabase Storage + CDN or Cloudflare)

### 12.3 Scale Phase (10+ locations, 200K+ users)

- Auto-scaling NestJS on Kubernetes (EKS/GKE) or serverless containers (Cloud Run)
- Supabase Enterprise or self-hosted Postgres with read replicas and connection pooling
- Redis cluster for cache + queues
- Dedicated BullMQ workers scaled independently from API servers
- Menu data served from edge cache (Cloudflare Workers or Redis Edge)
- Database query optimization: materialized views for reports, partitioned orders table by month

### 12.4 Database Scaling Considerations

| Table | Growth Rate | Strategy |
|---|---|---|
| `orders` | ~500/day at scale | Partition by `created_at` month. Archive orders older than 1 year to cold storage. |
| `order_items` | ~1,500/day | Same partition strategy as orders (child table). |
| `menu_items` | Rarely changes | No scaling concern. |
| `users` | Grows with downloads | Index on `email`, `phone`. 200K rows is trivial for Postgres. |
| `payments` | 1:1 with orders | Same partition strategy as orders. |

---

## 13. Integration Points

```
┌─────────────────────────────────────────────────┐
│                 NestJS Backend                   │
│                                                 │
│    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│    │ Stripe  │    │  Toast  │    │  FCM /  │   │
│    │         │    │  POS    │    │  APNs   │   │
│    │ Payment │    │  (V2)   │    │  Push   │   │
│    │ Intent  │    │  Order  │    │  Notif  │   │
│    │ Webhook │    │  Inject │    │         │   │
│    │ Refund  │    │  Menu   │    │         │   │
│    │         │    │  Sync   │    │         │   │
│    └─────────┘    └─────────┘    └─────────┘   │
│                                                 │
│    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│    │SendGrid │    │  S3 /   │    │ Google  │   │
│    │  or     │    │Supabase │    │  Maps   │   │
│    │Postmark │    │Storage  │    │  (geo)  │   │
│    │ Email   │    │ Images  │    │         │   │
│    └─────────┘    └─────────┘    └─────────┘   │
└─────────────────────────────────────────────────┘
```

| Integration | Purpose | Protocol | Auth |
|---|---|---|---|
| **Stripe** | Payments, refunds | REST API + webhooks | Secret key (server) |
| **Supabase** | DB, auth, storage, realtime | REST + WSS | Anon key (client), service key (server) |
| **Redis** | Cache, queues, rate limiting | TCP | Password |
| **Firebase Cloud Messaging** | Push notifications (Android + iOS) | REST API | Service account key |
| **Apple Push Notification** | Push notifications (iOS fallback) | HTTP/2 | APNs auth key |
| **Toast POS** (V2) | Order injection, menu sync | REST API | API key |
| **SendGrid/Postmark** (V2) | Transactional emails | REST API | API key |
| **Google Maps** | Distance calculation, geocoding | REST API | API key |

---

## 14. Recommended Folder Structure (Final)

```
stormburger/
│
├── apps/
│   ├── mobile/                          # React Native (iOS + Android)
│   │   ├── App.tsx
│   │   ├── src/
│   │   │   ├── navigation/
│   │   │   │   └── AppNavigator.tsx
│   │   │   ├── screens/
│   │   │   │   ├── AuthScreen.tsx
│   │   │   │   ├── LocationSelectScreen.tsx
│   │   │   │   ├── MenuScreen.tsx
│   │   │   │   ├── ItemDetailScreen.tsx
│   │   │   │   ├── CartScreen.tsx
│   │   │   │   ├── CheckoutScreen.tsx
│   │   │   │   ├── OrderConfirmationScreen.tsx
│   │   │   │   ├── OrdersScreen.tsx
│   │   │   │   └── ProfileScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── MenuItemCard.tsx
│   │   │   │   ├── CartBadge.tsx
│   │   │   │   ├── OrderStatusBadge.tsx
│   │   │   │   └── LocationCard.tsx
│   │   │   ├── stores/
│   │   │   │   ├── authStore.ts
│   │   │   │   ├── cartStore.ts
│   │   │   │   └── locationStore.ts
│   │   │   ├── services/
│   │   │   │   ├── api.ts
│   │   │   │   └── supabase.ts
│   │   │   ├── theme/
│   │   │   │   ├── colors.ts
│   │   │   │   ├── typography.ts
│   │   │   │   └── index.ts
│   │   │   └── utils/
│   │   │       └── format.ts
│   │   ├── ios/
│   │   ├── android/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── admin/                           # React (Vite)
│       ├── src/
│       │   ├── App.tsx
│       │   ├── pages/
│       │   │   ├── OrdersDashboard.tsx
│       │   │   ├── MenuManager.tsx
│       │   │   ├── LocationManager.tsx
│       │   │   ├── ReportsPage.tsx
│       │   │   └── StaffManager.tsx
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── services/
│       │   └── styles/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                          # Shared TypeScript types
│       ├── src/
│       │   ├── types/
│       │   │   ├── enums.ts
│       │   │   ├── location.ts
│       │   │   ├── menu.ts
│       │   │   ├── order.ts
│       │   │   └── user.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── server/                              # NestJS Backend
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/
│   │   │   ├── supabase.module.ts
│   │   │   ├── supabase.config.ts
│   │   │   ├── redis.module.ts
│   │   │   └── stripe.config.ts
│   │   ├── common/
│   │   │   ├── guards/
│   │   │   ├── decorators/
│   │   │   ├── filters/
│   │   │   └── interceptors/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── locations/
│   │   │   ├── menu/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── notifications/
│   │   │   ├── loyalty/
│   │   │   ├── promos/
│   │   │   ├── catering/
│   │   │   └── pos/
│   │   └── jobs/
│   ├── test/
│   ├── .env
│   └── package.json
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_foundation.sql
│   │   ├── 002_rls_fix.sql
│   │   └── ...
│   └── .env
│
├── docs/
│   ├── PRD.md
│   └── ARCHITECTURE.md
│
├── .gitignore
├── package.json                         # Workspace root
└── CLAUDE.md
```

---

*This architecture is designed to support StormBurger from 2 locations to 20+, from 1,000 users to 200,000+, without requiring a re-architecture. Each layer can be scaled independently, and V2 features plug into the existing module structure without modifying the core ordering flow.*
