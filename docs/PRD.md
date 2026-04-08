# StormBurger Mobile App — Product Requirements Document

**Version:** 1.0
**Date:** April 6, 2026
**Author:** Product & Engineering
**Status:** Active

---

## 1. Product Vision

StormBurger is building a mobile ordering platform that makes ordering food as fast as the kitchen makes it. The app serves as the primary digital channel for StormBurger's growing restaurant brand, starting with two locations in the greater Los Angeles area (Inglewood and Long Beach) and expanding to Compton and beyond.

The app must feel premium — on par with the best quick-service restaurant apps in the market (Chick-fil-A, Shake Shack, Wingstop). It should be fast, visually striking, and designed for heavy repeat usage by loyal customers who order multiple times per week.

The core promise to customers: **order ahead, skip the line, earn rewards, and never wait.**

The core promise to the business: **higher average order values, predictable kitchen throughput, direct customer relationships, and data-driven operations across all locations.**

---

## 2. User Types

### 2.1 Customer (Primary)
The everyday customer who orders food from StormBurger. They range from first-time visitors to regulars who order 3–5 times per week. They expect a fast, intuitive experience. Most are mobile-first, aged 18–40, and located within a 10-mile radius of a StormBurger location.

**Key behaviors:**
- Orders the same items frequently (high reorder rate)
- Price-conscious but willing to pay for quality
- Values speed and convenience above all
- Likely to share the app with friends if the experience is good
- Expects Apple Pay and contactless payment

### 2.2 Staff Member
A StormBurger kitchen or counter employee who receives and fulfills mobile orders. They interact with the admin dashboard on a tablet or desktop behind the counter.

**Key behaviors:**
- Needs to see incoming orders immediately
- Must update order status quickly (confirmed → preparing → ready)
- May manage the queue across multiple order channels (walk-in, phone, app)
- Works in a fast-paced environment — every tap matters

### 2.3 Manager / Admin
A StormBurger manager or owner who oversees operations. They manage the menu, monitor order volume, adjust availability, and handle escalations.

**Key behaviors:**
- Adjusts menu items, prices, and availability per location
- Reviews daily/weekly sales reports
- Handles refunds and order issues
- Manages staff accounts and permissions
- Monitors catering inquiries

### 2.4 Catering Inquiry Contact
A person or organization interested in booking StormBurger's food truck or catering services for an event. They submit an inquiry through the app or website and expect a timely response.

---

## 3. Business Goals

### 3.1 Revenue Growth
- Drive 30% of total order volume through the app within 12 months of launch
- Increase average order value by 15% versus walk-in orders through upselling and combo suggestions
- Reduce order abandonment to below 20% through streamlined checkout

### 3.2 Customer Retention
- Achieve 40% 30-day retention among new app users
- Build a loyalty program that drives 2x repeat purchase rate among enrolled members
- Collect customer data (order history, preferences, contact info) to enable personalized marketing

### 3.3 Operational Efficiency
- Reduce counter wait times by shifting volume to pre-orders
- Give kitchen staff advance notice of incoming orders (15–20 minute lead time)
- Enable centralized menu management across all locations from a single dashboard

### 3.4 Brand & Expansion
- Establish StormBurger as a digitally-forward brand
- Build infrastructure that scales to 10+ locations without re-architecture
- Create a platform that supports future delivery, catering, and franchise operations

---

## 4. Core Features

### 4.1 Location Selection
Customers choose which StormBurger location they want to order from. The app shows all active locations with addresses, current open/closed status, and operating hours. GPS-based sorting shows the nearest location first.

### 4.2 Menu Browsing
The full menu is displayed for the selected location, organized by category (Combos, Burgers, Chicken, Sides, Drinks). Each item shows its name, description, price, and photo. Prices and availability are location-specific — a location can override the base price or mark items as unavailable.

### 4.3 Item Customization
Customers tap into any item to customize it. Modifier groups (toppings, cheese type, drink choice, sauces) are presented with clear labels. Required modifiers are enforced before adding to cart. Price adjustments for premium add-ons (extra patty, bacon, avocado) are shown inline.

### 4.4 Cart Management
The cart persists throughout the session. Customers can adjust quantities, remove items, and see a running subtotal. The cart is tied to a specific location — switching locations clears the cart with a confirmation prompt.

### 4.5 Checkout & Payment
Checkout shows a complete order summary with subtotal, tax (California 9.75%), and total. Payment is handled through Stripe with support for credit/debit cards, Apple Pay, and Google Pay. Orders are created idempotently to prevent duplicate charges.

### 4.6 Order Tracking
After placing an order, customers see real-time status updates: Received → Confirmed → Preparing → Ready for Pickup. Push notifications are sent at each status change. The confirmation screen shows the order number and estimated pickup time.

### 4.7 Order History
Customers can view their past orders with full details (items, modifiers, totals, date, location). A "Reorder" button lets them add the same items to their cart with one tap.

### 4.8 Loyalty & Rewards (V2)
A points-based loyalty program where customers earn points on every dollar spent. Points can be redeemed for free items or discounts. Tier-based progression (Bronze → Silver → Gold) unlocks perks like priority pickup and exclusive menu items.

### 4.9 Catering & Events Inquiry
A form within the app for customers to submit catering requests (date, event type, guest count, location). Submissions are emailed to events@stormburger.com and tracked in the admin dashboard.

### 4.10 Kitchen Dashboard (Admin)
A web-based dashboard for kitchen staff showing incoming orders in real-time. Orders are displayed as cards with item details, modifiers, special instructions, and action buttons (Accept, Start Preparing, Mark Ready). New orders trigger an audio alert.

### 4.11 Menu Management (Admin)
Managers can edit menu items (name, description, price, photo), toggle item availability per location, and create/remove modifier options. Changes take effect immediately.

### 4.12 Reporting (Admin)
Sales reports by day, week, and month. Breakdowns by location, item, category, and payment method. Export to CSV for accounting.

---

## 5. MVP Scope (V1)

The MVP delivers the core ordering loop: a customer can open the app, create an account, pick a location, browse the menu, customize items, pay, and pick up their food. The kitchen can see and manage incoming orders in real-time.

**Included in V1:**
- Customer sign-up / sign-in (email + password)
- Location selection (Inglewood, Long Beach)
- Full menu browsing with categories
- Item customization with modifiers
- Cart with quantity management
- Checkout with Stripe payment (card + Apple Pay)
- Order confirmation with order number and estimated pickup time
- Real-time order status updates
- Push notifications for order status changes
- Kitchen dashboard (web) with real-time order feed
- Order status management (accept/reject/prepare/ready/picked up)
- Menu manager (toggle availability, edit prices)
- Basic order history for customers

**Explicitly excluded from V1:**
- Loyalty / rewards program
- Delivery
- Catering inquiry form
- Promo codes / coupons
- Reorder functionality
- Guest checkout (account required)
- Reporting dashboard
- Toast POS integration
- Multi-language support

---

## 6. V2 Scope

V2 focuses on retention, revenue optimization, and operational scaling.

**Loyalty & Rewards**
- Points accumulation on every order (1 point per dollar)
- Points redemption for free items
- Tier progression with unlockable perks
- Loyalty dashboard showing points balance and tier status
- Birthday rewards (auto-detected or user-entered)

**Reorder & Favorites**
- One-tap reorder from order history
- Save favorite items for quick access
- "Order Again" carousel on the home screen

**Promo Codes & Offers**
- Admin-created promo codes (percentage off, fixed discount, free item)
- Location-specific and time-limited promotions
- First-order discount for new users
- Push notification campaigns for promotions

**Catering Inquiry**
- In-app form: date, event type, guest count, dietary needs, contact info
- Submission creates a record in admin dashboard
- Auto-email to events@stormburger.com
- Status tracking (Submitted → Contacted → Confirmed → Completed)

**Delivery (V2.5)**
- Integration with a third-party delivery provider or in-house drivers
- Delivery address management
- Real-time driver tracking
- Delivery fee calculation based on distance

**Reporting Dashboard**
- Revenue by day/week/month with charts
- Top-selling items
- Order volume trends
- Location comparison
- Export to CSV

**Toast POS Integration**
- Orders placed through the app are automatically sent to the Toast POS system
- Menu sync between Toast and the app
- Unified reporting across in-store and app orders

---

## 7. User Flows

### 7.1 First-Time Customer Order
1. Customer downloads the app and opens it
2. Sees the StormBurger splash screen and "Sign Up" / "Sign In" options
3. Creates account with name, email, and password
4. Lands on location selection screen showing nearest locations
5. Taps "StormBurger Inglewood" — sees it's open
6. Browses the menu — scrolls through Combos, taps "Classic StormBurger Combo"
7. Customizes: selects Cheddar cheese, adds Bacon (+$1.50), chooses Sprite
8. Taps "Add to Cart — $15.48"
9. Sees "View Cart (1)" button at bottom of menu — adds another item or taps it
10. Reviews cart: 1x Classic StormBurger Combo — $15.48. Sees subtotal, tax, total.
11. Taps "Checkout" — reviews order summary and pickup location
12. Taps "Pay $16.99" — Stripe payment sheet appears
13. Pays with Apple Pay — payment succeeds
14. Sees confirmation: "Order Placed! SB-20260406-001. Estimated pickup: 6:35 PM"
15. Receives push notification: "Your order has been confirmed!"
16. Drives to StormBurger, shows order number, picks up food

### 7.2 Repeat Customer Reorder (V2)
1. Customer opens app — already signed in
2. Sees "Order Again" section showing their last 3 orders
3. Taps "Reorder" on a previous order
4. Cart is populated with the same items and modifiers
5. Selects location, reviews cart, pays — done in under 60 seconds

### 7.3 Kitchen Staff Fulfillment
1. Staff opens admin dashboard on kitchen tablet
2. Sees real-time feed of incoming orders
3. New order appears with audio alert — "SB-20260406-001"
4. Staff reviews items: 1x Classic StormBurger Combo (Cheddar, Bacon, Sprite)
5. Taps "Accept" — order status changes to "Confirmed"
6. Customer receives push notification: "Your order is confirmed!"
7. Staff begins preparing the order, taps "Start Preparing"
8. Customer receives: "Your order is being prepared!"
9. Order is ready — staff taps "Mark Ready"
10. Customer receives: "Your order is ready for pickup!"
11. Customer arrives, shows order number, staff taps "Picked Up"

### 7.4 Manager Menu Update
1. Manager opens admin dashboard, navigates to Menu Manager
2. Sees all items organized by category
3. Notices the kitchen is out of Jalapeño Lightning Burgers
4. Toggles "Jalapeño Lightning Burger" to Inactive
5. Item immediately disappears from the customer menu at all locations
6. Kitchen gets through the rush, manager toggles it back to Active

### 7.5 Catering Inquiry (V2)
1. Customer opens app, navigates to "More" tab
2. Taps "Catering & Events"
3. Fills out form: Event date, estimated guests (50), event type (corporate), contact info
4. Taps "Submit Inquiry"
5. Sees confirmation: "We'll be in touch within 24 hours!"
6. StormBurger events team receives email and admin dashboard notification
7. Team contacts customer, finalizes details, marks inquiry as "Confirmed"

---

## 8. Functional Requirements

### 8.1 Authentication
- FR-AUTH-01: Users can create an account with email and password
- FR-AUTH-02: Users can sign in with existing credentials
- FR-AUTH-03: Sessions persist across app restarts (refresh token)
- FR-AUTH-04: Users can sign out, clearing all local session data
- FR-AUTH-05: Password must be minimum 8 characters
- FR-AUTH-06: (V2) Users can sign in with phone number via OTP

### 8.2 Locations
- FR-LOC-01: App displays all active StormBurger locations
- FR-LOC-02: Each location shows name, address, and open/closed status
- FR-LOC-03: Open/closed status is calculated from the location's operating hours and timezone
- FR-LOC-04: Locations are sorted by distance from the user's current position (with permission)
- FR-LOC-05: Locations that are not accepting orders show a "Closed" badge and cannot be selected for ordering

### 8.3 Menu
- FR-MENU-01: Menu items are grouped by category (Combos, Burgers, Chicken, Sides, Drinks)
- FR-MENU-02: Each item shows name, description, price, and image
- FR-MENU-03: Prices reflect location-specific overrides when applicable
- FR-MENU-04: Items marked as unavailable at the selected location are hidden
- FR-MENU-05: Menu data is fetched per-location and cached for the session

### 8.4 Item Customization
- FR-CUST-01: Tapping a menu item opens a detail screen with modifier groups
- FR-CUST-02: Required modifier groups must have a selection before the item can be added to cart
- FR-CUST-03: Single-select modifier groups allow only one choice (e.g., cheese type)
- FR-CUST-04: Multi-select modifier groups allow multiple choices up to a maximum (e.g., toppings)
- FR-CUST-05: Price adjustments for modifiers are displayed inline
- FR-CUST-06: The total price updates in real-time as modifiers are selected
- FR-CUST-07: Customers can set a quantity before adding to cart

### 8.5 Cart
- FR-CART-01: Items added to cart persist until checkout or manual removal
- FR-CART-02: Cart displays item name, modifiers, quantity, and line total
- FR-CART-03: Customers can increase/decrease quantity or remove items
- FR-CART-04: Reducing quantity to zero removes the item from cart
- FR-CART-05: Switching locations clears the cart after a confirmation prompt
- FR-CART-06: A floating cart button shows the current item count on the menu screen

### 8.6 Checkout & Payment
- FR-PAY-01: Checkout displays order summary, subtotal, tax, and total
- FR-PAY-02: California sales tax (9.75%) is applied to all orders
- FR-PAY-03: Payment is processed through Stripe
- FR-PAY-04: Supported payment methods: credit/debit card, Apple Pay, Google Pay
- FR-PAY-05: Orders are created with an idempotency key to prevent duplicate charges
- FR-PAY-06: If payment fails, the customer is shown a clear error message and can retry
- FR-PAY-07: If the customer cancels payment, the order remains in pending state and can be retried
- FR-PAY-08: Customers can add special instructions for the kitchen

### 8.7 Order Tracking
- FR-ORD-01: After payment, customers see a confirmation screen with order number and estimated pickup time
- FR-ORD-02: Order status updates in real-time: Pending → Confirmed → Preparing → Ready → Picked Up
- FR-ORD-03: Push notifications are sent at each status transition
- FR-ORD-04: Customers can view their active order status from the home screen

### 8.8 Order History
- FR-HIST-01: Customers can view their past 20 orders
- FR-HIST-02: Each order shows date, location, items, total, and status
- FR-HIST-03: (V2) Customers can tap "Reorder" to add the same items to cart

### 8.9 Kitchen Dashboard
- FR-KITCHEN-01: Dashboard shows all active orders (pending, confirmed, preparing, ready) in real-time
- FR-KITCHEN-02: New orders trigger a visual indicator and audio alert
- FR-KITCHEN-03: Staff can accept or reject pending orders
- FR-KITCHEN-04: Staff can advance order status through the fulfillment pipeline
- FR-KITCHEN-05: Order cards show all items, modifiers, special instructions, and total
- FR-KITCHEN-06: Dashboard can be filtered by location
- FR-KITCHEN-07: Status transitions are validated — orders cannot skip steps or go backward

### 8.10 Menu Management
- FR-MGMT-01: Admins can toggle menu items active/inactive
- FR-MGMT-02: Admins can edit item prices (base and location-specific overrides)
- FR-MGMT-03: Admins can edit item names, descriptions, and images
- FR-MGMT-04: Admins can toggle item availability per location
- FR-MGMT-05: Changes take effect immediately without app updates

---

## 9. Non-Functional Requirements

### 9.1 Performance
- NFR-PERF-01: Menu screen loads in under 2 seconds on 4G connections
- NFR-PERF-02: Order creation completes in under 3 seconds including payment
- NFR-PERF-03: Kitchen dashboard updates within 1 second of order status change
- NFR-PERF-04: App cold start to interactive in under 3 seconds

### 9.2 Scalability
- NFR-SCALE-01: System supports up to 1,000 concurrent orders across all locations
- NFR-SCALE-02: Database schema supports 100+ locations without migration
- NFR-SCALE-03: Architecture supports 200,000+ registered users
- NFR-SCALE-04: API handles 500 requests per second at peak

### 9.3 Availability
- NFR-AVAIL-01: Backend uptime of 99.9% (less than 8.7 hours downtime per year)
- NFR-AVAIL-02: Payment processing degrades gracefully — if Stripe is down, users see a clear message
- NFR-AVAIL-03: Menu data is cached client-side for offline browsing (ordering requires connectivity)

### 9.4 Security
- NFR-SEC-01: All API communication over HTTPS/TLS 1.3
- NFR-SEC-02: Payment card data never touches our servers (Stripe tokenization)
- NFR-SEC-03: User passwords hashed with bcrypt (handled by Supabase Auth)
- NFR-SEC-04: API endpoints require authentication except for public menu and location data
- NFR-SEC-05: Order creation, payment, and status updates run through server-side validation — never trust the client
- NFR-SEC-06: Row-level security policies enforce data isolation between users
- NFR-SEC-07: Admin operations require elevated role (staff/manager/admin)

### 9.5 Compatibility
- NFR-COMPAT-01: iOS 16+ and Android 12+ support
- NFR-COMPAT-02: Admin dashboard supports Chrome, Safari, and Firefox (latest 2 versions)
- NFR-COMPAT-03: App is responsive across iPhone SE through iPhone Pro Max screen sizes

### 9.6 Observability
- NFR-OBS-01: All API requests are logged with request ID, duration, and status code
- NFR-OBS-02: Payment failures are logged with Stripe error codes
- NFR-OBS-03: Order lifecycle events are stored for audit trail

---

## 10. Admin / Operations Requirements

### 10.1 Staff Management
- OPS-01: Admins can create staff accounts with email and role assignment
- OPS-02: Roles: Staff (order management), Manager (menu + reports), Admin (everything)
- OPS-03: Staff accounts can be deactivated without deletion

### 10.2 Location Management
- OPS-04: Admins can add new locations with address, coordinates, and operating hours
- OPS-05: Admins can temporarily disable ordering for a location (maintenance, emergency, etc.)
- OPS-06: Operating hours are set per day of week per location

### 10.3 Order Operations
- OPS-07: Managers can issue full or partial refunds through the admin dashboard
- OPS-08: Cancelled orders record the reason and the staff member who cancelled
- OPS-09: Orders older than 2 hours in "Ready" status are auto-flagged for review

### 10.4 Financial Operations
- OPS-10: All payments are recorded with Stripe payment intent IDs for reconciliation
- OPS-11: Daily sales summaries are available in the admin dashboard
- OPS-12: Tax is calculated and recorded separately from the subtotal for accounting

---

## 11. Analytics Requirements

### 11.1 Customer Analytics
- AN-01: Track daily/weekly/monthly active users
- AN-02: Track new user registrations by source
- AN-03: Track order frequency per customer (orders per week/month)
- AN-04: Track cart abandonment rate (cart created but never checked out)
- AN-05: Track average time from app open to order placed

### 11.2 Order Analytics
- AN-06: Track total orders by day, location, and category
- AN-07: Track average order value by location
- AN-08: Track top 10 most ordered items per location
- AN-09: Track order volume by hour of day (peak hours analysis)
- AN-10: Track fulfillment time (order placed → order picked up)

### 11.3 Revenue Analytics
- AN-11: Track gross revenue by day, week, month, and location
- AN-12: Track revenue per item and category
- AN-13: Track average revenue per customer
- AN-14: (V2) Track loyalty point issuance and redemption rates
- AN-15: (V2) Track promo code usage and associated revenue impact

### 11.4 Operational Analytics
- AN-16: Track average time per order status (pending → confirmed, confirmed → preparing, etc.)
- AN-17: Track order rejection rate by location
- AN-18: Track menu item availability (how often items are toggled off)

---

## 12. Risks and Dependencies

### 12.1 Technical Risks

**Stripe Payment Failures**
Risk: Payment processing failures during peak hours could block orders.
Mitigation: Implement retry logic with exponential backoff. Show clear error messages. Log all payment failures for investigation. Consider a fallback "pay at pickup" option for outages.

**Real-Time Order Updates**
Risk: Supabase Realtime connection drops could cause kitchen staff to miss orders.
Mitigation: Implement reconnection logic with heartbeat checks. Add polling fallback if WebSocket is disconnected for more than 10 seconds. Audio alerts on new orders ensure attention even if the screen isn't watched.

**Mobile App Performance**
Risk: Large menus with many modifiers could cause slow rendering on older devices.
Mitigation: Paginate modifier groups, lazy-load images, cache menu data locally.

### 12.2 Business Risks

**Low Adoption**
Risk: Customers may prefer walk-in ordering over using the app.
Mitigation: Offer a first-order discount. Display app QR codes in-store. Train counter staff to mention the app. Loyalty program (V2) creates ongoing incentive.

**Kitchen Overwhelm**
Risk: High app order volume during peak hours could overwhelm the kitchen.
Mitigation: Implement order throttling — cap the number of orders accepted per 15-minute window per location. Auto-extend estimated pickup times during high volume.

**Multi-Location Complexity**
Risk: Different locations may need different menus, prices, or hours.
Mitigation: Already architected with per-location price overrides, availability toggles, and independent operating hours.

### 12.3 Dependencies

| Dependency | Owner | Risk Level |
|---|---|---|
| Stripe payment processing | Stripe | Low — industry standard, 99.99% uptime |
| Supabase database & auth | Supabase | Medium — managed service, monitor for outages |
| Apple App Store approval | Apple | Medium — review process can delay launches |
| Google Play Store approval | Google | Low — faster review than Apple |
| Toast POS integration (V2) | Toast API | High — requires Toast partnership and API access |
| Push notification service | Apple/Google | Low — standard infrastructure |

---

## 13. Open Questions

1. **Order throttling**: What is the maximum number of app orders each location can handle per 15-minute window? Needs input from kitchen operations.

2. **Estimated pickup time**: Is 15–20 minutes the right default, or should this vary by location, time of day, or current order volume?

3. **Refund policy**: What are the rules for app order refunds? Full refund if cancelled before preparation? Partial refund during preparation? No refund once ready?

4. **Guest checkout**: Should V1 allow ordering without creating an account? This reduces friction but prevents order history and loyalty tracking.

5. **Tipping**: Should the app include a tip option at checkout? If so, does the tip go to the kitchen staff, counter staff, or a pool?

6. **Menu photos**: Who is responsible for food photography? Are there existing high-quality photos, or does this need to be produced?

7. **Compton location timeline**: When does the Compton location open, and should it appear in the app as "Coming Soon" before launch?

8. **Toast POS**: Is Toast the confirmed POS system at all locations? Is the Toast API accessible for order injection?

9. **Notifications**: What is the preferred push notification provider? Firebase Cloud Messaging for both platforms, or Apple Push Notification service + FCM separately?

10. **Legal**: Are there specific California regulations for food ordering apps that need to be addressed (calorie counts, allergen info, etc.)?

---

## 14. Acceptance Criteria by Feature

### 14.1 Authentication
- [ ] User can create account with name, email, and password
- [ ] User can sign in with email and password
- [ ] Session persists after app is closed and reopened
- [ ] User can sign out and is returned to the sign-in screen
- [ ] Invalid credentials show a clear error message
- [ ] Duplicate email registration is rejected with a clear message

### 14.2 Location Selection
- [ ] All active locations are displayed with name and address
- [ ] Each location shows current open/closed status based on operating hours
- [ ] Tapping a location navigates to that location's menu
- [ ] Closed locations display a "Closed" badge
- [ ] Locations that are not accepting orders cannot proceed to menu

### 14.3 Menu Browsing
- [ ] Menu items are grouped by category with section headers
- [ ] Each item shows name, description, and price
- [ ] Prices reflect location-specific overrides
- [ ] Items marked unavailable at the location are not shown
- [ ] Tapping an item navigates to the customization screen

### 14.4 Item Customization
- [ ] Modifier groups are displayed with labels and selection instructions
- [ ] Required groups show a "Required" badge
- [ ] Single-select groups allow only one active selection
- [ ] Multi-select groups enforce min/max selection limits
- [ ] Price adjustments are shown next to each modifier
- [ ] Total price updates in real-time
- [ ] Quantity can be increased/decreased (minimum 1)
- [ ] "Add to Cart" button shows the calculated total

### 14.5 Cart
- [ ] Added items appear in cart with name, modifiers, quantity, and price
- [ ] Quantity can be adjusted; reducing to 0 removes the item
- [ ] Subtotal, tax, and total are calculated correctly
- [ ] Cart persists while navigating between screens
- [ ] Empty cart shows a message and a "Browse Menu" button
- [ ] Switching locations prompts to clear the cart

### 14.6 Checkout & Payment
- [ ] Order summary shows all items, modifiers, and totals
- [ ] Special instructions field is available
- [ ] Stripe payment sheet appears with card and Apple Pay options
- [ ] Successful payment navigates to order confirmation
- [ ] Failed payment shows an error and allows retry
- [ ] Cancelled payment returns to checkout without losing cart
- [ ] Duplicate submissions (same idempotency key) return the existing order

### 14.7 Order Tracking
- [ ] Confirmation screen shows order number and estimated pickup time
- [ ] Order status updates in real-time without manual refresh
- [ ] Push notification is received for each status change
- [ ] Order can be viewed from order history

### 14.8 Kitchen Dashboard
- [ ] Active orders appear within 1 second of being placed
- [ ] Order cards show all items, modifiers, special instructions, and total
- [ ] "Accept" button moves order to Confirmed status
- [ ] "Reject" button moves order to Cancelled status
- [ ] "Start Preparing" button moves order to Preparing status
- [ ] "Mark Ready" button moves order to Ready status
- [ ] "Picked Up" button moves order to Picked Up status and removes from active feed
- [ ] Invalid status transitions are rejected (cannot skip steps)
- [ ] Dashboard updates in real-time for all connected clients

### 14.9 Menu Management
- [ ] All menu items are displayed in a table grouped by category
- [ ] Item prices can be edited inline and saved
- [ ] Items can be toggled active/inactive
- [ ] Changes are reflected immediately in the customer app
- [ ] Only users with admin role can access menu management

---

*This document is a living artifact. It will be updated as decisions are made on open questions, V2 features are prioritized, and feedback is collected from the initial launch.*
