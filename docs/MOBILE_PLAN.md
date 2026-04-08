# StormBurger — React Native Implementation Plan

**Version:** 1.0
**Date:** April 6, 2026
**Platform:** iOS 16+ / Android 12+
**Framework:** React Native 0.84 + TypeScript

---

## 1. App Folder Structure

```
apps/mobile/
├── App.tsx                              # Root: providers, navigation container
├── app.config.ts                        # Environment config
├── index.js                             # Entry point
│
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx            # Auth check → Onboarding | Auth | Main
│   │   ├── AuthStack.tsx                # Login, Signup, Guest
│   │   ├── OnboardingStack.tsx          # Onboarding slides
│   │   ├── MainTabs.tsx                 # Bottom tabs: Home, Orders, Rewards, Profile
│   │   ├── HomeStack.tsx                # Home → Location → Menu → Item → Cart → Checkout → Status
│   │   ├── OrdersStack.tsx              # Order history → Order detail
│   │   ├── RewardsStack.tsx             # Rewards dashboard → Redeem
│   │   └── ProfileStack.tsx             # Profile → Settings, Favorites, Catering
│   │
│   ├── screens/
│   │   ├── splash/
│   │   │   └── SplashScreen.tsx
│   │   ├── onboarding/
│   │   │   └── OnboardingScreen.tsx
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── SignupScreen.tsx
│   │   │   └── GuestScreen.tsx
│   │   ├── home/
│   │   │   ├── HomeScreen.tsx
│   │   │   └── LocationSelectScreen.tsx
│   │   ├── menu/
│   │   │   ├── MenuScreen.tsx
│   │   │   └── ItemDetailScreen.tsx
│   │   ├── cart/
│   │   │   └── CartScreen.tsx
│   │   ├── checkout/
│   │   │   ├── CheckoutScreen.tsx
│   │   │   └── CheckoutSuccessScreen.tsx
│   │   ├── orders/
│   │   │   ├── OrderStatusScreen.tsx
│   │   │   ├── OrderHistoryScreen.tsx
│   │   │   └── OrderDetailScreen.tsx
│   │   ├── rewards/
│   │   │   ├── RewardsScreen.tsx
│   │   │   └── RedeemScreen.tsx
│   │   ├── favorites/
│   │   │   └── FavoritesScreen.tsx
│   │   ├── profile/
│   │   │   ├── ProfileScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   └── catering/
│   │       └── CateringScreen.tsx
│   │
│   ├── components/
│   │   ├── ui/                          # Design system primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Divider.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── IconButton.tsx
│   │   │   └── BottomSheet.tsx
│   │   ├── layout/                      # Structural components
│   │   │   ├── Screen.tsx               # SafeArea + scroll + background
│   │   │   ├── Header.tsx
│   │   │   └── TabBar.tsx
│   │   ├── menu/                        # Menu-specific components
│   │   │   ├── MenuItemCard.tsx
│   │   │   ├── CategoryHeader.tsx
│   │   │   ├── ModifierGroup.tsx
│   │   │   ├── ModifierOption.tsx
│   │   │   ├── QuantitySelector.tsx
│   │   │   └── PriceTag.tsx
│   │   ├── cart/                        # Cart-specific components
│   │   │   ├── CartItemRow.tsx
│   │   │   ├── CartSummary.tsx
│   │   │   ├── CartBadge.tsx
│   │   │   └── PromoCodeInput.tsx
│   │   ├── order/                       # Order-specific components
│   │   │   ├── OrderCard.tsx
│   │   │   ├── OrderStatusTracker.tsx
│   │   │   ├── OrderTimeline.tsx
│   │   │   └── ReorderButton.tsx
│   │   ├── rewards/                     # Loyalty-specific components
│   │   │   ├── PointsBalance.tsx
│   │   │   ├── TierBadge.tsx
│   │   │   ├── TierProgress.tsx
│   │   │   └── RewardCard.tsx
│   │   └── store/                       # Store-specific components
│   │       ├── StoreCard.tsx
│   │       ├── StoreStatusBadge.tsx
│   │       └── StoreHours.tsx
│   │
│   ├── stores/                          # Zustand state management
│   │   ├── authStore.ts
│   │   ├── cartStore.ts
│   │   ├── locationStore.ts
│   │   ├── orderStore.ts
│   │   ├── loyaltyStore.ts
│   │   └── appStore.ts                  # Global app state (onboarding, theme)
│   │
│   ├── services/
│   │   ├── api.ts                       # HTTP client for NestJS backend
│   │   ├── supabase.ts                  # Supabase client (auth + realtime)
│   │   ├── notifications.ts             # Push notification setup + handlers
│   │   ├── analytics.ts                 # Event tracking
│   │   └── cache.ts                     # AsyncStorage cache layer
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                   # Auth state + actions
│   │   ├── useCart.ts                    # Cart state + computed values
│   │   ├── useMenu.ts                   # Menu data + caching
│   │   ├── useOrders.ts                 # Order history + active order
│   │   ├── useRealtimeOrder.ts          # Supabase realtime subscription
│   │   ├── useLoyalty.ts                # Points, tier, rewards
│   │   ├── useLocation.ts              # GPS + store selection
│   │   ├── useStormMode.ts              # One-tap reorder
│   │   └── useDebounce.ts              # Utility
│   │
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   ├── shadows.ts
│   │   ├── animations.ts               # Shared animation configs
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── format.ts                    # Price, date, status formatting
│   │   ├── validation.ts               # Form validation helpers
│   │   ├── haptics.ts                   # Haptic feedback wrapper
│   │   └── constants.ts                 # App-wide constants
│   │
│   └── types/
│       ├── navigation.ts                # Navigation param types
│       ├── api.ts                       # API response types
│       └── store.ts                     # Store state types
│
├── assets/
│   ├── images/
│   │   ├── logo.png
│   │   ├── logo-dark.png
│   │   ├── onboarding-1.png
│   │   ├── onboarding-2.png
│   │   ├── onboarding-3.png
│   │   ├── empty-cart.png
│   │   ├── empty-orders.png
│   │   └── storm-mode-icon.png
│   ├── fonts/
│   │   ├── Poppins-Regular.ttf
│   │   ├── Poppins-Medium.ttf
│   │   ├── Poppins-SemiBold.ttf
│   │   └── Poppins-Bold.ttf
│   └── animations/
│       ├── confetti.json                # Lottie: reward earned
│       ├── order-confirmed.json         # Lottie: order placed
│       └── storm-lightning.json         # Lottie: storm mode activated
│
├── ios/
├── android/
├── package.json
└── tsconfig.json
```

---

## 2. Navigation Structure

```
RootNavigator
│
├── SplashScreen (initial, auto-dismiss after auth check)
│
├── [NOT_ONBOARDED] OnboardingStack
│   └── OnboardingScreen (3 slides → "Get Started")
│
├── [NOT_AUTHENTICATED] AuthStack
│   ├── LoginScreen
│   ├── SignupScreen
│   └── GuestScreen (browse-only, upgrade prompt at checkout)
│
└── [AUTHENTICATED] MainTabs
    │
    ├── Tab: Home (HomeStack)
    │   ├── HomeScreen
    │   │   ├── Active order banner (tap → OrderStatus)
    │   │   ├── Storm Mode button (one-tap reorder)
    │   │   ├── "Order Again" carousel
    │   │   ├── Featured items
    │   │   └── Store selector
    │   │
    │   ├── LocationSelectScreen
    │   ├── MenuScreen (categories + items)
    │   ├── ItemDetailScreen (modifiers, quantity, add to cart)
    │   ├── CartScreen
    │   ├── CheckoutScreen
    │   ├── CheckoutSuccessScreen → push to OrderStatusScreen
    │   └── OrderStatusScreen (realtime)
    │
    ├── Tab: Orders (OrdersStack)
    │   ├── OrderHistoryScreen
    │   └── OrderDetailScreen
    │
    ├── Tab: Rewards (RewardsStack)
    │   ├── RewardsScreen (points, tier, progress)
    │   └── RedeemScreen
    │
    └── Tab: Profile (ProfileStack)
        ├── ProfileScreen
        │   ├── → FavoritesScreen
        │   ├── → CateringScreen
        │   ├── → SettingsScreen
        │   └── → OrderHistoryScreen
        ├── FavoritesScreen
        ├── CateringScreen
        └── SettingsScreen
```

**Navigation rules:**
- Deep links from push notifications go directly to OrderStatusScreen with the order ID.
- The cart badge on the Home tab shows the item count. Tapping the tab always returns to the last screen in the stack (not reset).
- If the user has an active order, a persistent banner appears at the top of HomeScreen. Tapping it navigates to OrderStatusScreen.
- Guest users can browse the full menu but are prompted to sign up at checkout.

---

## 3. Screen Specifications

### 3.1 SplashScreen
**Duration:** 1.5 seconds or until auth check completes (whichever is longer).
**Content:** StormBurger logo (navy + red) centered on white background. Subtle lightning animation.
**Logic:** Check AsyncStorage for session. If valid JWT → MainTabs. If expired → try refresh. If no session → check onboarding flag → OnboardingStack or AuthStack.

### 3.2 OnboardingScreen
**Slides:**
1. "Order Ahead, Skip the Line" — burger photo, tagline
2. "Earn Rewards Every Time" — loyalty points illustration
3. "Track Your Order Live" — order status timeline

**Components:** Horizontal pager with dot indicators. "Skip" in top right. "Get Started" button on last slide. Sets `hasOnboarded = true` in AsyncStorage.

### 3.3 LoginScreen
**Fields:** Email, Password. "Forgot Password?" link. "Sign Up" link. "Continue as Guest" link.
**Actions:** Sign in via Supabase Auth. On success → MainTabs. On error → inline error message with shake animation.
**UX:** Auto-focus email field. Keyboard-avoiding view. Biometric login option if previously authenticated.

### 3.4 SignupScreen
**Fields:** Full Name, Email, Password (with strength indicator), Phone (optional).
**Actions:** Create account via `/api/auth/signup`. Auto-enrolls in loyalty. On success → MainTabs.
**Validation:** Real-time email format check. Password ≥ 8 chars, must include a number.

### 3.5 GuestScreen
**Content:** "Browse our menu without an account." Button: "Browse as Guest."
**Logic:** Sets guest flag. Can view stores, menu, item details. Cannot add to cart or checkout. Upgrade prompts appear contextually.

### 3.6 HomeScreen
**Layout (top to bottom):**
1. **Header:** "Hey, {name}!" + location name + change button
2. **Active Order Banner:** If active order exists, show status with progress bar. Tappable.
3. **Storm Mode:** If the user has a last order, show the one-tap reorder button with lightning icon.
4. **Order Again:** Horizontal scroll of last 5 orders as cards (item thumbnails, total, "Reorder" button).
5. **Featured Items:** Horizontal scroll of items where `is_featured = true`.
6. **Categories:** Grid of category cards (Burgers, Chicken, Combos, etc.) linking to MenuScreen filtered.

**Data:** Preloaded on app launch. Refreshed on pull-to-refresh.

### 3.7 LocationSelectScreen
**Content:** List of stores sorted by distance (GPS permission requested). Each store shows name, address, distance, open/closed badge, today's hours.
**Actions:** Tapping a store selects it and navigates back. If store is closed, show hours info and disable selection.
**GPS:** Request location permission. If denied, show stores in default order (alphabetical). "Use My Location" button at top.

### 3.8 MenuScreen
**Layout:**
1. **Store info bar:** Selected store name, open/closed, estimated wait time
2. **Search bar:** Filters items by name (local filter, no API call)
3. **Category tabs:** Horizontal scroll of category pills. Tapping scrolls the list to that section. Active tab follows scroll position.
4. **Menu items:** SectionList grouped by category. Each item shows image (left), name, description (2 lines), price. Heart icon for favorites.

**Floating cart button:** Fixed at bottom. Shows item count and subtotal. Taps to CartScreen.

### 3.9 ItemDetailScreen
**Layout:**
1. **Hero image** (if available, else category-colored gradient)
2. **Name, description, base price, calories**
3. **Modifier groups** — each in a section with title, required badge, selection type hint
4. **Modifier options** — radio (single) or checkbox (multiple) with price adjustments
5. **Special instructions** — text input, collapsible
6. **Quantity selector** — minus / number / plus
7. **Add to Cart button** — fixed at bottom, shows calculated total

**Animations:** Smooth expand/collapse for modifier groups. Price counter animates when modifiers change. Haptic feedback on selection changes.

### 3.10 CartScreen
**Layout:**
1. **Store name** at top
2. **Cart items** — swipe to delete, tap to edit (returns to ItemDetailScreen with preloaded modifiers), quantity +/- inline
3. **Promo code input** — expandable section. "Apply" button. Shows discount when applied.
4. **Add More Items** button → navigates back to menu
5. **Price breakdown** — subtotal, discount (if promo), tax, total
6. **Checkout button** — fixed at bottom with total

**Empty state:** Cart illustration + "Your cart is empty" + "Browse Menu" button.

### 3.11 CheckoutScreen
**Layout:**
1. **Pickup location** — store name + address + "Change" link
2. **Order summary** — collapsed item list (expandable)
3. **Tip selector** — preset amounts ($1, $2, $3, Custom) or no tip
4. **Loyalty section** — points available, "Redeem" toggle, points to earn on this order
5. **Promo section** — applied promo or "Add promo code"
6. **Price breakdown** — subtotal, discount, loyalty discount, tax, tip, total
7. **Pay button** — "Pay $X.XX" → opens Stripe Payment Sheet

**Stripe Payment Sheet:** Apple Pay on top, card entry below. Handled by `@stripe/stripe-react-native`.

### 3.12 CheckoutSuccessScreen
**Content:** Confetti Lottie animation. Checkmark. "Order Placed!" Order number. Estimated pickup time. Points earned badge.
**Actions:** "Track Order" button → OrderStatusScreen. "Back to Menu" link.
**Auto-navigate:** After 5 seconds of inactivity, auto-navigate to OrderStatusScreen.

### 3.13 OrderStatusScreen
**Layout:**
1. **Order number** + store name
2. **Status tracker** — horizontal progress bar with 4 nodes: Received → Confirmed → Preparing → Ready
3. **Estimated pickup time** — large text, updates in realtime
4. **Order items** — expandable list
5. **Map** (optional) — store location with pin

**Realtime:** Subscribes to Supabase Realtime on `orders` table filtered by order ID. Updates status + timestamps as they change. Haptic + sound on status change.

**Push notifications:** If user backgrounds the app, push notifications continue. Tapping a notification deep-links back to this screen.

### 3.14 OrderHistoryScreen
**Layout:** FlatList of past orders sorted by date descending. Each card shows: order number, store name, date, item count, total, status badge, "Reorder" button.
**Pagination:** Infinite scroll, loads 20 at a time.
**Empty state:** Illustration + "No orders yet" + "Browse Menu" button.

### 3.15 OrderDetailScreen
**Layout:** Full order receipt — items with modifiers, pricing breakdown, payment method (card last 4), status timeline, loyalty points earned/redeemed. "Reorder" button at bottom.

### 3.16 FavoritesScreen
**Layout:** Grid of favorited menu items. Each card shows image, name, price, heart icon (filled). Tapping an item opens ItemDetailScreen. Long-press to remove.
**Empty state:** "No favorites yet" + "Browse Menu" button.

### 3.17 RewardsScreen
**Layout:**
1. **Points balance** — large number with tier badge
2. **Tier progress bar** — current tier → next tier with points needed
3. **Tier benefits** — list of perks for current tier
4. **Available rewards** — cards showing what can be redeemed (free fries, $1 off, etc.)
5. **Recent activity** — list of earn/redeem transactions

### 3.18 RedeemScreen
**Content:** Selected reward details. Confirmation: "Redeem 200 points for Free Storm Fries?" Yes/No. Confirmation animation on success.

### 3.19 ProfileScreen
**Layout:**
1. **Avatar + name + email**
2. **Quick stats** — total orders, total spent, member since
3. **Menu items:** Favorites, Order History, Catering & Events, Settings, Sign Out

### 3.20 SettingsScreen
**Sections:**
1. **Account** — edit name, email, phone, password
2. **Notifications** — toggle order updates, promos, loyalty updates
3. **Preferences** — default store, dark mode (future)
4. **About** — version, terms, privacy policy, licenses
5. **Delete Account** — confirmation flow, data deletion

### 3.21 CateringScreen
**Form fields:** Name, email, phone, event date (date picker), event time, event type (dropdown), guest count, location, dietary needs, additional notes.
**Submit:** Calls `/api/events`. Shows confirmation. Lists previous inquiries below the form.

---

## 4. Shared Component System

### 4.1 Design Primitives

Every screen is built from these primitives. No one-off styles.

| Component | Props | Usage |
|---|---|---|
| `Button` | `variant: 'primary' \| 'secondary' \| 'outline' \| 'ghost'`, `size: 'sm' \| 'md' \| 'lg'`, `loading`, `disabled`, `icon` | All tappable actions |
| `Card` | `variant: 'elevated' \| 'flat' \| 'outline'`, `onPress`, `padding` | Menu items, order cards, store cards |
| `Badge` | `variant: 'success' \| 'warning' \| 'error' \| 'info' \| 'neutral'`, `size` | Status indicators, counts |
| `Input` | `label`, `error`, `icon`, `type: 'text' \| 'email' \| 'password' \| 'phone'` | All form fields |
| `Modal` | `visible`, `onClose`, `title` | Confirmations, alerts |
| `Toast` | `type: 'success' \| 'error' \| 'info'`, `message`, `duration` | Feedback messages |
| `Skeleton` | `width`, `height`, `borderRadius` | Loading placeholders |
| `Divider` | `spacing`, `color` | Section separators |
| `BottomSheet` | `visible`, `snapPoints`, `onClose` | Filters, options |
| `Screen` | `scroll`, `padding`, `header` | Page wrapper with SafeArea |

### 4.2 Composite Components

| Component | Built From | Usage |
|---|---|---|
| `MenuItemCard` | Card + Image + PriceTag + IconButton (heart) | Menu listing |
| `CartItemRow` | Card + QuantitySelector + PriceTag | Cart items |
| `OrderCard` | Card + Badge + Button | Order history |
| `StoreCard` | Card + StoreStatusBadge | Location selector |
| `OrderStatusTracker` | Custom (4-node progress bar) | Order tracking |
| `TierProgress` | Custom (animated progress bar + badges) | Rewards |
| `ModifierGroup` | Section header + ModifierOption list | Item customization |
| `PromoCodeInput` | Input + Button + Badge | Cart promo |

### 4.3 Component Rules

1. All components accept a `testID` prop for E2E testing.
2. All touchable components have minimum 44×44pt hit area (Apple HIG).
3. All text components use the typography system — no inline fontSize.
4. All colors come from the theme — no hex codes in component files.
5. Loading states use Skeleton components, never spinners inline with content.
6. Error states show inline messages, never alert dialogs (except destructive actions).

---

## 5. State Management Plan

### 5.1 Zustand Stores

```
┌──────────────────────────────────────────────────┐
│                   App State                       │
│                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ authStore  │  │ appStore   │  │locationStore│ │
│  │            │  │            │  │            │ │
│  │ user       │  │ hasOnboard │  │ stores[]   │ │
│  │ session    │  │ theme      │  │ selected   │ │
│  │ isGuest    │  │ network    │  │ userLat    │ │
│  │ isLoading  │  │ status     │  │ userLng    │ │
│  └────────────┘  └────────────┘  └────────────┘ │
│                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ cartStore  │  │ orderStore │  │loyaltyStore│ │
│  │            │  │            │  │            │ │
│  │ items[]    │  │ active     │  │ points     │ │
│  │ storeId    │  │ history[]  │  │ tier       │ │
│  │ promoCode  │  │ isLoading  │  │ rewards[]  │ │
│  │ subtotal() │  │            │  │ txHistory  │ │
│  │ itemCount()│  │            │  │            │ │
│  └────────────┘  └────────────┘  └────────────┘ │
└──────────────────────────────────────────────────┘
```

### 5.2 Store Responsibilities

| Store | Persisted? | Sync Strategy |
|---|---|---|
| `authStore` | Yes (Supabase handles via AsyncStorage) | Supabase Auth listener auto-syncs |
| `appStore` | Yes (AsyncStorage: `hasOnboarded`, `theme`) | Local only |
| `locationStore` | Partially (selected store ID cached) | Fetch on app launch, refresh on pull |
| `cartStore` | Yes (AsyncStorage: full cart state) | Local. Server-side cart synced at checkout. |
| `orderStore` | No (fetched fresh) | Fetch on tab focus. Active order via realtime. |
| `loyaltyStore` | No (fetched fresh) | Fetch on app launch + after order completion |

### 5.3 Data Flow Rules

1. **Reads from API → Store → Component.** Components never call API directly. They read from Zustand stores, which are populated by hooks or service calls.
2. **Writes go through API first.** Cart changes are local-first (optimistic) but synced to server cart at checkout. Order creation, payment, and loyalty redemption always go through the NestJS API.
3. **Realtime updates go directly to store.** Supabase Realtime patches the `orderStore` when order status changes. Components re-render automatically.

---

## 6. API Integration Plan

### 6.1 API Client Architecture

```typescript
// services/api.ts

class ApiClient {
  private baseUrl: string;
  private token: string | null;

  // Automatic token attachment
  // Automatic 401 → refresh token → retry
  // Automatic error normalization
  // Request/response logging in __DEV__

  async get<T>(path: string, params?: Record<string, any>): Promise<T>;
  async post<T>(path: string, body?: any): Promise<T>;
  async patch<T>(path: string, body?: any): Promise<T>;
  async put<T>(path: string, body?: any): Promise<T>;
  async delete<T>(path: string): Promise<T>;
}
```

### 6.2 API Call Patterns by Screen

| Screen | API Calls | Timing |
|---|---|---|
| SplashScreen | `GET /auth/me` | On mount |
| HomeScreen | `GET /stores`, `GET /orders/active`, `GET /orders/mine?limit=5` | On mount + pull-to-refresh |
| LocationSelectScreen | `GET /stores?lat=X&lng=Y` | On mount |
| MenuScreen | `GET /stores/:id/menu` | On mount (cached) |
| ItemDetailScreen | `GET /stores/:id/menu/items/:id` | On mount (cached) |
| CartScreen | `GET /stores/:id/cart` (sync) | On focus |
| CheckoutScreen | `POST /stores/:id/checkout/preview` | On mount + on changes |
| CheckoutSuccessScreen | (data passed from checkout) | None |
| OrderStatusScreen | `GET /orders/:id` | On mount, then realtime |
| OrderHistoryScreen | `GET /orders/mine` | On mount, paginated |
| RewardsScreen | `GET /loyalty` | On mount |
| FavoritesScreen | `GET /favorites` | On mount |
| ProfileScreen | `GET /auth/me` | On mount (cached) |

### 6.3 Retry Strategy

```
Attempt 1: immediate
Attempt 2: 1 second delay
Attempt 3: 3 seconds delay
Attempt 4: give up → show error

401 errors: refresh token → retry once → if still 401, sign out
5xx errors: retry up to 3 times
Network errors: retry up to 3 times with connectivity check
```

---

## 7. Offline / Cache Strategy

### 7.1 What Gets Cached

| Data | Storage | TTL | Invalidation |
|---|---|---|---|
| Store list | AsyncStorage | 1 hour | Pull-to-refresh, app foreground after 1h |
| Store hours | AsyncStorage | 1 hour | Same as store list |
| Menu per store | AsyncStorage | 30 minutes | Pull-to-refresh on menu screen, admin menu change (future: realtime) |
| Item detail + modifiers | AsyncStorage | 30 minutes | Same as menu |
| Cart | AsyncStorage | 24 hours | Checkout clears. Store switch clears. |
| User profile | AsyncStorage | Session | Sign out clears |
| Loyalty balance | Memory only | 5 minutes | After order completion |
| Order history | Memory only | No cache | Always fresh |
| Active order | Memory only | Realtime | Realtime subscription |

### 7.2 What Gets Prefetched

| Data | When | Why |
|---|---|---|
| Store list | App launch | HomeScreen needs it immediately |
| Menu for selected store | After store selection | MenuScreen appears next |
| User profile + loyalty | After auth | HomeScreen, RewardsTab need it |
| Last 5 orders | After auth | "Order Again" carousel on HomeScreen |

### 7.3 Offline Behavior

| Action | Offline Behavior |
|---|---|
| Browse stores | Show cached data with "Last updated X ago" note |
| Browse menu | Show cached menu. Items without cached data show skeleton. |
| Add to cart | Works fully (local state) |
| Checkout | Blocked. Show "No internet connection" message. |
| View order history | Show cached if available, else show error. |
| View active order | Show last known status with "Reconnecting..." indicator. |

### 7.4 Cache Implementation

```typescript
// services/cache.ts

class CacheService {
  async get<T>(key: string): Promise<{ data: T; stale: boolean } | null>;
  async set<T>(key: string, data: T, ttlMs: number): Promise<void>;
  async invalidate(key: string): Promise<void>;
  async invalidatePrefix(prefix: string): Promise<void>; // e.g., "menu:" clears all menus
}

// Usage pattern: stale-while-revalidate
const menu = await cache.get(`menu:${storeId}`);
if (menu && !menu.stale) return menu.data;       // fresh cache
if (menu) setData(menu.data);                     // show stale, fetch in background
const fresh = await api.getMenu(storeId);
cache.set(`menu:${storeId}`, fresh, 30 * 60 * 1000);
setData(fresh);
```

---

## 8. Auth / Session Handling

### 8.1 Session Lifecycle

```
App Launch
    │
    ▼
Check AsyncStorage for Supabase session
    │
    ├── Session exists + JWT valid → set token → MainTabs
    │
    ├── Session exists + JWT expired → try refresh token
    │   ├── Refresh success → set new token → MainTabs
    │   └── Refresh failed → clear session → AuthStack
    │
    └── No session → check hasOnboarded
        ├── Not onboarded → OnboardingStack
        └── Onboarded → AuthStack
```

### 8.2 Token Management

- Supabase SDK handles token storage in AsyncStorage automatically.
- On every API call, the current access token is attached via the `ApiClient`.
- `supabase.auth.onAuthStateChange` listener updates the `authStore` and `ApiClient` token on every change.
- If any API call returns 401, the client attempts one token refresh before signing out.

### 8.3 Guest Mode

- Guest users can browse stores and menus.
- Adding to cart shows a bottom sheet: "Sign up to place orders and earn rewards!"
- Checkout is blocked — redirect to SignupScreen.
- Guest state is tracked via `authStore.isGuest = true`.
- Converting from guest to signed-up user preserves the in-memory cart.

---

## 9. Push Notification Handling

### 9.1 Setup

```
App Launch (authenticated)
    │
    ▼
Request notification permission (iOS: native prompt, Android: auto-granted)
    │
    ├── Granted → get FCM token → POST /api/notifications/token
    │
    └── Denied → skip. App works without notifications.
```

### 9.2 Notification Types

| Type | Title | Body | Action |
|---|---|---|---|
| `order_confirmed` | "Order Confirmed" | "Your order SB-042 has been accepted!" | Deep link → OrderStatusScreen |
| `order_preparing` | "Being Prepared" | "Your order SB-042 is being made!" | Deep link → OrderStatusScreen |
| `order_ready` | "Ready for Pickup!" | "Your order SB-042 is ready! Head to StormBurger Inglewood." | Deep link → OrderStatusScreen |
| `order_cancelled` | "Order Cancelled" | "Your order SB-042 has been cancelled. A refund is on its way." | Deep link → OrderDetailScreen |
| `promo` | "Special Offer!" | "Use code STORM20 for 20% off your next order!" | Deep link → HomeScreen |
| `loyalty_tier_up` | "Level Up!" | "You've reached Silver tier! Enjoy 1.5x points on every order." | Deep link → RewardsScreen |
| `loyalty_birthday` | "Happy Birthday!" | "Enjoy a free item on us! 🎂" | Deep link → RewardsScreen |

### 9.3 Foreground Handling

When a notification arrives while the app is open:
- Order status notifications → update `orderStore` silently, show in-app toast
- Promo notifications → show in-app banner with "View" button
- Do NOT show system notification if the user is already on OrderStatusScreen for that order

### 9.4 Deep Linking

```
stormburger://order/{orderId}      → OrderStatusScreen
stormburger://rewards              → RewardsScreen
stormburger://menu/{storeSlug}     → MenuScreen for that store
stormburger://promo/{code}         → HomeScreen with promo auto-applied
```

---

## 10. Realtime Order Status Updates

### 10.1 Subscription Architecture

```
OrderStatusScreen mounts
    │
    ▼
Subscribe to Supabase Realtime
    channel: `order:${orderId}`
    filter: `id=eq.${orderId}`
    event: UPDATE on `orders` table
    │
    ├── Status changed → update orderStore → re-render status tracker
    │                  → haptic feedback (medium impact)
    │                  → play status-specific sound
    │                  → animate status node
    │
    └── Screen unmounts → unsubscribe from channel
```

### 10.2 Fallback Polling

If the WebSocket connection drops:
1. Show "Reconnecting..." indicator
2. Attempt WebSocket reconnection: 1s, 5s, 15s, 30s intervals
3. After 60 seconds of failed WebSocket, fall back to HTTP polling every 10 seconds
4. When WebSocket reconnects, stop polling

### 10.3 Status Tracker UX

```
○ Received    ●── Confirmed    ○── Preparing    ○── Ready
                     ▲
              (current state)

Animated: pulse on current node, line fills between completed nodes
Colors: completed = green, current = navy (pulsing), upcoming = gray
```

Each status change triggers:
- Progress bar animation (300ms ease-out)
- Status text update with fade transition
- Estimated time update
- Haptic feedback
- Optional confetti on "Ready"

---

## 11. Reorder and Storm Mode

### 11.1 Standard Reorder

**Trigger:** "Reorder" button on OrderCard (order history) or OrderDetailScreen.

**Flow:**
1. User taps "Reorder"
2. Check if the original store is open and accepting orders
3. For each item in the original order:
   a. Check if the item is still available at the store
   b. Check if all selected modifiers are still available
   c. Get current prices (may differ from original order)
4. If everything is available → populate cart → navigate to CartScreen
5. If some items unavailable → show modal: "2 of 3 items are still available. Add available items?" → Yes adds what's available, No cancels
6. If prices changed → show notice on CartScreen: "Some prices have changed since your last order"

```typescript
// hooks/useReorder.ts

function useReorder() {
  const reorder = async (order: Order) => {
    const result = await api.post(`/orders/${order.id}/reorder-check`);
    // result: { available: CartItem[], unavailable: string[], price_changes: PriceChange[] }

    if (result.unavailable.length === 0) {
      cartStore.setItems(result.available);
      cartStore.setStoreId(order.store_id);
      navigate('Cart');
    } else {
      showUnavailableModal(result);
    }
  };

  return { reorder };
}
```

### 11.2 Storm Mode (One-Tap Reorder)

Storm Mode is the signature UX feature — a single button press that reorders the customer's last order, pays, and sends it to the kitchen. No screens, no taps, no friction.

**Location:** HomeScreen, prominent button with lightning bolt icon and the last order's description.

**Visual:** Large card at the top of HomeScreen:
```
⚡ STORM MODE
Classic Combo + Chicken Strips    $24.48
Tap to reorder instantly
[STORM ⚡]
```

**Flow:**
1. User taps the Storm Mode button
2. **Haptic:** Heavy impact
3. **Animation:** Lightning Lottie animation plays full-screen (1.5 seconds)
4. **Meanwhile (parallel):**
   a. Validate last order items are available at selected store
   b. Create order via `/api/stores/:id/checkout` with idempotency key
   c. Create Stripe PaymentIntent
   d. Charge using the customer's saved payment method (no Payment Sheet — uses Stripe saved card)
5. **Success:** 
   - Lightning animation transitions to checkmark
   - Toast: "Order placed! Pickup in ~18 min"
   - Navigate to OrderStatusScreen
6. **Failure:**
   - Lightning animation transitions to shake
   - Show error bottom sheet: "Couldn't place your order — {reason}"
   - "Try Again" or "Go to Cart" buttons

**Requirements for Storm Mode to be available:**
- User has at least 1 completed order
- User has a saved payment method on file (Stripe Customer + PaymentMethod)
- A store is selected and currently open
- The last order's items are available at the selected store

**If not available:** The Storm Mode card shows in a disabled state with the reason: "Save a payment method to enable Storm Mode" or "Last order items unavailable at this location."

```typescript
// hooks/useStormMode.ts

function useStormMode() {
  const { lastOrder } = useOrderStore();
  const { selectedStore } = useLocationStore();
  const { savedPaymentMethod } = useAuthStore();

  const isAvailable = !!(
    lastOrder &&
    selectedStore?.is_accepting_orders &&
    savedPaymentMethod
  );

  const unavailableReason = !lastOrder
    ? 'Place your first order to unlock Storm Mode'
    : !selectedStore?.is_accepting_orders
    ? 'Store is currently closed'
    : !savedPaymentMethod
    ? 'Save a payment method to enable Storm Mode'
    : null;

  const execute = async () => {
    haptics.heavy();
    // 1. Validate items
    const check = await api.post(`/orders/${lastOrder.id}/reorder-check`);
    if (check.unavailable.length > 0) throw new Error('ITEMS_UNAVAILABLE');

    // 2. Create order + charge saved card
    const result = await api.post(`/stores/${selectedStore.id}/storm-checkout`, {
      source_order_id: lastOrder.id,
      payment_method_id: savedPaymentMethod.id,
      idempotency_key: uuid(),
    });

    return result.order;
  };

  return { isAvailable, unavailableReason, lastOrder, execute };
}
```

**Backend endpoint for Storm Mode:**

```
POST /api/stores/:storeId/storm-checkout
Auth: customer
Body: { source_order_id, payment_method_id, idempotency_key }

Server-side:
1. Idempotency check
2. Fetch source order items
3. Validate all items available at store
4. Recalculate prices from current menu
5. Create order (same as normal checkout)
6. Charge saved payment method (no client_secret needed)
7. Return confirmed order
```

---

## 12. Accessibility Requirements

### 12.1 Screen Reader Support

- All interactive elements have `accessibilityLabel` and `accessibilityHint`.
- Images have `accessibilityLabel` describing the content (e.g., "Classic StormBurger on a sesame bun with lettuce and tomato").
- Status changes announce via `AccessibilityInfo.announceForAccessibility()` (e.g., "Order status updated: preparing").
- Menu items announce: "{name}, {price}, {description}. Double tap to customize."
- Cart badge announces: "{count} items in cart, total {price}".

### 12.2 Dynamic Type

- All text uses the typography system which responds to iOS Dynamic Type and Android font scaling.
- Layouts accommodate up to 200% text size without clipping or overlap.
- Test with: Settings → Accessibility → Larger Text → maximum size.

### 12.3 Color & Contrast

- All text meets WCAG AA contrast ratio (4.5:1 for body text, 3:1 for large text).
- Status indicators never rely on color alone — always paired with icons or text labels.
- Support reduced motion: disable Lottie animations when `AccessibilityInfo.isReduceMotionEnabled`.

### 12.4 Touch Targets

- Minimum 44×44pt for all interactive elements (Apple HIG).
- Adequate spacing between touch targets (minimum 8pt gap).
- Swipe-to-delete has an explicit delete button alternative.

---

## 13. Performance Requirements

### 13.1 Startup Performance

| Metric | Target |
|---|---|
| Cold start → interactive | < 2.5 seconds |
| Splash → HomeScreen | < 3 seconds (including auth check) |
| JS bundle size | < 5 MB (gzipped) |

### 13.2 Screen Performance

| Metric | Target |
|---|---|
| Menu list FPS | 60 FPS during scroll |
| Screen transition | < 300ms |
| Image load (menu item) | < 1 second with progressive loading |
| Cart total recalculation | < 16ms (one frame) |
| Search filter response | < 100ms |

### 13.3 Network Performance

| Metric | Target |
|---|---|
| Menu load (cold) | < 2 seconds |
| Menu load (cached) | < 100ms |
| Checkout completion | < 3 seconds (including Stripe) |
| Order status update | < 1 second (realtime) |

### 13.4 Optimization Strategies

**Images:**
- Use Supabase Storage image transformations for thumbnails (200×200 for list, 800×400 for detail).
- Progressive JPEG loading with blur placeholder.
- `FastImage` library for caching and performance.

**Lists:**
- `FlashList` instead of `FlatList` for menu and order history (2–5x faster).
- Item height estimation for instant scroll position calculation.
- Virtualized sections — only render visible items.

**Bundle:**
- Lazy-load screens with `React.lazy` + `Suspense` (if supported) or manual code splitting.
- Tree-shake unused Supabase modules.
- Hermes engine enabled for both platforms.

**Memory:**
- Unsubscribe from Realtime channels on screen unmount.
- Clear image cache when app goes to background for > 10 minutes.
- Limit order history to 50 in-memory items.

### 13.5 Monitoring

- Track TTI (time to interactive) per screen using custom performance marks.
- Track API latency per endpoint.
- Track JS errors via Sentry or Bugsnag.
- Track crash-free rate — target: > 99.5%.

---

## 14. Testing Strategy

### 14.1 Unit Tests

- All Zustand stores: state transitions, computed values, edge cases.
- All utility functions: price formatting, date formatting, validation.
- API client: token attachment, retry logic, error handling.

### 14.2 Component Tests

- All UI primitives: render, variants, disabled state, loading state.
- ModifierGroup: selection logic, required validation, price calculation.
- CartItemRow: quantity changes, swipe delete.
- OrderStatusTracker: all status states, animations.

### 14.3 Integration Tests

- Auth flow: signup → login → token refresh → logout.
- Order flow: add to cart → checkout preview → payment → confirmation.
- Reorder flow: history → reorder check → cart population.
- Storm Mode: validation → charge → confirmation.

### 14.4 E2E Tests (Detox)

- Full order flow: launch → select store → browse menu → add item → customize → cart → checkout → pay → confirmation.
- Guest to signed-up conversion flow.
- Deep link from notification → order status screen.

---

*This plan covers every screen, component, state management decision, API integration, cache strategy, and UX detail needed to build the StormBurger mobile app. The architecture supports offline browsing, real-time order tracking, one-tap reorder, and scales to 200K+ users without re-architecture.*
