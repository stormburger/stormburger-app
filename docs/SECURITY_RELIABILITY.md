# StormBurger — Security, Reliability, and Compliance Plan

**Version:** 1.0
**Date:** April 6, 2026
**Priority:** Restaurant ordering reliability over elegance. A missed order costs a customer. A security breach costs the business.

---

## 1. Authentication Strategy

### 1.1 Customer Authentication

Supabase Auth is the sole identity provider. We never store passwords.

**Primary method:** Email + password.
**Secondary method (V2):** Phone + OTP via SMS.
**Future:** Apple Sign-In, Google Sign-In.

**Sign-up flow:**
1. Customer submits email + password + name to NestJS `/api/auth/signup`
2. NestJS calls Supabase Auth `signUp()` — Supabase hashes password with bcrypt, stores in `auth.users`
3. NestJS creates `users` + `user_profiles` + `loyalty_accounts` rows using service role key
4. Supabase returns JWT + refresh token
5. NestJS returns both to the client

**Why the backend mediates sign-up instead of the client calling Supabase directly:** Because sign-up creates rows in three tables atomically. If the client called Supabase Auth directly and then failed to create the profile, the user would exist in auth but have no profile — a broken state. The backend ensures all-or-nothing.

**Sign-in flow:**
1. Customer submits email + password to NestJS `/api/auth/signin`
2. NestJS calls Supabase Auth `signInWithPassword()`
3. On success, NestJS fetches the user profile and loyalty balance
4. Returns JWT + refresh token + profile + loyalty to client in a single response

**Why the backend mediates sign-in:** To bundle profile + loyalty data with the auth response. One round-trip instead of three.

### 1.2 Admin Authentication

Same Supabase Auth, but additional checks:

1. Admin signs in via the admin dashboard (separate React app)
2. After Supabase Auth succeeds, NestJS checks the `users.role` and `admin_users` table
3. If role is `customer`, reject with 403
4. If role is staff/manager/admin/marketing, return JWT + permissions + store scope
5. Dashboard stores JWT in memory (not localStorage — see 2.3)

### 1.3 Guest Mode

Guests have no Supabase Auth session. They browse the app without a token. Public endpoints (stores, menu) require no auth. At checkout, they must create an account. No anonymous Supabase sessions — they create complexity with token management and phantom users.

---

## 2. JWT / Session Strategy

### 2.1 Token Lifecycle

```
Sign in
  │
  ▼
Supabase issues:
  - Access token (JWT): 1 hour expiry
  - Refresh token: 7 days expiry (configurable in Supabase dashboard)
  │
  ▼
Client stores both in secure storage:
  - iOS: Keychain (via Supabase SDK + AsyncStorage adapter)
  - Android: EncryptedSharedPreferences (via Supabase SDK)
  - Admin dashboard: Memory only (see 2.3)
  │
  ▼
Every API request:
  Authorization: Bearer <access_token>
  │
  ▼
Token expired (401 from any endpoint):
  - Client calls supabase.auth.refreshSession()
  - Gets new access token + new refresh token
  - Retries the failed request with new token
  - If refresh fails → sign out → redirect to login
```

### 2.2 JWT Validation on Backend

Every authenticated NestJS endpoint runs through `AuthGuard`:

```typescript
// What the guard does on every request:
1. Extract token from Authorization header
2. Call supabase.auth.getUser(token) — this validates the JWT signature,
   checks expiry, and returns the user object
3. If invalid → 401
4. Query users table for role (cached in Redis for 5 minutes per user ID)
5. Attach user + role to request object
6. For admin endpoints, additionally check admin_users table for store scope + permissions
```

**We do NOT validate JWTs locally with the JWT secret.** We always call `supabase.auth.getUser()`. This is slower (network call) but ensures revoked sessions are caught immediately. A locally-validated JWT would remain valid even after the user signs out or is disabled.

**Optimization:** Cache the `getUser()` result in Redis for 60 seconds per token hash. This reduces Supabase Auth calls from 100/minute to ~1/minute per active user while still catching revocations within 60 seconds.

### 2.3 Admin Dashboard Token Storage

The admin dashboard stores the JWT **in memory only** — not in localStorage, not in sessionStorage, not in cookies.

Why: localStorage is accessible to any JavaScript on the page (XSS vector). sessionStorage persists across page reloads (unnecessary exposure). Memory-only means the token is lost on page refresh, requiring re-login. This is acceptable for an admin tool and eliminates the most common token theft vector.

The refresh token is stored in an httpOnly cookie set by the NestJS backend — the JavaScript never sees it. On page load, the admin dashboard calls `/api/auth/refresh` with the cookie, gets a new access token in the response body, and stores it in memory.

### 2.4 Session Limits

- Maximum 5 concurrent sessions per customer account (5 devices)
- Maximum 2 concurrent sessions per admin account
- Exceeding the limit revokes the oldest session
- Implemented via Supabase's session management + a custom session count in Redis

---

## 3. Role-Based Authorization

### 3.1 Role Hierarchy

```
admin > manager > marketing > staff > customer > guest

Each higher role inherits all permissions of lower roles.
Exception: marketing does NOT inherit staff permissions (no order management).
```

### 3.2 Authorization Enforcement Points

Authorization is enforced at **three layers**. All three must agree.

**Layer 1: NestJS Guards (primary)**
```typescript
@UseGuards(AuthGuard, RolesGuard)
@Roles('manager', 'admin')
@Patch('items/:itemId')
async updateMenuItem() { ... }
```
The `RolesGuard` checks `request.user.role` against the `@Roles()` decorator. Rejected requests return 403.

**Layer 2: Supabase RLS (defense in depth)**
Even if a bug in the NestJS guard lets a request through, Supabase RLS policies prevent unauthorized data access. The service role key bypasses RLS, so this layer only protects against direct Supabase access (e.g., if someone obtains the anon key and tries to query directly).

**Layer 3: Store scoping (data isolation)**
Store managers can only access data for their assigned store. Every query that touches store-scoped data includes a `WHERE store_id = X` clause. The store ID comes from the `admin_users.store_id` column, never from the request URL (which could be tampered with).

```typescript
// Store-scoped query example:
const storeId = request.user.admin?.store_id; // from DB, not from URL
if (storeId) {
  query = query.eq('store_id', storeId); // enforced, not optional
}
```

### 3.3 Permission Checks for Specific Actions

Some actions require granular permission beyond role:

| Action | Required | Check |
|---|---|---|
| Issue refund | `can_refund = true` | `admin_users.can_refund` |
| Edit menu item | `can_edit_menu = true` | `admin_users.can_edit_menu` |
| Create promotion | `can_manage_promos = true` | `admin_users.can_manage_promos` |
| Adjust loyalty points | `role = admin` | Only operations managers |
| View audit log | `can_view_audit = true` | `admin_users.can_view_audit` |
| Manage staff | `can_manage_staff = true` | Only operations managers |
| Pause ordering | `can_pause_ordering = true` | `admin_users.can_pause_ordering` |

---

## 4. Row-Level Security in Supabase

### 4.1 Design Principle

RLS is the **last line of defense**, not the primary authorization layer. The NestJS backend uses the service role key for all business-critical writes, which bypasses RLS entirely. RLS protects against:

1. A compromised anon key being used to query data directly
2. A bug in the backend that sends a query without proper filtering
3. Client-side Supabase SDK calls (used for auth and realtime, not for data writes)

### 4.2 RLS Policy Categories

**Public read (no auth):**
- Stores (active only)
- Store hours
- Menu categories (active only)
- Menu items (active only)
- Menu item store availability
- Modifier groups
- Modifiers (active only)
- Active promotions (within date range)

**User-scoped (own data only):**
- Users: read/update own row
- User profiles: full CRUD own row
- Carts: full CRUD own cart
- Cart items: full CRUD within own cart
- Orders: read own orders
- Order items: read within own orders
- Payments: read within own orders
- Loyalty accounts: read own
- Loyalty transactions: read own
- Favorites: full CRUD own
- Event requests: read own, insert new

**Staff+ (operational access):**
- Orders: read all (staff reads through the kitchen dashboard)
- Order items: read all
- Payments: read all
- Event requests: full CRUD

**Admin (full access):**
- All tables: full CRUD

### 4.3 The Recursion Problem

RLS policies that check the user's role by querying the `users` table cause infinite recursion because the query on `users` itself triggers RLS policies on `users`.

**Solution:** A `SECURITY DEFINER` function that bypasses RLS:

```sql
CREATE OR REPLACE FUNCTION get_user_role(uid UUID)
RETURNS user_role AS $$
    SELECT role FROM users WHERE id = uid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

All RLS policies that need role checks call `get_user_role(auth.uid())` instead of querying the `users` table directly.

---

## 5. Secrets Management

### 5.1 Secret Inventory

| Secret | Where Used | Storage |
|---|---|---|
| Supabase anon key | Mobile app, admin dashboard, NestJS | Code (publishable — safe to expose) |
| Supabase service role key | NestJS backend only | Environment variable |
| Supabase JWT secret | Never used directly | Supabase internal |
| Stripe publishable key | Mobile app, admin dashboard | Code (publishable) |
| Stripe secret key | NestJS backend only | Environment variable |
| Stripe webhook secret | NestJS backend only | Environment variable |
| Redis password | NestJS backend only | Environment variable |
| FCM service account key | NestJS backend only | Environment variable (JSON) |
| Database connection string | NestJS backend only | Environment variable |

### 5.2 Rules

1. **No secrets in code.** Ever. The anon key and Stripe publishable key are the only exceptions — they are designed to be public.
2. **No secrets in git.** `.env` files are in `.gitignore`. Secrets are set in the deployment platform (Railway, Render, Fly.io) via their dashboard or CLI.
3. **No secrets in logs.** The logging interceptor redacts any header or body field containing "key", "secret", "password", "token", or "authorization".
4. **Rotation plan:** Stripe keys and Supabase service key should be rotated every 90 days. Redis password on infrastructure change. FCM key on team change.
5. **Access control:** Only the lead engineer and CTO have access to production secrets. Staging secrets are shared with the dev team.

### 5.3 Environment Separation

| Environment | Supabase Project | Stripe Mode | Redis Instance |
|---|---|---|---|
| Development | Local or dev project | Test mode | Local Redis |
| Staging | Staging project | Test mode | Staging Redis |
| Production | Production project | Live mode | Production Redis |

Stripe test mode keys never touch production. Production Stripe keys never touch staging.

---

## 6. Payment Security Boundaries

### 6.1 PCI Compliance Strategy

StormBurger achieves PCI compliance by **never handling card data**. Every payment interaction uses Stripe's prebuilt components:

- **Mobile app:** Stripe Payment Sheet — a native UI provided by Stripe's SDK. Card numbers are entered into Stripe's iframe/native view. Our code never sees the card number, CVV, or expiration date.
- **Admin dashboard:** Refunds are processed via Stripe's API using the PaymentIntent ID. No card data is involved.
- **Backend:** Creates PaymentIntents and processes webhooks. Only sees Stripe tokens and PaymentIntent IDs.

**Result:** StormBurger qualifies for SAQ A (the simplest PCI self-assessment) because cardholder data never enters our environment.

### 6.2 Payment Flow Security

```
Customer taps "Pay"
    │
    ▼
NestJS creates PaymentIntent (amount in cents, order metadata)
    │  Server-side: amount calculated from DB, not from client
    │
    ▼
Returns client_secret to mobile app
    │  The client_secret can only be used to confirm THIS specific payment
    │  It cannot be used to create new charges or access other data
    │
    ▼
Stripe Payment Sheet collects card → sends to Stripe directly
    │  Card data goes from Stripe SDK → Stripe servers
    │  Never passes through our backend or network
    │
    ▼
Stripe processes payment → sends webhook to our backend
    │  Webhook is signed with our webhook secret
    │
    ▼
NestJS verifies webhook signature → updates order status
    │  Only processes events signed with our secret
    │  Rejects anything else
```

### 6.3 Refund Security

- Only users with `can_refund = true` permission can issue refunds
- Refund amount cannot exceed original payment amount
- Partial refunds are tracked — total refunded never exceeds total charged
- Every refund requires a reason (free text, stored in `payments.refund_reason`)
- Every refund is logged in `audit_logs` with the staff member who issued it
- Stripe processes the actual money movement — we never move money directly

### 6.4 Price Tampering Prevention

The client sends item IDs and quantities — never prices. The backend:

1. Looks up every item's price in the database
2. Calculates modifier adjustments from the database
3. Applies promo discounts server-side with full validation
4. Calculates tax from the store's tax rate
5. The total in the PaymentIntent comes from the backend's calculation

If a client sends a modified request with different prices, it's ignored — the backend recalculates everything.

---

## 7. PII Handling

### 7.1 What PII We Store

| Data | Table | Required? | Purpose |
|---|---|---|---|
| Email | `users` | Yes | Account login, order confirmations, password reset |
| Phone | `users` | No | OTP login (V2), order notifications |
| Full name | `user_profiles` | Yes | Order display, personalization |
| Date of birth | `user_profiles` | No | Birthday rewards |
| Address | None | — | Not stored in V1 (pickup only, no delivery) |
| Payment card | Stripe only | — | Never stored in our database |

### 7.2 PII Access Controls

- Customer PII is readable only by the customer themselves (RLS) or by staff+ roles
- PII is never included in log output
- PII is never included in analytics events (use user ID, not email/name)
- API responses to staff roles show partially masked data: email → `j***@example.com`, phone → `(310) ***-1234`
- Full PII visible only to operations managers

### 7.3 Data Retention

- Active accounts: PII retained while account is active
- Deleted accounts: PII anonymized within 30 days. Orders retained with anonymized customer: `display_name = "Deleted User"`, email/phone set to NULL
- Audit logs: Retained for 2 years, then archived
- Order data: Retained for 7 years (tax/accounting requirement)

### 7.4 Right to Deletion

Account deletion flow:
1. Customer requests deletion in app Settings
2. Confirmation prompt: "This will delete your account, order history, and loyalty points. This cannot be undone."
3. NestJS processes deletion:
   - Anonymize `users` row (remove email, phone)
   - Anonymize `user_profiles` row (remove name, DOB, set display_name to "Deleted User")
   - Delete `loyalty_accounts` and `loyalty_transactions`
   - Delete `favorites`
   - Delete `carts`
   - Keep `orders` with anonymized customer reference (financial records)
   - Delete Supabase Auth user
4. Deletion logged in audit log

---

## 8. Audit Logging

### 8.1 What Gets Logged

Every state-changing action is logged. Reads are not logged (too noisy, use access logs instead).

| Action | Data Captured |
|---|---|
| User login | user_id, IP, user_agent, timestamp |
| User logout | user_id, timestamp |
| Order created | order_id, user_id, store_id, total, item_count |
| Order status changed | order_id, old_status, new_status, changed_by |
| Payment captured | order_id, payment_id, amount, method |
| Refund issued | order_id, payment_id, amount, reason, issued_by |
| Menu item created/updated | item_id, field-level diff, changed_by |
| Menu item toggled | item_id, store_id, old_available, new_available, changed_by |
| Price changed | item_id, store_id, old_price, new_price, changed_by |
| Promo created/updated | promo_id, code, changed_by |
| Promo applied | order_id, promo_id, discount_amount |
| Loyalty points adjusted | account_id, points, reason, adjusted_by |
| Loyalty redeemed | account_id, order_id, points_redeemed |
| Store settings changed | store_id, field-level diff, changed_by |
| Ordering paused/resumed | store_id, reason, changed_by |
| Staff account created/modified | target_user_id, role, changed_by |

### 8.2 Audit Log Schema

```sql
-- Append-only. Never updated. Never deleted (except by retention policy).
audit_logs (
    id              UUID PRIMARY KEY,
    user_id         UUID,           -- who did it (NULL for system actions)
    action          audit_action,   -- enum: create, update, delete, status_change, etc.
    entity_type     TEXT,           -- 'order', 'menu_item', 'store', 'payment', etc.
    entity_id       UUID,           -- the affected record's ID
    changes         JSONB,          -- {"price": {"old": 899, "new": 999}}
    ip_address      INET,
    user_agent      TEXT,
    metadata        JSONB,          -- any additional context
    created_at      TIMESTAMPTZ
)
```

### 8.3 Implementation

Audit logging is handled by a NestJS interceptor that wraps all admin controller methods:

```typescript
@Injectable()
class AuditInterceptor implements NestInterceptor {
  intercept(context, next) {
    const request = context.switchToHttp().getRequest();
    const before = /* snapshot of entity before change */;

    return next.handle().pipe(
      tap(result => {
        // Enqueue audit log entry (async — don't block the response)
        this.auditQueue.add('log', {
          user_id: request.user?.id,
          action: this.inferAction(request.method),
          entity_type: this.inferEntityType(request.path),
          entity_id: request.params.id,
          changes: diff(before, result),
          ip_address: request.ip,
          user_agent: request.headers['user-agent'],
        });
      })
    );
  }
}
```

Audit writes go through a BullMQ queue so they never slow down the primary request.

---

## 9. Fraud and Promo Abuse Prevention

### 9.1 Promo Code Abuse

**Threat:** A user creates multiple accounts to use the same promo code repeatedly.

**Defenses:**
1. `max_uses_per_user` on every promotion (default: 1)
2. Track redemptions in `promotion_redemptions` table — checked before every application
3. `max_uses_total` caps total global usage
4. `first_order` rule type — only valid if the user has zero completed orders
5. Device fingerprinting (V2): store device ID at sign-up, flag accounts sharing a device
6. Rate limit: max 3 promo validation attempts per minute per user

**Detection:** Weekly report of accounts that share device IDs, IP addresses, or payment methods. Manual review.

### 9.2 Payment Fraud

**Threat:** Stolen credit cards used to place orders.

**Defenses:**
1. Stripe Radar is enabled by default — machine learning fraud detection on every charge
2. Stripe Radar rules: block if risk score > 75, review if > 50
3. 3D Secure (SCA) is enabled via Stripe's automatic payment methods — the card issuer may challenge the customer to verify identity
4. Orders over $100 are flagged for manual review before preparation starts
5. More than 3 failed payment attempts in 1 hour → account temporarily locked

### 9.3 Loyalty Abuse

**Threat:** Placing and immediately cancelling orders to farm points, or finding a bug that awards points multiple times.

**Defenses:**
1. Points are only awarded on `picked_up` status, not on order creation
2. Points are revoked on cancellation or refund (tracked via `loyalty_transactions`)
3. Points balance can never go below zero (CHECK constraint on `loyalty_accounts.points_balance`)
4. Every point mutation writes a `loyalty_transactions` row with `balance_after` — this is the audit trail
5. The `loyalty_accounts.points_balance` is updated atomically with the transaction insert (single SQL statement or stored procedure)
6. Manual point adjustments require `admin` role and are logged

### 9.4 Order Spam

**Threat:** A user or bot places many orders to disrupt kitchen operations.

**Defenses:**
1. Rate limit: 5 orders per 15 minutes per user
2. Rate limit: 30 orders per 15 minutes per store (configurable `max_orders_per_window`)
3. Idempotency key prevents duplicate orders from double-taps or retries
4. CAPTCHA challenge on the 3rd order within 30 minutes (V2)
5. Account lockout after 10 cancelled orders in 24 hours

---

## 10. Idempotency Design

### 10.1 Why It Matters

A customer on a slow network taps "Pay" and nothing happens. They tap again. Without idempotency, two orders are created, two payments are charged, and the kitchen makes two meals. This is the most expensive bug in food ordering.

### 10.2 Four-Layer Defense

**Layer 1: Client-side prevention**
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);
const idempotencyKey = useRef(uuid()).current; // generated ONCE per checkout session

const handlePay = async () => {
  if (isSubmitting) return; // prevent double-tap
  setIsSubmitting(true);
  try {
    await api.checkout({ ..., idempotency_key: idempotencyKey });
  } finally {
    setIsSubmitting(false);
  }
};
```

The idempotency key is generated when the checkout screen mounts. It stays the same across retries. It only changes when the user starts a new checkout session.

**Layer 2: Redis fast-check**
```typescript
const cached = await redis.get(`idempotency:${key}`);
if (cached) return JSON.parse(cached); // return cached order, skip everything

// ... create order ...

await redis.set(`idempotency:${key}`, JSON.stringify(order), 'EX', 86400); // 24h
```

**Layer 3: Database unique constraint**
```sql
orders.idempotency_key TEXT NOT NULL UNIQUE
```
If Redis misses (cold start, eviction), the database catches the duplicate. The backend handles the unique violation:

```typescript
try {
  await supabase.from('orders').insert(order);
} catch (error) {
  if (error.code === '23505') { // unique violation
    const existing = await supabase.from('orders')
      .select().eq('idempotency_key', key).single();
    return existing.data; // return existing order
  }
  throw error;
}
```

**Layer 4: Stripe idempotency**
Stripe PaymentIntents have their own idempotency. We include the order ID in the PaymentIntent metadata. Before creating a new intent, we check if one already exists for this order.

### 10.3 Idempotency Key Lifecycle

```
Checkout screen mounts → generate UUID → store in useRef
    │
    ▼ (user taps Pay)
POST /checkout { idempotency_key: "abc-123" }
    │
    ├── First call: create order, cache key, return order
    │
    ├── Retry (same key): return cached order from Redis
    │
    ├── Race condition: DB unique constraint catches it
    │
    └── User starts NEW checkout → screen remounts → NEW UUID generated
```

Key expiry: 24 hours in Redis. Permanent in database (the UNIQUE constraint is permanent).

---

## 11. Webhook Verification

### 11.1 Stripe Webhooks

```typescript
@Post('webhook')
async handleStripeWebhook(@Req() req: any, @Headers('stripe-signature') sig: string) {
  // 1. Get raw body (not parsed JSON — signature verification requires raw bytes)
  const rawBody = req.rawBody;
  if (!rawBody) throw new BadRequestException('Raw body required');

  // 2. Verify signature using our webhook secret
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (err) {
    // Invalid signature — reject immediately
    // This catches: tampered payloads, replay attacks, wrong secret
    throw new BadRequestException('Invalid webhook signature');
  }

  // 3. Process the event idempotently
  const processed = await redis.get(`webhook:${event.id}`);
  if (processed) return { received: true }; // already handled

  // 4. Handle the event
  await this.processEvent(event);

  // 5. Mark as processed
  await redis.set(`webhook:${event.id}`, '1', 'EX', 86400);

  return { received: true };
}
```

### 11.2 Webhook Security Rules

1. The webhook endpoint has **no auth guard** — Stripe cannot send JWTs
2. The endpoint verifies the `Stripe-Signature` header using `stripe.webhooks.constructEvent()`
3. The webhook secret is stored in environment variables, never in code
4. Events are processed idempotently — processing the same event ID twice has no effect
5. The endpoint always returns 200 for valid signatures (even if processing fails) to prevent Stripe from retrying endlessly. Failed processing is logged and retried from our side.
6. Webhook events are logged in `audit_logs`
7. The endpoint is rate-limited to 100 requests per minute (Stripe's maximum burst rate)

### 11.3 Webhook Failure Handling

If webhook processing fails (database down, Redis down):
1. Log the error with full event payload
2. Return 200 to Stripe (prevent retry storm)
3. Store the failed event in a dead-letter queue (Redis list: `webhook:failed`)
4. A background job retries failed events every 5 minutes
5. After 3 failed retries, alert the on-call engineer

---

## 12. Retry Strategy

### 12.1 API Client Retries (Mobile App)

```
Request fails
    │
    ├── 401 Unauthorized
    │   └── Refresh token → retry once → if still 401, sign out
    │
    ├── 408/429/5xx (server error or rate limit)
    │   ├── Attempt 1: immediate retry
    │   ├── Attempt 2: 1 second delay
    │   ├── Attempt 3: 3 seconds delay
    │   └── Give up → show error to user
    │
    ├── Network error (offline, timeout)
    │   ├── Check connectivity
    │   ├── If online: retry with backoff (same as above)
    │   └── If offline: show "No internet" message, don't retry
    │
    └── 4xx (client error, not 401/408/429)
        └── Don't retry — show error message to user
```

**Checkout is special:** Only ONE attempt. No automatic retries. The idempotency key makes retries safe, but we don't want to silently charge a user twice if there's a timing issue. If checkout fails, show the error and let the user tap "Pay" again (which uses the same idempotency key, so it's safe).

### 12.2 Backend-to-External Service Retries

| Service | Max Retries | Backoff | Circuit Breaker |
|---|---|---|---|
| Supabase (read) | 3 | 100ms, 500ms, 2s | 5 failures in 60s → open for 30s |
| Supabase (write) | 2 | 200ms, 1s | 5 failures in 60s → open for 30s |
| Stripe (create intent) | 2 | 500ms, 2s | 3 failures in 60s → open for 60s |
| Stripe (webhook call) | 0 (Stripe retries) | — | — |
| Redis | 1 | 100ms | Degrade gracefully (skip cache) |
| FCM (push) | 3 (via queue) | 5s, 30s, 120s | — |

### 12.3 Circuit Breaker Implementation

```
CLOSED (normal)
  │ Track failures in sliding window (60 seconds)
  │
  ├── Failure count < threshold → stay CLOSED
  │
  └── Failure count ≥ threshold → switch to OPEN
        │
        ▼
OPEN (rejecting requests)
  │ All requests to this service return a fallback immediately
  │ (e.g., cached menu data, or error message)
  │
  │ After timeout (30–60 seconds):
  │
  └── Switch to HALF-OPEN
        │
        ▼
HALF-OPEN (testing)
  │ Allow ONE request through
  │
  ├── Success → switch to CLOSED
  └── Failure → switch to OPEN (reset timeout)
```

---

## 13. Queue Strategy

### 13.1 Queue Infrastructure

BullMQ backed by Redis. Queues are used for everything that doesn't need to block the HTTP response.

### 13.2 Queue Definitions

| Queue Name | Purpose | Concurrency | Retry | Dead Letter |
|---|---|---|---|---|
| `order-notifications` | Push notifications for order status changes | 10 | 3 (5s, 30s, 120s) | Yes |
| `order-emails` | Order confirmation emails | 5 | 3 (60s intervals) | Yes |
| `pos-sync` | Send orders to Toast POS (V2) | 3 | 5 (30s intervals) | Yes |
| `analytics-events` | Write analytics events | 20 | 2 (no backoff) | No (drop) |
| `loyalty-points` | Award/revoke loyalty points | 5 | 3 (10s intervals) | Yes |
| `promo-usage` | Increment promo usage counter | 5 | 3 (5s intervals) | Yes |
| `audit-logs` | Write audit log entries | 10 | 3 (5s intervals) | Yes |
| `webhook-retry` | Retry failed webhook processing | 3 | 3 (5m intervals) | Yes |
| `cart-cleanup` | Delete expired carts (runs every hour) | 1 | 1 | No |

### 13.3 Job Priority

Jobs within a queue are processed in priority order:

```
Priority 1 (critical): order-notifications (customer is waiting)
Priority 2 (important): loyalty-points, promo-usage (data integrity)
Priority 3 (standard): audit-logs, pos-sync
Priority 4 (low): analytics-events, cart-cleanup
```

### 13.4 Dead Letter Queue

Failed jobs that exhaust all retries are moved to a dead letter queue (`queue:failed`). A daily job scans the dead letter queue and:
1. Sends an alert if there are more than 10 failed jobs
2. Generates a report of failure reasons
3. Jobs older than 7 days are archived

---

## 14. Incident Monitoring

### 14.1 Health Checks

| Check | Frequency | Alert If |
|---|---|---|
| NestJS API responds to `GET /health` | 30 seconds | No response in 10 seconds |
| Supabase API responds | 60 seconds | No response in 15 seconds |
| Redis responds to PING | 30 seconds | No response in 5 seconds |
| Stripe API responds | 60 seconds | No response in 10 seconds |
| Database connection pool | 30 seconds | Available connections < 5 |
| Queue depth | 60 seconds | Any queue > 100 jobs |
| Dead letter queue | 60 seconds | Any entries |

### 14.2 Application Metrics

| Metric | Source | Alert Threshold |
|---|---|---|
| API error rate (5xx) | NestJS logs | > 5% of requests in 5 minutes |
| API latency (p95) | NestJS logs | > 3 seconds |
| Order creation failures | Application logs | > 3 in 15 minutes |
| Payment failures | Stripe webhook logs | > 5 in 15 minutes |
| Push notification failures | Queue failed jobs | > 10 in 1 hour |
| Auth failures (401) | NestJS logs | > 50 in 5 minutes (brute force?) |
| Database query time (p95) | Supabase metrics | > 500ms |
| Redis memory usage | Redis INFO | > 80% of max |

### 14.3 Business Metrics (Non-Alert, Dashboard)

- Orders per hour by store
- Revenue per hour
- Average fulfillment time
- Cart abandonment rate
- App crash rate
- Active WebSocket connections (kitchen dashboards)

### 14.4 Monitoring Stack

| Layer | Tool | Purpose |
|---|---|---|
| Error tracking | Sentry | JS errors, crash reports, breadcrumbs |
| Application logs | Structured JSON → Datadog or Logtail | Request logs, error logs, audit |
| Uptime monitoring | Better Uptime or Checkly | Endpoint health checks |
| Infrastructure | Hosting platform metrics (Railway/Render/Fly) | CPU, memory, network |
| Database | Supabase dashboard | Query performance, connections, storage |
| Queues | BullMQ dashboard (Bull Board) | Queue depth, failed jobs, processing time |

---

## 15. Alerting

### 15.1 Alert Channels

| Severity | Channel | Response Time |
|---|---|---|
| **Critical** | PagerDuty/phone call + Slack #incidents | < 15 minutes |
| **High** | Slack #alerts + email | < 1 hour |
| **Medium** | Slack #alerts | < 4 hours |
| **Low** | Email digest (daily) | Next business day |

### 15.2 Alert Definitions

| Alert | Severity | Condition |
|---|---|---|
| API is down | Critical | Health check fails for 3 consecutive checks |
| Database unreachable | Critical | Supabase connection fails for 2+ minutes |
| Payment processing broken | Critical | > 5 consecutive payment failures |
| All stores stopped accepting orders | Critical | Every store has `is_accepting_orders = false` |
| High error rate | High | > 5% 5xx responses in 5 minutes |
| Slow API | High | p95 latency > 5 seconds for 10+ minutes |
| Queue backlog | High | Any queue > 200 jobs |
| Dead letter queue growing | High | > 10 dead letter entries |
| Unusual order pattern | Medium | > 20 orders from single user in 1 hour |
| High refund rate | Medium | > 10% of orders refunded in 1 day |
| Push notification failures | Medium | > 20% failure rate in 1 hour |
| SSL certificate expiring | Medium | < 14 days until expiry |
| Disk usage high | Low | Supabase storage > 80% |
| Unused promo codes | Low | Active promos with 0 uses after 7 days |

---

## 16. Backup and Restore

### 16.1 Database Backups

Supabase provides automatic backups on Pro plan and above:

| Backup Type | Frequency | Retention | RPO |
|---|---|---|---|
| Automated snapshot | Daily | 7 days | 24 hours |
| Point-in-time recovery (PITR) | Continuous (WAL archiving) | 7 days | ~seconds |

**PITR** means we can restore the database to any point in the last 7 days, down to the second. This is critical for scenarios like "an admin accidentally deleted all menu items at 3:47 PM."

### 16.2 What Else Needs Backup

| Data | Backup Strategy |
|---|---|
| Supabase Storage (images) | Supabase handles replication. Additionally, sync to S3 bucket weekly. |
| Redis (cache/queues) | No backup needed — cache is rebuilt from DB. Queue jobs are transient. |
| Environment variables | Stored in 1Password team vault. Exported quarterly. |
| Source code | Git (GitHub). Protected branches. Required reviews. |
| Stripe data | Stripe retains all payment data. No backup needed. |
| Audit logs | Retained in database. Archived to S3 after 2 years. |

### 16.3 Restore Procedures

**Scenario: Accidental data deletion**
1. Identify the timestamp of the deletion from audit logs
2. Use Supabase PITR to create a restore point just before the deletion
3. Restore to a separate database instance
4. Extract the deleted data
5. Re-insert into production
6. Post-incident review

**Scenario: Database corruption**
1. Supabase detects and auto-heals most corruption
2. If unrecoverable: restore from latest daily snapshot
3. Replay WAL logs from snapshot to last known good state
4. Data loss: up to a few seconds (PITR) or up to 24 hours (snapshot only)

**Scenario: Complete infrastructure failure**
1. Deploy new NestJS instance to backup region
2. Point to Supabase (multi-region if on Enterprise) or restore from backup
3. Update DNS to point to new infrastructure
4. Estimated recovery time: 1–4 hours

---

## 17. Disaster Recovery

### 17.1 Recovery Objectives

| Metric | Target | Rationale |
|---|---|---|
| **RTO** (Recovery Time Objective) | 4 hours | Restaurant can take walk-in orders during outage |
| **RPO** (Recovery Point Objective) | 5 minutes | Acceptable to lose the last few orders — they can be re-placed |

### 17.2 Failure Scenarios and Responses

| Scenario | Impact | Response | Recovery Time |
|---|---|---|---|
| NestJS server down | No new orders, kitchen dashboard works (realtime direct from Supabase) | Auto-restart via hosting platform. If hosting platform is down, deploy to backup provider. | 5–30 minutes |
| Supabase outage | No database, no auth, no realtime. Complete outage. | Wait for Supabase recovery. No self-hosted backup in V1. (V2: consider self-hosted Postgres fallback.) | Depends on Supabase SLA (99.9%) |
| Redis down | No caching, no queues. API works but slower. Idempotency falls back to DB-only. | Auto-restart Redis. Queued jobs are lost — rebuild from DB state. | 5–15 minutes |
| Stripe outage | No new payments. Orders can be created but not paid. | Show "Pay at pickup" fallback. Queue payment for when Stripe recovers. | Depends on Stripe SLA (99.99%) |
| DNS failure | App can't reach API | DNS failover to backup provider. CloudFlare provides automatic failover. | 5–30 minutes |
| DDoS attack | API overwhelmed, no legitimate traffic | CloudFlare DDoS protection (always-on). Rate limiting. Scale up if needed. | Minutes to hours |

### 17.3 Runbook

A step-by-step recovery runbook is maintained in the team wiki:

1. **Assess:** What is down? Check health dashboard, Supabase status, Stripe status.
2. **Communicate:** Post in #incidents Slack channel. If customer-facing, post status update.
3. **Mitigate:** Can we route traffic elsewhere? Can we enable a maintenance page? Can stores take walk-in orders?
4. **Recover:** Follow scenario-specific steps above.
5. **Verify:** Test all critical flows: sign in, browse menu, place order, kitchen receives order.
6. **Post-mortem:** Within 48 hours, document what happened, why, and what we'll do to prevent recurrence.

### 17.4 Regular Testing

- Monthly: Restore from PITR to a test database, verify data integrity
- Quarterly: Full disaster recovery drill — simulate NestJS outage, deploy to backup, verify all flows
- Annually: Review and update this document

---

*This plan prioritizes reliability for a restaurant ordering system where every failure costs a customer their meal and the business their trust. Security measures are concrete and implementable — no vague "follow best practices." Monitoring catches problems before customers do. Backups ensure no data is permanently lost. And the payment system never touches a credit card number.*
