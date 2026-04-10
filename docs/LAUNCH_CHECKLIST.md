# StormBurger — Launch Readiness Checklist

**Date:** April 10, 2026

---

## Backend (NestJS) — 40 routes, 13 modules

### Verified Working
- [x] Auth: signup, signin, refresh, signout, me, update profile
- [x] Stores: list, detail, hours, open status
- [x] Menu: store-specific menu with images, item detail with modifiers
- [x] Cart: add/remove/update with modifier validation, server-side pricing
- [x] Checkout: preview, idempotent order creation, Stripe PaymentIntent
- [x] Payments: webhook handler, payment status reconciliation
- [x] Orders: history, detail, status updates with valid transitions
- [x] Admin: orders list, menu toggle, price update, item field update
- [x] Favorites: save with modifiers + custom name, cart payload
- [x] Loyalty: points accrual on payment, redemption at checkout, tier calculation
- [x] Reorder: availability check, cart-ready payload
- [x] Notifications: push token registration, preferences, order status dispatch
- [x] Health: DB + Auth + Stripe connectivity check
- [x] Preferred store: save/retrieve via profile

### Edge Cases Verified
- [x] Empty cart → "Your cart is empty"
- [x] Invalid modifiers → rejected with specific message
- [x] Required modifier groups → enforced
- [x] Duplicate order (idempotency) → returns existing order
- [x] Race condition on idempotency → DB unique constraint catches it
- [x] Invalid status transition → rejected
- [x] Expired/invalid JWT → 401
- [x] Unavailable items in favorites → flagged but not blocked
- [x] Reorder with deleted items → split into available/unavailable
- [x] Loyalty over-redeem → "Insufficient points"
- [x] Store closed → blocks checkout with hours message
- [x] Payment init failure → order cancelled with reason

### Security
- [x] Helmet headers enabled
- [x] CORS locked to production domains (open in dev)
- [x] Input validation (whitelist + forbidNonWhitelisted)
- [x] No secrets in code or logs
- [x] Service role key in .env only
- [x] Webhook signature verification (strict in prod)
- [x] Role-based access on all admin endpoints
- [x] Store-scoped permissions for managers
- [x] Prices always calculated server-side

### Pre-Deploy
- [ ] Set NODE_ENV=production
- [ ] Set STRIPE_WEBHOOK_SECRET (from Stripe dashboard)
- [ ] Deploy to Railway/Render/Fly.io
- [ ] Configure custom domain: api.stormburger.com
- [ ] SSL certificate (auto via hosting platform)
- [ ] Set up Sentry for error tracking
- [ ] Set up uptime monitoring on /api/health
- [ ] Test with Stripe live mode keys
- [ ] Run full checkout during store hours

---

## Database (Supabase)

### Tables Created
- [x] users
- [x] locations + location_hours
- [x] menu_items + location_menu_items
- [x] modifier_groups + modifiers + menu_item_modifier_groups
- [x] carts + cart_items + cart_item_modifiers
- [x] orders + order_items + order_item_modifiers
- [x] payments
- [x] favorites (with modifier_ids, custom_name, quantity)
- [x] loyalty_accounts + loyalty_transactions
- [x] notification_preferences + push_tokens

### RLS Policies
- [x] Public read: locations, hours, menu, modifiers
- [x] User-scoped: orders, cart, favorites, loyalty, notifications
- [x] Admin: full access via get_user_role() function

### Data
- [x] 2 locations (Inglewood, Long Beach) with hours
- [x] 41 menu items with real images from stormburger.com
- [x] 8 modifier groups with modifiers
- [x] All items linked to both locations

---

## Mobile App (React Native)

### Built
- [x] Lightning splash screen
- [x] Auth (signup/signin)
- [x] Location selector
- [x] Menu browser with category tabs
- [x] Item detail with modifiers and hero image
- [x] Cart with price calculation
- [x] Checkout with Stripe Payment Sheet
- [x] Order confirmation

### Pre-Deploy
- [ ] Build release version (not debug)
- [ ] Update API URL to production
- [ ] Bundle ID: change from org.reactjs.native.example.mobile to com.stormburger.app
- [ ] App icon + splash screen assets
- [ ] TestFlight submission (iOS)
- [ ] Play Store submission (Android)

---

## Admin Dashboard (Orchid)

### Built
- [x] Staff sign-in
- [x] Live orders with Supabase Realtime
- [x] Order status management
- [x] Menu manager with images
- [x] Item toggle + price edit (via REST API)
- [x] All writes through backend API (zero direct Supabase)

---

## Logging & Monitoring Recommendations

### Day 1 (Launch)
1. **Sentry** — error tracking for backend + mobile
2. **Uptime monitor** — check /api/health every 60 seconds
3. **Slack alerts** — critical errors and payment failures

### Week 1
4. **Structured logs** — already in place (JSON format with request_id)
5. **Payment monitoring** — alert on >3 consecutive failures
6. **Order volume dashboard** — orders per hour per store

### Month 1
7. **APM** — request latency percentiles (p50, p95, p99)
8. **Database query monitoring** — Supabase dashboard
9. **Customer funnel** — cart → checkout → payment → completion rate
