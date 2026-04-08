# StormBurger — MVP Execution Plan

**Version:** 1.0
**Date:** April 6, 2026
**Target:** 7 milestones → production launch
**Estimated Timeline:** 10–12 weeks with 1–2 engineers

---

## Pre-Build Decisions

### Build for Real Immediately

These are foundation pieces that cannot be faked. Mocking them creates debt that costs more to replace than to build correctly from the start.

| Component | Why |
|---|---|
| Supabase schema (all tables) | Every feature depends on the data model. Changing it later means migrations + data backfill. |
| Supabase Auth | Session handling, token refresh, and RLS all depend on real auth from day one. Mocking auth creates a false sense of working code. |
| NestJS project structure | Module boundaries, guards, interceptors. Restructuring later is expensive. |
| Stripe integration (test mode) | Payment flows have too many edge cases to mock meaningfully. Stripe test mode IS the mock. |
| Navigation structure | Changing nav architecture after screens are built requires touching every screen. |

### Mock First, Replace Later

These can use hardcoded data or simplified logic during early milestones without creating meaningful debt.

| Component | Mock Strategy | Replace In |
|---|---|---|
| Menu item images | Use placeholder colored rectangles with item name | Milestone 6 (launch hardening) |
| Push notifications | Console.log the notification payload | Milestone 4 |
| Loyalty point calculation | Hardcode: 1 point per dollar, display only | Milestone 5 |
| Analytics events | Console.log events | V2 |
| Redis caching | Skip cache, hit DB directly | Milestone 7 |
| Storm Mode | Don't build until post-launch | V2 |
| Guest mode | Don't build until post-launch | V2 |

### Defer to V2

Do not build, do not mock, do not think about these until after launch.

| Feature | Why It Can Wait |
|---|---|
| Delivery | Entirely separate domain (addresses, drivers, tracking). Pickup is the MVP. |
| Toast POS integration | Requires Toast partnership. Kitchen dashboard replaces POS for app orders. |
| Scheduled orders | Adds complexity to kitchen workflow. ASAP-only for launch. |
| Promo codes | Revenue optimization, not core ordering. |
| Catering inquiry form | Low volume. Use email for now. |
| Guest checkout | Requiring an account gives us loyalty data from day one. |
| Storm Mode (one-tap reorder) | Requires saved payment methods, order history. Build after users have history. |
| Phone/OTP sign-in | Email + password is sufficient for launch. |
| Dark mode | Cosmetic. |
| Multi-language | All stores are in LA. English only. |
| App Store review/rating prompts | Post-launch optimization. |

---

## Milestone 1: Foundation

**Duration:** 1.5 weeks
**Goal:** Everything compiles, connects, and a developer can sign up, sign in, and see store data in the app.

### Scope

- Supabase project configured with full schema
- NestJS backend running with auth, stores, and menu modules
- React Native app with navigation, auth flow, and theme
- Admin dashboard with login and sidebar

### Dependencies

- Supabase project created (done)
- Stripe account created (done)
- Developer Apple + Google accounts for app signing

### Engineering Tasks

**Backend:**
- [x] Scaffold NestJS project with modules: auth, stores, menu
- [x] Configure Supabase client (public, user-scoped, admin)
- [x] Implement `AuthGuard` — extract JWT, validate via `supabase.auth.getUser()`, attach user
- [x] Implement `RolesGuard` — check `users.role` via `get_user_role()` function
- [ ] `POST /api/auth/signup` — create Supabase Auth user + users + user_profiles + loyalty_accounts
- [ ] `POST /api/auth/signin` — sign in, return JWT + profile + loyalty
- [ ] `POST /api/auth/refresh` — refresh token exchange
- [ ] `GET /api/auth/me` — return current user profile
- [x] `GET /api/stores` — list active stores with hours and open status
- [x] `GET /api/stores/:id` — store detail
- [x] `GET /api/stores/:id/status` — is store open right now
- [x] `GET /api/stores/:storeId/menu` — full menu grouped by category
- [x] `GET /api/stores/:storeId/menu/items/:id` — item detail with modifiers
- [ ] Seed data: 2 stores, full menu, modifier groups, modifiers (done via SQL)
- [ ] Health check endpoint: `GET /health`

**Mobile:**
- [x] Scaffold React Native project
- [x] Install dependencies: navigation, Supabase, Zustand, Stripe, AsyncStorage
- [x] Set up theme: colors, typography, spacing
- [x] Set up navigation: RootNavigator with auth check
- [x] AuthStore: initialize, signUp, signIn, signOut, token refresh
- [x] LocationStore: fetchStores, selectStore
- [x] API client: base URL, token attachment, error handling
- [x] Supabase client: auth + realtime config
- [x] SplashScreen: logo + auth check
- [x] AuthScreen: login + signup forms
- [x] LocationSelectScreen: store list with open/closed badges

**Admin:**
- [x] Scaffold Vite + React project
- [x] Supabase client for auth
- [x] Sidebar layout with navigation
- [ ] Admin login page
- [ ] Auth guard: redirect to login if not authenticated, check role

### QA Checklist

- [ ] User can create account with email + password
- [ ] User can sign in with existing credentials
- [ ] Invalid credentials show error message
- [ ] Session persists after app restart
- [ ] Token refreshes automatically after expiry
- [ ] User can sign out
- [ ] Store list loads with correct data (2 stores)
- [ ] Store open/closed status is accurate for current time
- [ ] Menu loads for selected store with all categories
- [ ] Item detail shows modifiers
- [ ] Admin can log in to dashboard
- [ ] Non-admin users are rejected from dashboard

### Launch Blockers

None — this milestone is internal only.

---

## Milestone 2: Ordering Flow

**Duration:** 2 weeks
**Goal:** A user can browse the menu, customize items, build a cart, and see a complete order summary. No payment yet.

### Scope

- Menu browsing with category tabs and search
- Item detail with full modifier selection
- Cart management (add, edit, remove, quantity)
- Server-side cart syncing
- Favorites (add/remove)

### Dependencies

- Milestone 1 complete
- All menu data seeded

### Engineering Tasks

**Backend:**
- [ ] Cart module:
  - [ ] `GET /api/stores/:storeId/cart` — get or create cart for user + store
  - [ ] `POST /api/stores/:storeId/cart/items` — add item with modifiers (validate everything server-side)
  - [ ] `PATCH /api/stores/:storeId/cart/items/:id` — update quantity/modifiers
  - [ ] `DELETE /api/stores/:storeId/cart/items/:id` — remove item
  - [ ] `DELETE /api/stores/:storeId/cart` — clear cart
- [ ] Cart validation service:
  - [ ] Validate menu item exists and is active
  - [ ] Validate item is available at this store
  - [ ] Validate all modifier IDs belong to groups linked to this item
  - [ ] Validate required modifier groups have selections
  - [ ] Validate single-select groups have ≤ 1 selection
  - [ ] Validate multi-select groups respect min/max
  - [ ] Calculate unit price from DB (item base + location override + modifier adjustments)
- [ ] Favorites module:
  - [ ] `GET /api/favorites` — list user's favorites
  - [ ] `POST /api/favorites` — add favorite
  - [ ] `DELETE /api/favorites/:menuItemId` — remove favorite

**Mobile:**
- [x] MenuScreen: SectionList with category headers, item cards, search filter
- [x] ItemDetailScreen: modifier groups, radio/checkbox, quantity, price calculation, "Add to Cart"
- [x] CartStore: addItem, removeItem, updateQuantity, clearCart, subtotal, itemCount
- [x] CartScreen: item list, quantity controls, subtotal/tax/total, "Checkout" button
- [ ] Integrate cart with server-side cart API (sync on checkout, local-first for speed)
- [ ] Cart badge on tab bar showing item count
- [ ] Category tabs on menu screen (horizontal scroll, tap to scroll to section)
- [ ] Menu search (local filter by item name)
- [ ] Favorite heart icon on menu item cards
- [ ] FavoritesScreen: grid of favorited items
- [ ] Empty states: empty cart, empty favorites
- [ ] Pull-to-refresh on menu screen
- [ ] Haptic feedback on add to cart, quantity change, favorite toggle

**Admin:**
- (No admin work in this milestone)

### QA Checklist

- [ ] Menu displays all items grouped by category
- [ ] Category tabs scroll the list to the correct section
- [ ] Search filters items by name (case-insensitive)
- [ ] Tapping item opens detail screen with correct modifiers
- [ ] Required modifier groups show "Required" badge
- [ ] Cannot add to cart without selecting required modifiers
- [ ] Single-select groups only allow one selection
- [ ] Multi-select groups enforce max selections
- [ ] Price updates in real-time as modifiers are selected
- [ ] Quantity selector works (min 1)
- [ ] "Add to Cart" shows correct total and navigates back
- [ ] Cart shows all items with modifiers and prices
- [ ] Quantity +/- works in cart
- [ ] Removing last item shows empty cart state
- [ ] Subtotal, tax (9.75%), and total calculate correctly
- [ ] Switching stores clears cart with confirmation
- [ ] Favorite toggle works (heart fills/unfills)
- [ ] Favorites screen shows favorited items
- [ ] Server-side cart matches client-side cart on checkout

### Launch Blockers

None — this milestone is internal only.

---

## Milestone 3: Checkout and Payment

**Duration:** 2 weeks
**Goal:** A user can place a real order and pay with a credit card or Apple Pay. The order is created in the database, the payment is processed through Stripe, and the kitchen can see it.

### Scope

- Checkout preview with full price validation
- Stripe payment integration (PaymentIntent flow)
- Idempotent order creation
- Payment webhook handling
- Order confirmation screen

### Dependencies

- Milestone 2 complete
- Stripe account in test mode (done)
- Stripe publishable + secret keys configured (done)

### Engineering Tasks

**Backend:**
- [x] Orders module:
  - [x] `POST /api/stores/:storeId/checkout` — the big one:
    1. Idempotency check (Redis → DB)
    2. Validate store is open and accepting orders
    3. Validate all cart items are still available
    4. Recalculate all prices from database
    5. Calculate tax from store's tax rate
    6. Generate order number (SB-YYYYMMDD-NNN)
    7. Insert order + order_items + order_item_modifiers in transaction
    8. Create Stripe PaymentIntent
    9. Insert payment record
    10. Cache idempotency key in Redis
    11. Clear cart
    12. Return order + client_secret
  - [ ] `POST /api/stores/:storeId/checkout/preview` — same validation, no creation. Returns price breakdown.
  - [x] `GET /api/orders/mine` — user's order history
  - [x] `GET /api/orders/:id` — order detail with items and modifiers
- [x] Payments module:
  - [x] `POST /api/payments/intent/:orderId` — create PaymentIntent (already built, now used by checkout)
  - [x] `POST /api/webhooks/stripe` — handle payment_intent.succeeded, payment_failed, charge.refunded
  - [ ] On payment_intent.succeeded: update payment → captured, order → confirmed
  - [ ] On payment_failed: update payment → failed, log error
- [ ] Order number generator: `SB-YYYYMMDD-NNN` format, atomic counter per day
- [ ] Idempotency: Redis check → DB unique constraint → race condition handling

**Mobile:**
- [x] CheckoutScreen: order summary, special instructions, tip (V2 — skip for now), price breakdown, "Pay" button
- [x] Stripe integration: StripeProvider in App.tsx, initPaymentSheet + presentPaymentSheet
- [x] CheckoutSuccessScreen: order number, estimated pickup time, "Track Order" button
- [ ] Loading states during checkout (creating order → processing payment → confirming)
- [ ] Error handling: payment declined, network error, store closed mid-checkout
- [ ] Idempotency key generation (uuid per checkout session, persists across retries)
- [ ] Disable pay button after first tap, re-enable on error

**Admin:**
- (Checkpoint: manually verify orders appear in Supabase dashboard)

### QA Checklist

- [ ] Checkout preview shows correct subtotal, tax, total
- [ ] Tapping "Pay" opens Stripe Payment Sheet
- [ ] Payment with test card 4242424242424242 succeeds
- [ ] Payment with decline card 4000000000000002 shows error
- [ ] Order appears in database with status "pending"
- [ ] Stripe webhook fires → payment status → captured → order status → confirmed
- [ ] Order confirmation screen shows correct order number and pickup time
- [ ] Double-tapping "Pay" does not create duplicate orders (idempotency)
- [ ] Rapidly tapping "Pay" does not create duplicate charges
- [ ] Network timeout during checkout → retry with same idempotency key → succeeds without duplicate
- [ ] Order history shows the placed order
- [ ] Order detail shows all items, modifiers, prices, payment status
- [ ] Apple Pay works (test on physical device)
- [ ] If store closes between browsing and checkout → clear error message
- [ ] If item becomes unavailable between cart and checkout → clear error message

### Launch Blockers

- [ ] Stripe webhook URL must be configured in Stripe dashboard
- [ ] Webhook signature verification must work
- [ ] Idempotency must be tested under race conditions

---

## Milestone 4: Order Tracking

**Duration:** 1.5 weeks
**Goal:** Customers see real-time order status updates. Kitchen staff can manage orders through the admin dashboard. Push notifications inform customers of status changes.

### Scope

- Real-time order status on mobile (Supabase Realtime)
- Kitchen dashboard with live order feed
- Order status management (accept, prepare, ready, picked up)
- Push notifications on status changes

### Dependencies

- Milestone 3 complete
- Firebase project created (for FCM push notifications)
- APNs key generated (Apple push notifications)

### Engineering Tasks

**Backend:**
- [x] `PATCH /api/admin/orders/:id/status` — update order status with valid transition enforcement
- [ ] Status transition side effects:
  - [ ] Update timestamp column (confirmed_at, preparing_at, ready_at, picked_up_at)
  - [ ] Enqueue push notification job
  - [ ] Broadcast via Supabase Realtime (automatic via DB trigger)
- [ ] Notifications module:
  - [ ] `POST /api/notifications/token` — register FCM/APNs push token
  - [ ] `GET /api/notifications/preferences` — get notification settings
  - [ ] `PATCH /api/notifications/preferences` — update notification settings
  - [ ] BullMQ worker: send push via FCM (Android) and APNs (iOS)
  - [ ] Notification templates per status change
- [ ] `GET /api/admin/orders` — all active orders for kitchen dashboard (filtered by store)
- [ ] `GET /api/orders/active` — customer's most recent active order

**Mobile:**
- [x] OrderStatusScreen: progress tracker (4 nodes), estimated pickup time, order items
- [ ] Supabase Realtime subscription: subscribe to order changes on mount, unsubscribe on unmount
- [ ] Status tracker animations: progress bar fills, current node pulses
- [ ] Haptic feedback on status change
- [ ] Fallback polling: if WebSocket disconnects, poll every 10 seconds
- [ ] "Reconnecting..." indicator when WebSocket is down
- [ ] Push notification setup: request permission, register token
- [ ] Deep link handler: notification tap → OrderStatusScreen
- [ ] Foreground notification handler: show in-app toast instead of system notification
- [ ] HomeScreen: active order banner at top (tappable → OrderStatusScreen)
- [ ] OrderHistoryScreen: list of past orders with status badges
- [ ] OrderDetailScreen: full receipt view

**Admin:**
- [x] OrdersDashboard (LiveOrdersPage): kanban columns (Pending → Preparing → Ready)
- [ ] Order cards with items, modifiers, special instructions, time since created
- [ ] Action buttons: Accept, Reject, Start Preparing, Mark Ready, Picked Up
- [ ] Audio alert on new orders (configurable)
- [ ] Visual alert: card border flashes for orders > 5 minutes old
- [ ] Auto-remove completed orders after 30 seconds
- [ ] Full-screen kitchen display mode (F11)
- [ ] Store filter dropdown
- [ ] Connection status indicator (connected/reconnecting)

### QA Checklist

- [ ] Order status updates in real-time on mobile (no manual refresh)
- [ ] Status tracker animation works correctly for each transition
- [ ] Push notification received for: confirmed, preparing, ready
- [ ] Tapping push notification opens the correct order
- [ ] Foreground notification shows toast, not system notification
- [ ] Kitchen dashboard shows new orders within 1 second
- [ ] Audio alert plays on new order (when enabled)
- [ ] Accept → order moves to "Confirmed" column
- [ ] Start Preparing → order moves to "Preparing" column
- [ ] Mark Ready → order moves to "Ready" column
- [ ] Picked Up → order removed from dashboard
- [ ] Reject → order cancelled, customer notified
- [ ] Invalid status transitions are rejected (e.g., pending → ready)
- [ ] Multiple kitchen dashboards stay in sync (test with 2 browser tabs)
- [ ] WebSocket reconnects automatically after disconnect
- [ ] Fallback polling works when WebSocket is unavailable
- [ ] Active order banner appears on HomeScreen
- [ ] Order history loads with pagination

### Launch Blockers

- [ ] Push notifications must work on physical iOS and Android devices
- [ ] Kitchen dashboard must be tested on iPad (typical kitchen device)
- [ ] Audio alerts must work in Safari (kitchen may use iPad + Safari)

---

## Milestone 5: Loyalty Lite

**Duration:** 1 week
**Goal:** Customers earn points on completed orders and see their balance. No redemption in V1 — just accumulation and display. This creates the habit loop for repeat usage.

### Scope

- Loyalty account created on sign-up (already done in schema)
- Points earned on order completion (picked_up status)
- Points balance and tier displayed in app
- Loyalty tab in mobile app
- Basic loyalty section in admin

### Dependencies

- Milestone 4 complete

### Engineering Tasks

**Backend:**
- [ ] Loyalty service:
  - [ ] `awardPoints(userId, orderId, orderTotal)` — called when order status → picked_up
  - [ ] Calculate: 1 point per dollar spent (floor)
  - [ ] Insert `loyalty_transactions` row (type: earn, positive points)
  - [ ] Update `loyalty_accounts.points_balance` and `lifetime_points` atomically
  - [ ] Update tier based on lifetime_points thresholds
  - [ ] Update `user_profiles.total_orders` and `total_spent`
- [ ] `GET /api/loyalty` — balance, tier, tier progress, recent transactions
- [ ] `GET /api/loyalty/transactions` — full transaction history (paginated)
- [ ] Point revocation on refund/cancel:
  - [ ] When order is cancelled or refunded after pickup, insert negative `loyalty_transactions` row
  - [ ] Decrease `points_balance` (never below 0)
- [ ] Tier calculation:
  - [ ] Bronze: 0–499 lifetime points
  - [ ] Silver: 500–999
  - [ ] Gold: 1,000–2,499
  - [ ] Platinum: 2,500+

**Mobile:**
- [ ] RewardsScreen:
  - [ ] Points balance (large number)
  - [ ] Tier badge with name
  - [ ] Progress bar to next tier (points needed)
  - [ ] Tier benefits list
  - [ ] Recent activity list (earn/redeem transactions)
  - [ ] "Redemption coming soon!" placeholder
- [ ] Points earned badge on CheckoutSuccessScreen ("You earned 26 points!")
- [ ] Loyalty info on Profile screen (points balance + tier)
- [ ] Rewards tab in bottom navigation

**Admin:**
- [ ] Loyalty section in admin sidebar
- [ ] Basic loyalty stats page: total enrolled, active members, tier distribution
- [ ] Customer profile: show loyalty balance and transaction history

### QA Checklist

- [ ] New sign-up creates loyalty account with 0 points, bronze tier
- [ ] Order picked up → points awarded (1 per dollar)
- [ ] Points balance updates on Rewards screen
- [ ] Tier upgrades when threshold crossed (show correct tier badge)
- [ ] Tier progress bar shows accurate progress
- [ ] Transaction history shows earn entries
- [ ] Order cancelled → points revoked → balance decreases
- [ ] Points balance never goes negative
- [ ] CheckoutSuccessScreen shows "You earned X points!"
- [ ] Profile screen shows current balance and tier
- [ ] Admin dashboard shows loyalty stats

### Launch Blockers

- [ ] Points must be awarded atomically (no double-award, no missed award)
- [ ] Tier upgrades must be immediate (not delayed)

---

## Milestone 6: Admin Tools

**Duration:** 1.5 weeks
**Goal:** Store managers can manage their location's operations through the admin dashboard. Menu availability, store hours, and ordering toggle all work.

### Scope

- Menu management (edit prices, toggle availability)
- Quick sold-out toggle page
- Store settings (hours, pause ordering)
- Order search and detail
- Refund capability
- Staff account management (basic)

### Dependencies

- Milestone 4 complete (kitchen dashboard)

### Engineering Tasks

**Backend:**
- [ ] Admin menu module:
  - [ ] `GET /api/admin/menu/items` — all items with availability per store
  - [ ] `PUT /api/admin/menu/items/:id` — update item (name, description, price, image)
  - [ ] `PATCH /api/admin/menu/items/:id/toggle` — toggle active/inactive
  - [ ] `PATCH /api/admin/menu/items/:id/stores/:storeId` — toggle store availability, set price override
- [ ] Admin store module:
  - [ ] `PUT /api/admin/stores/:id` — update store settings
  - [ ] `PUT /api/admin/stores/:id/hours` — update operating hours
  - [ ] `PATCH /api/admin/stores/:id/accepting` — pause/resume ordering (with reason, auto-resume timer)
- [ ] Admin order module:
  - [ ] `GET /api/admin/orders` with search (order number, customer name/email)
  - [ ] `POST /api/admin/orders/:id/refund` — issue full or partial refund via Stripe
  - [ ] Refund side effects: update payment, update order status, revoke loyalty points, audit log
- [ ] Admin staff module (basic):
  - [ ] `GET /api/admin/staff` — list admin users
  - [ ] `POST /api/admin/staff` — create staff account (sign up via Supabase Auth + set role + assign store)
  - [ ] `PATCH /api/admin/staff/:id` — update role, permissions, store assignment
  - [ ] `DELETE /api/admin/staff/:id` — deactivate (soft delete)
- [ ] Audit logging interceptor: capture all admin write operations

**Admin Dashboard:**
- [x] MenuManager page: table with inline price editing, active toggle
- [ ] AvailabilityPage: single-toggle per item, per store. No confirmation dialogs. Instant.
- [ ] ItemEditorPage: form for name, description, price, category, modifiers, image upload
- [ ] StoreSettingsPage: general info, hours editor, pause ordering section
- [ ] OrderSearchPage: search by order number/customer, filters, date range
- [ ] OrderDetailPage: full receipt, status timeline, refund button
- [ ] RefundModal: amount, reason, confirmation
- [ ] StaffManagementPage: list, create, edit role/permissions
- [ ] Store selector in header (filters all pages)

### QA Checklist

- [ ] Toggle item availability → item disappears from customer menu within 5 seconds
- [ ] Toggle item back → item reappears
- [ ] Edit item price → customer sees new price on next menu load
- [ ] Update store hours → store shows correct open/closed status
- [ ] Pause ordering → new orders rejected with "not accepting orders" message
- [ ] Resume ordering → orders accepted again
- [ ] Auto-resume timer works (pause for 30 min → auto-resumes)
- [ ] Search orders by order number → correct result
- [ ] Search orders by customer email → correct results
- [ ] Issue full refund → Stripe refund created, payment status updated, order status updated
- [ ] Issue partial refund → correct amount refunded
- [ ] Cannot refund more than original amount
- [ ] Refund logged in audit log with staff member and reason
- [ ] Create staff account → can log in to admin dashboard
- [ ] Staff scoped to store → can only see that store's data
- [ ] Audit log shows all admin actions

### Launch Blockers

- [ ] Sold-out toggle must work in under 3 seconds (end-to-end)
- [ ] Refund flow must be tested with Stripe test mode
- [ ] Store manager cannot access other stores' data

---

## Milestone 7: Launch Hardening

**Duration:** 1.5 weeks
**Goal:** The app is production-ready. Performance, security, error handling, and edge cases are all addressed. Ready for App Store and Play Store submission.

### Scope

- Performance optimization
- Error handling audit
- Security hardening
- Redis caching
- Rate limiting
- Monitoring and alerting setup
- App Store / Play Store submission prep
- Production deployment

### Dependencies

- All previous milestones complete
- Production Supabase project (separate from dev/staging)
- Production Stripe account (live mode keys)
- Apple Developer account ($99/year)
- Google Play Developer account ($25 one-time)
- Domain: api.stormburger.com, admin.stormburger.com

### Engineering Tasks

**Backend:**
- [ ] Redis caching:
  - [ ] Menu cache per store (5-minute TTL)
  - [ ] Store list cache (1-hour TTL)
  - [ ] User role cache (60-second TTL)
  - [ ] Idempotency key cache (24-hour TTL)
  - [ ] Cache invalidation on admin menu/store changes
- [ ] Rate limiting:
  - [ ] Auth endpoints: 10/15min per IP
  - [ ] Checkout: 5/15min per user
  - [ ] Cart writes: 30/min per user
  - [ ] Menu reads: 100/min per IP
  - [ ] Admin: 120/min per user
- [ ] Error handling audit:
  - [ ] Every endpoint returns consistent error format
  - [ ] No stack traces in production responses
  - [ ] All Supabase errors are caught and wrapped
  - [ ] All Stripe errors are caught and wrapped
- [ ] Security:
  - [ ] CORS configured for production domains only
  - [ ] Helmet headers (HSTS, X-Frame-Options, etc.)
  - [ ] Request body size limit (1MB)
  - [ ] SQL injection audit (all queries parameterized — verify)
  - [ ] Secrets audit: no keys in code, logs, or error messages
- [ ] Health check: `GET /health` returns DB, Redis, Stripe status
- [ ] Structured logging: JSON format with request_id, duration, status_code
- [ ] Production deployment:
  - [ ] Deploy NestJS to Railway/Render/Fly.io
  - [ ] Set all environment variables
  - [ ] Configure custom domain: api.stormburger.com
  - [ ] SSL certificate (auto via hosting platform)
  - [ ] Configure Stripe webhook URL to production endpoint

**Mobile:**
- [ ] Performance:
  - [ ] Replace FlatList with FlashList for menu and order lists
  - [ ] Image optimization: progressive loading, thumbnails, caching
  - [ ] Lazy load screens that aren't immediately visible
  - [ ] Measure and optimize cold start time (target: < 2.5s)
- [ ] Error handling:
  - [ ] Every API call has try/catch with user-friendly error messages
  - [ ] Network error detection: "No internet connection" screen
  - [ ] Token expiry: auto-refresh, sign out on failure
  - [ ] Checkout errors: specific messages for each failure type
- [ ] Offline:
  - [ ] Cache store list and menu in AsyncStorage
  - [ ] Show cached data with "Last updated X ago" indicator
  - [ ] Block checkout when offline with clear message
- [ ] Polish:
  - [ ] Loading skeletons on every screen (no spinners)
  - [ ] Pull-to-refresh on all list screens
  - [ ] Keyboard handling on all form screens
  - [ ] Safe area handling on all devices
  - [ ] Splash screen with proper duration
- [ ] App Store prep:
  - [ ] App icon (all sizes)
  - [ ] Launch screen
  - [ ] Bundle ID: com.stormburger.app
  - [ ] Version: 1.0.0, build: 1
  - [ ] Privacy policy URL
  - [ ] App Store screenshots (6.7", 6.5", 5.5")
  - [ ] App Store description and keywords
  - [ ] iOS: request App Store review
  - [ ] Android: create Play Store listing

**Admin:**
- [ ] Deploy to Vercel/Netlify
- [ ] Configure domain: admin.stormburger.com
- [ ] Production Supabase + API URL configuration
- [ ] Error boundary: catch React errors, show "Something went wrong" page
- [ ] Loading states on all pages

**Infrastructure:**
- [ ] Monitoring:
  - [ ] Sentry for error tracking (backend + mobile + admin)
  - [ ] Uptime monitoring on api.stormburger.com/health
  - [ ] Slack alerts for critical errors
- [ ] Backups:
  - [ ] Verify Supabase daily backups are enabled
  - [ ] Verify PITR is enabled
  - [ ] Test restore from backup (restore to test project)
- [ ] Stripe:
  - [ ] Switch to live mode keys
  - [ ] Configure production webhook URL
  - [ ] Test with real card (charge $1, refund immediately)

### QA Checklist

**Full regression test — every flow end-to-end:**
- [ ] Sign up → sign in → browse menu → customize item → add to cart → checkout → pay → order confirmed → track order → picked up
- [ ] Sign out → sign in with same account → order history shows previous order
- [ ] Place 2 orders in sequence → both appear in history
- [ ] Cancel order before preparation → refund issued, notification received
- [ ] Kitchen dashboard: accept → prepare → ready → picked up (test full flow)
- [ ] Toggle item sold out → verify customer can't add it → toggle back → verify customer can add it
- [ ] Pause ordering → verify customer gets error → resume → verify customer can order
- [ ] Change store hours → verify open/closed status updates
- [ ] Edit item price → verify customer sees new price
- [ ] Issue refund → verify Stripe refund, payment status, order status, loyalty points

**Edge cases:**
- [ ] Place order, kill app, reopen → order status screen shows current status
- [ ] Place order on WiFi, switch to cellular → realtime still works
- [ ] Lose connectivity during checkout → error message, retry works
- [ ] Background the app for 30 minutes → reopen → session still valid
- [ ] Two kitchen dashboards open → both update simultaneously
- [ ] Rapid double-tap on Pay → only one order created

**Performance:**
- [ ] Cold start < 2.5 seconds (measure on physical device)
- [ ] Menu screen scrolls at 60 FPS
- [ ] Checkout completes in < 3 seconds
- [ ] Kitchen dashboard updates in < 1 second

**Security:**
- [ ] API rejects requests without valid JWT (except public endpoints)
- [ ] Customer cannot access admin endpoints
- [ ] Staff cannot access other stores' data
- [ ] No secrets visible in API responses or error messages
- [ ] HTTPS only — HTTP requests rejected

### Launch Blockers

- [ ] All payment flows tested with Stripe live mode
- [ ] App Store approval received
- [ ] Play Store approval received
- [ ] Production monitoring active and alerts verified
- [ ] At least one backup restore test completed
- [ ] Privacy policy published at stormburger.com/privacy
- [ ] Terms of service published at stormburger.com/terms
- [ ] Kitchen staff trained on dashboard usage
- [ ] Store managers trained on admin tools

---

## Summary

| Milestone | Duration | Key Deliverable |
|---|---|---|
| 1. Foundation | 1.5 weeks | Auth + stores + menu — everything connects |
| 2. Ordering Flow | 2 weeks | Full cart experience with validation |
| 3. Checkout & Payment | 2 weeks | Real orders, real payments, idempotent |
| 4. Order Tracking | 1.5 weeks | Real-time status + kitchen dashboard + push |
| 5. Loyalty Lite | 1 week | Points earning + display (no redemption) |
| 6. Admin Tools | 1.5 weeks | Menu management + store control + refunds |
| 7. Launch Hardening | 1.5 weeks | Performance + security + deployment + submission |
| **Total** | **~11 weeks** | **Production-ready MVP** |

### Post-Launch (V2 Priorities)

1. Loyalty redemption (redeem points for discounts/free items)
2. Promo codes
3. Storm Mode (one-tap reorder)
4. Guest checkout
5. Reorder from history
6. Scheduled orders
7. Catering inquiry form
8. Phone/OTP sign-in
9. Toast POS integration
10. Delivery

---

*Each milestone produces a working, testable increment. No milestone depends on mocked data that will be replaced later (except images). The foundation is real from day one. Payments are real from milestone 3. By milestone 4, the full order loop works end-to-end. Milestones 5–7 add business value and production hardening on top of a working core.*
