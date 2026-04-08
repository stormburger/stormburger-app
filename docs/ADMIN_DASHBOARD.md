# StormBurger — Admin Dashboard Design

**Version:** 1.0
**Date:** April 6, 2026
**Platform:** React (Vite) — Desktop-first, responsive to tablet
**URL:** `https://admin.stormburger.com`

---

## 1. User Roles

### 1.1 Role Definitions

| Role | Who | Scope | Primary Use |
|---|---|---|---|
| **Operations Manager** | Corporate team. Oversees all stores. | All stores | System config, cross-store reporting, staff management, promotions |
| **Store Manager** | Runs a single location. | One store | Daily ops, menu availability, local staff, store settings |
| **Support Staff** | Handles customer issues. | All stores (read) | Order lookup, refunds, customer profiles |
| **Marketing Admin** | Runs campaigns and promos. | All stores | Promotions, loyalty campaigns, analytics |

### 1.2 Role Hierarchy

```
Operations Manager (admin)
    │
    ├── Full access to everything
    ├── Can create/manage other admin users
    ├── Can manage all stores
    └── Can view all audit logs
          │
Store Manager (manager)
    │
    ├── Full access within their assigned store
    ├── Can manage menu availability at their store
    ├── Can pause/resume ordering at their store
    ├── Can manage store hours
    ├── Cannot create promos or modify base menu items
    └── Cannot view other stores' data
          │
Support Staff (staff)
    │
    ├── Read access to orders across all stores
    ├── Can issue refunds (with reason)
    ├── Can look up customers
    ├── Cannot modify menu, stores, or promotions
    └── Cannot view financial reports
          │
Marketing Admin (marketing — new role)
    │
    ├── Full access to promotions and loyalty
    ├── Read access to analytics
    ├── Can create store-specific or global promos
    ├── Cannot modify menu, stores, or orders
    └── Cannot issue refunds
```

---

## 2. Information Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN DASHBOARD                             │
│                                                                 │
│  ┌──────────────┐                                               │
│  │   Sidebar    │   ┌─────────────────────────────────────────┐ │
│  │              │   │              Main Content               │ │
│  │  Dashboard   │   │                                         │ │
│  │  Orders      │   │   ┌──────────┐  ┌──────────┐           │ │
│  │  Menu        │   │   │  Header  │  │  Store   │           │ │
│  │  Stores      │   │   │  Bar     │  │ Selector │           │ │
│  │  Promotions  │   │   └──────────┘  └──────────┘           │ │
│  │  Loyalty     │   │                                         │ │
│  │  Customers   │   │   ┌────────────────────────────────┐   │ │
│  │  Catering    │   │   │                                │   │ │
│  │  Analytics   │   │   │        Page Content            │   │ │
│  │  Audit Log   │   │   │                                │   │ │
│  │  Settings    │   │   │                                │   │ │
│  │              │   │   └────────────────────────────────┘   │ │
│  │  ─────────   │   │                                         │ │
│  │  User Menu   │   └─────────────────────────────────────────┘ │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Global UI Elements

**Sidebar (persistent):**
- StormBurger logo + "ADMIN" label
- Navigation links (icon + text)
- Collapsed state on smaller screens (icon only)
- User avatar + name + role badge at bottom
- Sign out

**Header Bar (per page):**
- Page title + breadcrumb
- Store selector dropdown (operations manager sees all stores, store manager sees only theirs)
- Global search (orders by number, customers by name/email)
- Notification bell (new orders, catering inquiries, system alerts)

**Store Selector:**
- Dropdown in the header: "All Stores" | "Inglewood" | "Long Beach" | "Compton"
- Filters all data on the current page to that store
- Persists across page navigation within the session
- Operations managers default to "All Stores"
- Store managers locked to their assigned store (selector hidden)

---

## 3. Page List and Specifications

### 3.1 Dashboard (Home)

**Path:** `/`
**Access:** All roles

The landing page after login. Shows a real-time operational snapshot.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  TODAY'S SNAPSHOT                    Store: [All ▼]  │
│                                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐ │
│  │Orders│  │Revenue│  │ Avg  │  │ Avg  │  │Active│ │
│  │Today │  │Today │  │Order │  │Wait  │  │Orders│ │
│  │  47  │  │$1,234│  │$26.25│  │ 14m  │  │  3   │ │
│  │ +12% │  │ +8%  │  │ -2%  │  │ -3m  │  │      │ │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘ │
│                                                     │
│  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │  ACTIVE ORDERS       │  │  ORDER VOLUME       │  │
│  │                     │  │  (hourly chart)      │  │
│  │  SB-042 Preparing   │  │  ██████████          │  │
│  │  SB-041 Ready       │  │  ████████            │  │
│  │  SB-040 Confirmed   │  │  ██████████████      │  │
│  │                     │  │  ████████████████    │  │
│  └─────────────────────┘  └─────────────────────┘  │
│                                                     │
│  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │  TOP ITEMS TODAY     │  │  STORE STATUS        │  │
│  │                     │  │                     │  │
│  │  1. Classic Combo 18│  │  Inglewood  ● Open  │  │
│  │  2. Chicken Combo 12│  │  Long Beach ● Open  │  │
│  │  3. Bacon BBQ     8│  │  Compton    ○ Soon  │  │
│  └─────────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Data sources:**
- Stats cards: aggregated from `orders` table, today's date, filtered by store
- Active orders: `orders WHERE status IN ('pending', 'confirmed', 'preparing', 'ready')`
- Order volume chart: orders grouped by hour
- Top items: `order_items` joined to `menu_items`, grouped and counted
- Store status: `stores.is_accepting_orders` + calculated `is_open`

**Auto-refresh:** Every 30 seconds, or realtime via Supabase subscription.

---

### 3.2 Orders

**Path:** `/orders`
**Access:** All roles

#### 3.2.1 Live Orders View

**Path:** `/orders/live`

The kitchen display. Designed for a wall-mounted tablet or counter screen.

```
┌─────────────────────────────────────────────────────┐
│  LIVE ORDERS                   Store: [Inglewood ▼] │
│  3 active orders                    🔊 Sound: ON    │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ PENDING  │  │PREPARING │  │  READY   │          │
│  │          │  │          │  │          │          │
│  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │          │
│  │ │SB-043│ │  │ │SB-042│ │  │ │SB-041│ │          │
│  │ │2 min │ │  │ │5 min │ │  │ │12min │ │          │
│  │ │      │ │  │ │      │ │  │ │      │ │          │
│  │ │2x Cls│ │  │ │1x Bac│ │  │ │3x Chk│ │          │
│  │ │1x Fry│ │  │ │2x Fry│ │  │ │      │ │          │
│  │ │      │ │  │ │Note: │ │  │ │[Done]│ │          │
│  │ │[Acpt]│ │  │ │no pic│ │  │ │      │ │          │
│  │ │[Deny]│ │  │ │      │ │  │ │      │ │          │
│  │ │      │ │  │ │[Rdy] │ │  │ │      │ │          │
│  │ └──────┘ │  │ └──────┘ │  │ └──────┘ │          │
│  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Kanban-style columns: Pending → Preparing → Ready
- Cards show order number, time since created, items summary, special instructions
- Action buttons per status (Accept/Deny, Mark Ready, Picked Up)
- Audio alert on new orders (configurable: on/off, volume)
- Visual alert: card border flashes for orders waiting > 5 minutes
- Auto-remove picked up orders after 30 seconds
- Full-screen mode (F11) for kitchen display

**Realtime:** Supabase Realtime subscription on `orders` table. Instant updates across all connected dashboards.

#### 3.2.2 Order Search / History

**Path:** `/orders/search`

**Features:**
- Search by order number, customer name, email, or phone
- Filter by: store, status, date range, payment status
- Sortable columns: order number, date, total, status
- Click to expand full order detail inline
- Export to CSV

#### 3.2.3 Order Detail

**Path:** `/orders/:orderId`

**Content:**
- Order header: number, status, store, date/time
- Customer info: name, email, phone (linked to customer profile)
- Items list with modifiers and prices
- Price breakdown: subtotal, discount, tax, tip, total
- Payment info: method, Stripe ID, status
- Status timeline: each transition with timestamp and staff member who changed it
- Loyalty: points earned, points redeemed
- Actions: change status, issue refund (manager+), add internal note

---

### 3.3 Menu Management

**Path:** `/menu`
**Access:** Operations Manager, Store Manager (own store only)

#### 3.3.1 Menu Items

**Path:** `/menu/items`

```
┌─────────────────────────────────────────────────────┐
│  MENU ITEMS                     [+ Add Item]        │
│                                                     │
│  Filter: [All Categories ▼] [Active ▼] [Search...] │
│                                                     │
│  ┌─────┬──────────────────┬───────┬────────┬──────┐ │
│  │ IMG │ ITEM             │ PRICE │ STATUS │      │ │
│  ├─────┼──────────────────┼───────┼────────┼──────┤ │
│  │ 🍔  │ Classic Storm    │ $8.99 │ Active │ [⋮] │ │
│  │     │ Burgers          │       │ 2/2 ✓  │      │ │
│  ├─────┼──────────────────┼───────┼────────┼──────┤ │
│  │ 🍔  │ Bacon BBQ        │$10.99 │ Active │ [⋮] │ │
│  │     │ Burgers          │       │ 2/2 ✓  │      │ │
│  ├─────┼──────────────────┼───────┼────────┼──────┤ │
│  │ 🍗  │ Chicken Strips   │ $7.99 │ Sold   │ [⋮] │ │
│  │     │ Chicken          │       │ Out!   │      │ │
│  └─────┴──────────────────┴───────┴────────┴──────┘ │
│                                                     │
│  "2/2 ✓" = available at 2 of 2 stores              │
│  "Sold Out!" = toggled unavailable at selected store│
└─────────────────────────────────────────────────────┘
```

**Features:**
- Table view with inline editing for price
- Availability indicator: "2/2" means available at all stores, "1/2" means missing at one
- Quick actions (⋮ menu): Edit, Duplicate, Toggle Active, View at Store
- Bulk actions: select multiple → toggle active/inactive
- Category filter, active/inactive filter, text search
- Drag to reorder within category

#### 3.3.2 Quick Availability Toggle (Sold Out)

**Path:** `/menu/availability`

This is the **most time-critical page** — a store manager needs to mark an item as sold out in under 3 seconds.

```
┌─────────────────────────────────────────────────────┐
│  ITEM AVAILABILITY          Store: [Inglewood ▼]    │
│                                                     │
│  ┌──────────────────────────┬────────────┐          │
│  │ Classic StormBurger      │  [● ON ]   │          │
│  │ Double Classic           │  [● ON ]   │          │
│  │ Bacon BBQ Burger         │  [○ OFF]   │ ← sold  │
│  │ Jalapeño Lightning       │  [● ON ]   │    out   │
│  │ Chicken Sandwich         │  [● ON ]   │          │
│  │ Spicy Chicken            │  [● ON ]   │          │
│  │ Chicken Strips           │  [○ OFF]   │          │
│  │ Storm Fries              │  [● ON ]   │          │
│  │ Onion Rings              │  [● ON ]   │          │
│  │ Fountain Drink           │  [● ON ]   │          │
│  └──────────────────────────┴────────────┘          │
│                                                     │
│  [Mark All Available]  [Mark All Sold Out]           │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Single toggle per item. No confirmation dialog. Instant effect.
- Toggle sends `PATCH /api/admin/menu/items/:id/stores/:storeId` with `{ is_available: false }`
- Menu cache for that store is invalidated immediately
- Optimistic UI — toggle flips instantly, reverts on API error
- "Mark All Available" for end-of-night reset
- Audit log records who toggled what and when

#### 3.3.3 Item Editor

**Path:** `/menu/items/:itemId`

**Form:**
- Name, slug, description, category
- Base price (with per-store override table)
- Image upload (drag-and-drop to Supabase Storage)
- Calories, prep time
- Tags (multi-select: popular, new, spicy, etc.)
- Featured toggle
- Modifier groups (link/unlink, reorder)
- Store availability table (all stores with toggle + price override per store)

#### 3.3.4 Modifier Management

**Path:** `/menu/modifiers`

- List all modifier groups
- Expand to see modifiers in each group
- Add/edit/remove modifiers
- Adjust prices
- Reorder modifiers within groups
- Link groups to menu items

---

### 3.4 Store Management

**Path:** `/stores`
**Access:** Operations Manager (all stores), Store Manager (own store)

#### 3.4.1 Store List

**Path:** `/stores`

Table of all stores with: name, address, status (open/closed), accepting orders (yes/no), today's order count, today's revenue.

#### 3.4.2 Store Detail / Settings

**Path:** `/stores/:storeId`

**Sections:**

**General:**
- Name, address, phone, email
- Coordinates (map preview)
- Image upload
- Tax rate
- Estimated prep time (minutes)
- Max orders per 15-minute window

**Operating Hours:**
```
┌──────────┬───────────┬───────────┬─────────┐
│ Day      │ Open      │ Close     │ Closed? │
├──────────┼───────────┼───────────┼─────────┤
│ Sunday   │ 11:00 AM  │ 9:00 PM   │ □       │
│ Monday   │ 10:30 AM  │ 10:00 PM  │ □       │
│ Tuesday  │ 10:30 AM  │ 10:00 PM  │ □       │
│ ...      │ ...       │ ...       │ ...     │
└──────────┴───────────┴───────────┴─────────┘
[Save Hours]
```

**Order Control:**
```
┌─────────────────────────────────────────────┐
│  ONLINE ORDERING                            │
│                                             │
│  Status: ● ACCEPTING ORDERS                │
│                                             │
│  [⏸ Pause Ordering]                        │
│                                             │
│  Pause reason (shown to customers):         │
│  [Kitchen equipment issue        ]          │
│                                             │
│  Auto-resume after: [30 minutes ▼]         │
│  ○ Manual resume only                       │
└─────────────────────────────────────────────┘
```

**Pause ordering** immediately stops the store from accepting new app orders. Existing orders in progress are not affected. The pause reason is shown to customers who try to order: "StormBurger Inglewood is temporarily not accepting orders. Reason: Kitchen equipment issue."

Auto-resume timer options: 15 min, 30 min, 1 hour, 2 hours, or manual only.

---

### 3.5 Promotion Management

**Path:** `/promos`
**Access:** Operations Manager, Marketing Admin

#### 3.5.1 Promotion List

Table with: code, name, type, value, stores, dates, usage (current/max), status, actions.

Tabs: Active | Scheduled | Expired | All

#### 3.5.2 Create / Edit Promotion

**Path:** `/promos/new` or `/promos/:promoId`

**Form sections:**

**Basic Info:**
- Code (auto-generated or custom)
- Display name
- Description (customer-facing)

**Discount:**
- Type: Percentage Off | Fixed Amount Off | Free Item | BOGO
- Value: percentage or cents
- Max discount cap (for percentage — e.g., max $10 off)

**Targeting:**
- Scope: Entire Order | Specific Category | Specific Item
- Store: All Stores | Select stores (multi-select)
- Category or item selector (when scope is category/item)

**Limits:**
- Max total uses
- Max uses per customer
- Minimum order amount

**Schedule:**
- Start date/time
- End date/time (or "No expiration")

**Advanced Rules:**
- Days of week (checkboxes: Mon–Sun)
- Time range (e.g., 11 AM – 2 PM for lunch promos)
- First order only (toggle)
- Minimum items in cart

**Preview:**
```
┌─────────────────────────────────────────────┐
│  PROMO PREVIEW                              │
│                                             │
│  Code: STORM20                              │
│  "20% off orders over $15"                  │
│  Valid: Apr 7 – Apr 14, 2026                │
│  Stores: All                                │
│  Max uses: 500 total / 1 per customer       │
│  Current uses: 0                            │
│                                             │
│  [Save as Draft]  [Activate Now]            │
└─────────────────────────────────────────────┘
```

---

### 3.6 Loyalty Campaign Management

**Path:** `/loyalty`
**Access:** Operations Manager, Marketing Admin

#### 3.6.1 Loyalty Program Config

**Path:** `/loyalty/config`

**Settings:**
- Points per dollar spent (default: 1)
- Points value: how many points = $1 discount (default: 100 points = $1)
- Tier thresholds:
  - Bronze: 0 points
  - Silver: 500 lifetime points
  - Gold: 1,000 lifetime points
  - Platinum: 2,500 lifetime points
- Tier benefits (per tier): earn multiplier, free birthday item, priority pickup, exclusive items
- Points expiration: X months after last activity (or never)

#### 3.6.2 Reward Items

**Path:** `/loyalty/rewards`

List of redeemable rewards:
- Name, points cost, type (discount or free item), linked menu item (if free item), active toggle
- Add/edit/remove rewards

#### 3.6.3 Loyalty Analytics

**Path:** `/loyalty/analytics`

- Total enrolled members
- Active members (ordered in last 30 days)
- Points issued this month vs redeemed
- Tier distribution (pie chart)
- Top redeemers
- Points liability (outstanding unredeemed points × dollar value)

---

### 3.7 Customer Support Tools

**Path:** `/customers`
**Access:** All roles (read). Refunds: Support Staff+. Edit: Operations Manager.

#### 3.7.1 Customer Search

**Path:** `/customers/search`

Search by name, email, phone, or order number. Results show: name, email, phone, total orders, total spent, loyalty tier, member since.

#### 3.7.2 Customer Profile

**Path:** `/customers/:userId`

```
┌─────────────────────────────────────────────────────┐
│  CUSTOMER: John Smith                               │
│  john@example.com | (310) 555-1234                  │
│  Member since: Jan 2026 | Silver tier               │
│                                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐           │
│  │Orders│  │Spent │  │Points│  │Tier  │           │
│  │  24  │  │ $589 │  │ 340  │  │Silver│           │
│  └──────┘  └──────┘  └──────┘  └──────┘           │
│                                                     │
│  Tabs: [Orders] [Loyalty] [Activity] [Notes]        │
│                                                     │
│  RECENT ORDERS                                      │
│  SB-042 | Apr 6 | $26.44 | Picked Up               │
│  SB-035 | Apr 4 | $18.99 | Picked Up               │
│  SB-028 | Apr 2 | $31.22 | Refunded                │
│                                                     │
│  Actions: [Adjust Points] [Issue Credit] [Add Note] │
└─────────────────────────────────────────────────────┘
```

**Actions:**
- View full order history
- View loyalty transaction history
- Adjust loyalty points (with reason — logged)
- Issue store credit (future)
- Add internal note (visible only to staff)
- Trigger password reset email

---

### 3.8 Catering / Event Inquiry Management

**Path:** `/catering`
**Access:** Operations Manager, Store Manager, Support Staff

```
┌─────────────────────────────────────────────────────┐
│  CATERING INQUIRIES                                 │
│                                                     │
│  Tabs: [New (3)] [In Progress (2)] [All]            │
│                                                     │
│  ┌──────┬──────────┬──────┬────────┬──────┬──────┐ │
│  │ Date │ Contact  │ Type │ Guests │Status│      │ │
│  ├──────┼──────────┼──────┼────────┼──────┼──────┤ │
│  │May 15│ Sarah J. │ Corp │   50   │ New  │[View]│ │
│  │May 22│ Mike R.  │Privt │  100   │Cntct │[View]│ │
│  │Jun  1│ Lisa T.  │ Wed  │  200   │Quotd │[View]│ │
│  └──────┴──────────┴──────┴────────┴──────┴──────┘ │
└─────────────────────────────────────────────────────┘
```

**Inquiry Detail:**
- All submitted info (contact, event details, dietary needs)
- Status workflow: Submitted → Contacted → Quoted → Confirmed → Completed
- Quoted amount field (manager enters after discussion)
- Assigned to (dropdown of staff members)
- Internal notes
- Activity log (who changed status when)
- "Reply by Email" button (opens email client with pre-filled template)

---

### 3.9 Analytics Dashboard

**Path:** `/analytics`
**Access:** Operations Manager, Marketing Admin, Store Manager (own store)

#### 3.9.1 Sales Analytics

**Path:** `/analytics/sales`

**Date range selector** at top: Today, Yesterday, This Week, This Month, Custom Range.

**Charts:**
- Revenue over time (line chart, per day or per hour for "Today")
- Orders over time (bar chart)
- Revenue by store (horizontal bar chart, side-by-side comparison)
- Revenue by category (pie chart)
- Revenue by payment method (pie chart)

**Tables:**
- Top 10 items by revenue
- Top 10 items by quantity sold
- Average order value by store
- Orders by hour of day (heatmap)

**Export:** CSV download for any table or chart data.

#### 3.9.2 Customer Analytics

**Path:** `/analytics/customers`

- New registrations over time
- Active users (ordered in last 30 days)
- Repeat rate (% of customers who ordered more than once)
- Average orders per customer
- Customer lifetime value distribution
- Top 10 customers by spend

#### 3.9.3 Operational Analytics

**Path:** `/analytics/ops`

- Average fulfillment time (order placed → picked up) by store
- Average time per status (pending → confirmed, confirmed → preparing, etc.)
- Order rejection rate
- Items sold-out frequency (how often each item is toggled off)
- Peak hours analysis (orders per hour, per day of week)
- Order volume vs capacity utilization

#### 3.9.4 Promotion Analytics

**Path:** `/analytics/promos`

- Active promos and their usage
- Revenue with promo vs without promo
- Average discount amount
- Promo-driven order volume
- Most popular promo codes
- Customer acquisition from promos (first orders using a promo)

---

### 3.10 Audit Log Viewer

**Path:** `/audit`
**Access:** Operations Manager only

```
┌─────────────────────────────────────────────────────────────────┐
│  AUDIT LOG                                                      │
│                                                                 │
│  Filter: [All Actions ▼] [All Users ▼] [Date Range] [Search]   │
│                                                                 │
│  ┌────────────┬──────────┬──────────┬──────────────────────────┐│
│  │ Timestamp  │ User     │ Action   │ Detail                   ││
│  ├────────────┼──────────┼──────────┼──────────────────────────┤│
│  │ 8:42 PM    │ Maria S. │ refund   │ Order SB-042: $26.44     ││
│  │            │          │          │ Reason: wrong order       ││
│  ├────────────┼──────────┼──────────┼──────────────────────────┤│
│  │ 8:30 PM    │ James K. │ menu_chg │ Bacon BBQ: $10.99→$11.49 ││
│  ├────────────┼──────────┼──────────┼──────────────────────────┤│
│  │ 7:15 PM    │ System   │ status   │ SB-041: ready→picked_up  ││
│  ├────────────┼──────────┼──────────┼──────────────────────────┤│
│  │ 6:00 PM    │ Admin    │ promo    │ Created STORM20 (20% off) ││
│  └────────────┴──────────┴──────────┴──────────────────────────┘│
│                                                                 │
│  Showing 1-50 of 2,341 entries           [← Prev] [Next →]     │
└─────────────────────────────────────────────────────────────────┘
```

**Filters:**
- Action type: login, logout, refund, status_change, menu_change, price_change, promo_apply, loyalty_redeem
- User (dropdown of all admin users)
- Entity type: order, menu_item, store, payment, promotion
- Date range
- Free text search in detail column

**Detail expansion:** Click a row to see full JSON diff of changes, IP address, user agent.

---

### 3.11 Settings

**Path:** `/settings`
**Access:** Operations Manager

**Sections:**
- **Staff Management:** List all admin users, create new, assign role + store, deactivate
- **General:** Company name, support email, timezone defaults
- **Notifications:** Configure email recipients for catering inquiries, daily sales summaries, error alerts
- **Integrations:** Stripe dashboard link, Supabase dashboard link, Toast POS config (V2)
- **Feature Flags:** Toggle upcoming features (Storm Mode, scheduled orders, delivery)

---

## 4. Role-Based Access Matrix

| Page / Action | Ops Manager | Store Manager | Support Staff | Marketing Admin |
|---|---|---|---|---|
| **Dashboard** | All stores | Own store | All stores (read) | All stores (read) |
| **Live Orders** | All stores | Own store | All stores (read) | — |
| **Order Search** | ✓ | Own store | ✓ | — |
| **Update Order Status** | ✓ | Own store | — | — |
| **Issue Refund** | ✓ | Own store | ✓ (with reason) | — |
| **Menu Items (view)** | ✓ | Own store | ✓ | ✓ |
| **Menu Items (edit)** | ✓ | — | — | — |
| **Menu Items (create/delete)** | ✓ | — | — | — |
| **Item Availability Toggle** | ✓ | Own store | — | — |
| **Store Settings (view)** | ✓ | Own store | — | — |
| **Store Settings (edit)** | ✓ | Own store (limited) | — | — |
| **Pause Ordering** | ✓ | Own store | — | — |
| **Store Hours** | ✓ | Own store | — | — |
| **Promotions (view)** | ✓ | Own store | — | ✓ |
| **Promotions (create/edit)** | ✓ | — | — | ✓ |
| **Loyalty Config** | ✓ | — | — | ✓ |
| **Customer Search** | ✓ | Own store | ✓ | — |
| **Customer Profile** | ✓ | Own store | ✓ | — |
| **Adjust Loyalty Points** | ✓ | — | — | — |
| **Catering Inquiries** | ✓ | Own store | ✓ | — |
| **Analytics (sales)** | ✓ | Own store | — | ✓ |
| **Analytics (customers)** | ✓ | — | — | ✓ |
| **Analytics (ops)** | ✓ | Own store | — | — |
| **Analytics (promos)** | ✓ | — | — | ✓ |
| **Audit Log** | ✓ | — | — | — |
| **Settings** | ✓ | — | — | — |
| **Staff Management** | ✓ | — | — | — |

---

## 5. Data Model Implications

### 5.1 New Role: Marketing

The existing `user_role` enum needs a new value:

```sql
ALTER TYPE user_role ADD VALUE 'marketing';
```

### 5.2 Admin Users Enhancement

The `admin_users` table needs additional fields:

```sql
ALTER TABLE admin_users
    ADD COLUMN role_label TEXT,           -- 'operations_manager', 'store_manager', 'support_staff', 'marketing_admin'
    ADD COLUMN can_refund BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN can_edit_menu BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN can_manage_promos BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN can_manage_loyalty BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN can_manage_staff BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN can_view_analytics BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN can_view_audit BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN can_pause_ordering BOOLEAN NOT NULL DEFAULT FALSE;
```

The `permissions` JSONB column already exists for granular permissions, but explicit boolean columns are faster for RLS policies and don't require JSON parsing.

### 5.3 Store Pause Feature

```sql
ALTER TABLE stores
    ADD COLUMN paused_at TIMESTAMPTZ,
    ADD COLUMN paused_by UUID REFERENCES users(id),
    ADD COLUMN pause_reason TEXT,
    ADD COLUMN auto_resume_at TIMESTAMPTZ;
```

The `is_accepting_orders` field already exists. These fields add context for the pause.

### 5.4 Order Internal Notes

```sql
CREATE TABLE order_notes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id),
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_notes_order ON order_notes(order_id);
```

### 5.5 Customer Notes

```sql
CREATE TABLE customer_notes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES users(id),
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_notes_customer ON customer_notes(customer_id);
```

---

## 6. Frontend Structure

```
apps/admin/
├── src/
│   ├── App.tsx                          # Router + layout + auth guard
│   ├── main.tsx                         # Entry point
│   │
│   ├── layouts/
│   │   ├── DashboardLayout.tsx          # Sidebar + header + store selector
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── StoreSelector.tsx
│   │
│   ├── pages/
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── orders/
│   │   │   ├── LiveOrdersPage.tsx
│   │   │   ├── OrderSearchPage.tsx
│   │   │   └── OrderDetailPage.tsx
│   │   ├── menu/
│   │   │   ├── MenuItemsPage.tsx
│   │   │   ├── AvailabilityPage.tsx
│   │   │   ├── ItemEditorPage.tsx
│   │   │   └── ModifiersPage.tsx
│   │   ├── stores/
│   │   │   ├── StoreListPage.tsx
│   │   │   └── StoreSettingsPage.tsx
│   │   ├── promos/
│   │   │   ├── PromoListPage.tsx
│   │   │   └── PromoEditorPage.tsx
│   │   ├── loyalty/
│   │   │   ├── LoyaltyConfigPage.tsx
│   │   │   ├── RewardsPage.tsx
│   │   │   └── LoyaltyAnalyticsPage.tsx
│   │   ├── customers/
│   │   │   ├── CustomerSearchPage.tsx
│   │   │   └── CustomerProfilePage.tsx
│   │   ├── catering/
│   │   │   ├── InquiryListPage.tsx
│   │   │   └── InquiryDetailPage.tsx
│   │   ├── analytics/
│   │   │   ├── SalesAnalyticsPage.tsx
│   │   │   ├── CustomerAnalyticsPage.tsx
│   │   │   ├── OpsAnalyticsPage.tsx
│   │   │   └── PromoAnalyticsPage.tsx
│   │   ├── audit/
│   │   │   └── AuditLogPage.tsx
│   │   ├── settings/
│   │   │   ├── SettingsPage.tsx
│   │   │   └── StaffManagementPage.tsx
│   │   └── auth/
│   │       └── AdminLoginPage.tsx
│   │
│   ├── components/
│   │   ├── ui/                          # Shared UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── DatePicker.tsx
│   │   │   ├── Toggle.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── Chart.tsx               # Wrapper for chart library
│   │   ├── orders/
│   │   │   ├── OrderCard.tsx
│   │   │   ├── OrderTimeline.tsx
│   │   │   └── RefundModal.tsx
│   │   ├── menu/
│   │   │   ├── AvailabilityToggle.tsx
│   │   │   ├── PriceEditor.tsx
│   │   │   └── ImageUploader.tsx
│   │   └── analytics/
│   │       ├── StatsCard.tsx
│   │       ├── RevenueChart.tsx
│   │       └── TopItemsTable.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useOrders.ts                 # Realtime order subscription
│   │   ├── useStore.ts                  # Selected store context
│   │   ├── usePermissions.ts            # Role-based feature gating
│   │   └── useApi.ts                    # Admin API client
│   │
│   ├── services/
│   │   ├── supabase.ts
│   │   └── api.ts                       # HTTP client for NestJS admin endpoints
│   │
│   ├── guards/
│   │   ├── AuthGuard.tsx                # Redirect to login if not authenticated
│   │   └── RoleGuard.tsx                # Hide/block based on role
│   │
│   └── styles/
│       ├── global.css
│       └── variables.css                # Design tokens
│
├── public/
│   ├── favicon.ico
│   └── sounds/
│       └── new-order.mp3               # Kitchen alert sound
│
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 7. Backend Structure (Admin-Specific)

The NestJS backend needs these additional admin modules:

```
server/src/modules/
│
├── admin/
│   ├── admin.module.ts
│   ├── admin.guard.ts                   # Validates admin role + store scope
│   │
│   ├── orders/
│   │   ├── admin-orders.controller.ts   # GET /admin/orders, PATCH status, POST refund
│   │   └── admin-orders.service.ts
│   │
│   ├── menu/
│   │   ├── admin-menu.controller.ts     # CRUD menu items, availability toggle
│   │   └── admin-menu.service.ts
│   │
│   ├── stores/
│   │   ├── admin-stores.controller.ts   # Store settings, hours, pause/resume
│   │   └── admin-stores.service.ts
│   │
│   ├── promos/
│   │   ├── admin-promos.controller.ts   # CRUD promotions
│   │   └── admin-promos.service.ts
│   │
│   ├── loyalty/
│   │   ├── admin-loyalty.controller.ts  # Config, rewards, point adjustments
│   │   └── admin-loyalty.service.ts
│   │
│   ├── customers/
│   │   ├── admin-customers.controller.ts # Search, profile, notes
│   │   └── admin-customers.service.ts
│   │
│   ├── catering/
│   │   ├── admin-catering.controller.ts # Inquiry management
│   │   └── admin-catering.service.ts
│   │
│   ├── analytics/
│   │   ├── admin-analytics.controller.ts # Sales, customers, ops, promos
│   │   └── admin-analytics.service.ts
│   │
│   ├── audit/
│   │   ├── admin-audit.controller.ts    # Audit log viewer
│   │   └── admin-audit.service.ts
│   │
│   └── staff/
│       ├── admin-staff.controller.ts    # Staff account management
│       └── admin-staff.service.ts
```

**Admin Guard Logic:**

```typescript
// admin.guard.ts

@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // set by auth middleware

    // Must have a role above 'customer'
    if (user.role === 'customer') return false;

    // Check store scope
    const requestedStoreId = request.params.storeId || request.query.store_id;
    if (requestedStoreId && user.admin?.store_id) {
      // Store-scoped admin can only access their store
      if (user.admin.store_id !== requestedStoreId) return false;
    }

    return true;
  }
}
```

Each controller method additionally checks specific permissions:

```typescript
@UseGuards(AdminGuard)
@Roles('manager', 'admin')            // role check
@RequirePermission('can_edit_menu')    // granular permission check
@Patch('items/:itemId')
updateMenuItem(...) { ... }
```

---

*This admin dashboard design covers every operational need for StormBurger from day one through multi-location scale. The role-based access matrix ensures each user type sees exactly what they need — nothing more, nothing less. The sold-out toggle is purpose-built for speed. The live orders view is purpose-built for kitchen display. The analytics pages are purpose-built for business decisions.*
