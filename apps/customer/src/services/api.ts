const API_BASE = '/api';

export function getToken(): string | null { return localStorage.getItem('sb_access_token'); }
export function setTokens(access: string, refresh: string): void {
  localStorage.setItem('sb_access_token', access);
  localStorage.setItem('sb_refresh_token', refresh);
}
export function clearTokens(): void {
  localStorage.removeItem('sb_access_token');
  localStorage.removeItem('sb_refresh_token');
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error?.message ?? (body as any).message ?? `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function signup(email: string, password: string, displayName: string, phone?: string) {
  const body: any = { email, password, display_name: displayName };
  if (phone) body.phone = phone;
  const data = await apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(body) });
  const access = data?.session?.access_token ?? data?.access_token;
  const refresh = data?.session?.refresh_token ?? data?.refresh_token;
  if (access) setTokens(access, refresh ?? '');
  return data;
}
export async function signin(email: string, password: string) {
  const data = await apiFetch('/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) });
  const access = data?.session?.access_token ?? data?.access_token;
  const refresh = data?.session?.refresh_token ?? data?.refresh_token;
  if (access) setTokens(access, refresh ?? '');
  return data;
}
export async function signout() { await apiFetch('/auth/signout', { method: 'POST' }).catch(() => null); clearTokens(); }
export async function getMe() { return apiFetch('/auth/me'); }
export async function updateProfile(data: { display_name?: string; preferred_store_id?: string; push_token?: string; marketing_opt_in?: boolean }) { return apiFetch('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }); }

export async function getNotificationPreferences(): Promise<{ order_updates: boolean; promotions: boolean; loyalty_updates: boolean }> { return apiFetch('/notifications/preferences'); }
export async function updateNotificationPreferences(data: Partial<{ order_updates: boolean; promotions: boolean; loyalty_updates: boolean }>) { return apiFetch('/notifications/preferences', { method: 'PATCH', body: JSON.stringify(data) }); }

export async function getLocations(): Promise<Location[]> { return apiFetch('/locations'); }
export async function getMenu(storeId: string): Promise<MenuResponse> { return apiFetch(`/menu/location/${storeId}`); }
export async function getMenuItem(itemId: string, storeId: string): Promise<MenuItem> { return apiFetch(`/menu/items/${itemId}?store_id=${storeId}`); }

export async function getCart(storeId: string): Promise<Cart> { return apiFetch(`/stores/${storeId}/cart`); }
export async function addToCart(storeId: string, menuItemId: string, quantity: number, modifierIds: string[], specialInstructions?: string): Promise<Cart> {
  return apiFetch(`/stores/${storeId}/cart/items`, { method: 'POST', body: JSON.stringify({ menu_item_id: menuItemId, quantity, modifier_ids: modifierIds, special_instructions: specialInstructions }) });
}
export async function updateCartItem(storeId: string, cartItemId: string, quantity: number): Promise<Cart> {
  return apiFetch(`/stores/${storeId}/cart/items/${cartItemId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) });
}
export async function removeCartItem(storeId: string, cartItemId: string): Promise<Cart> {
  return apiFetch(`/stores/${storeId}/cart/items/${cartItemId}`, { method: 'DELETE' });
}
export async function clearCart(storeId: string): Promise<void> { return apiFetch(`/stores/${storeId}/cart`, { method: 'DELETE' }); }

export async function checkoutPreview(storeId: string, tipAmount = 0): Promise<CheckoutPreview> {
  return apiFetch(`/stores/${storeId}/checkout/preview`, { method: 'POST', body: JSON.stringify({ tip_amount: tipAmount }) });
}
export async function checkout(storeId: string, idempotencyKey: string, tipAmount = 0, specialInstructions?: string): Promise<CheckoutResult> {
  return apiFetch(`/stores/${storeId}/checkout`, { method: 'POST', body: JSON.stringify({ idempotency_key: idempotencyKey, tip_amount: tipAmount, special_instructions: specialInstructions }) });
}

export async function getMyOrders(): Promise<Order[]> { return apiFetch('/orders/mine'); }
export async function getOrder(orderId: string): Promise<Order> { return apiFetch(`/orders/${orderId}`); }

// Loyalty
export async function getLoyalty(): Promise<LoyaltyInfo> { return apiFetch('/loyalty'); }
export async function getOrderPoints(orderId: string): Promise<{ points_earned: number; order_number: string }> { return apiFetch(`/loyalty/orders/${orderId}/points`); }

// Favorites — server-backed, uses localStorage as a fast read-cache for the heart button state
const FAV_ITEM_KEY = 'sb_fav_item_ids'; // cache of saved menu_item_ids for instant heart rendering

function _updateFavCache(menuItemId: string, add: boolean) {
  try {
    const ids: string[] = JSON.parse(localStorage.getItem(FAV_ITEM_KEY) || '[]');
    const next = add ? [...new Set([...ids, menuItemId])] : ids.filter(id => id !== menuItemId);
    localStorage.setItem(FAV_ITEM_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

export function isFavorite(menuItemId: string): boolean {
  try { return JSON.parse(localStorage.getItem(FAV_ITEM_KEY) || '[]').includes(menuItemId); } catch { return false; }
}

/** Fetch full favorite list from server (includes modifiers, custom_name, availability) */
export async function getFavorites(): Promise<Favorite[]> { return apiFetch('/favorites'); }

/** Save a customized item as a favorite. Modifiers + qty captured from item detail screen. */
export async function saveFavorite(
  menuItemId: string,
  modifierIds: string[],
  quantity: number,
  customName?: string,
): Promise<Favorite> {
  const result = await apiFetch('/favorites', {
    method: 'POST',
    body: JSON.stringify({ menu_item_id: menuItemId, modifier_ids: modifierIds, quantity, custom_name: customName }),
  });
  _updateFavCache(menuItemId, true);
  return result;
}

/** Remove a favorite by its row ID (not menu_item_id) */
export async function removeFavorite(favoriteId: string, menuItemId: string): Promise<void> {
  await apiFetch(`/favorites/${favoriteId}`, { method: 'DELETE' });
  _updateFavCache(menuItemId, false);
}

/** Rename a favorite */
export async function renameFavorite(favoriteId: string, customName: string): Promise<{ id: string; custom_name: string }> {
  return apiFetch(`/favorites/${favoriteId}`, {
    method: 'PATCH',
    body: JSON.stringify({ custom_name: customName }),
  });
}

// Keep legacy stubs to avoid breaking old call sites (ItemDetailPage still uses these on mount)
export function getFavoriteIds(): string[] {
  try { return JSON.parse(localStorage.getItem(FAV_ITEM_KEY) || '[]'); } catch { return []; }
}
export function saveFavoriteId(menuItemId: string): void { _updateFavCache(menuItemId, true); }
export function removeFavoriteId(menuItemId: string): void { _updateFavCache(menuItemId, false); }
/** @deprecated use saveFavorite() */
export async function syncFavoriteAdd(menuItemId: string, modifierIds: string[] = [], quantity = 1): Promise<void> {
  await saveFavorite(menuItemId, modifierIds, quantity).catch(() => null);
}
/** @deprecated use removeFavorite() */
export async function syncFavoriteRemove(_menuItemId: string): Promise<void> { /* no-op: caller must use removeFavorite(favoriteId) */ }

export interface Location { id: string; name: string; address: string; city: string; state: string; is_open?: boolean; }
export interface Modifier { id: string; name: string; price_adjustment: number; }
export interface ModifierGroup { id: string; name: string; display_name?: string; type: 'single' | 'multiple'; min_selections: number; max_selections: number; modifiers: Modifier[]; }
export interface MenuItem { id: string; name: string; description: string; category: string; price: number; base_price?: number; image_url?: string; is_active?: boolean; modifier_groups?: ModifierGroup[]; }
export interface MenuResponse { location_id: string; categories: Record<string, MenuItem[]>; }
export interface CartItemModifier { id: string; name: string; group_name: string; price_adjustment: number; }
export interface CartItem { id: string; menu_item: { id: string; name: string; image_url?: string; category?: string }; quantity: number; unit_price: number; line_total: number; modifiers: CartItemModifier[]; special_instructions?: string; }
export interface Cart { id: string; store_id: string; items: CartItem[]; subtotal: number; item_count: number; }
export interface CheckoutPreviewItem { name: string; quantity: number; unit_price: number; line_total: number; modifiers: { name: string; price_adjustment: number }[]; }
export interface CheckoutPreview { store: { id: string; name: string; address: string; estimated_pickup_at: string }; items: CheckoutPreviewItem[]; pricing: { subtotal: number; tax_rate: number; tax_amount: number; tip_amount: number; total: number }; item_count: number; }
export interface CheckoutOrder { id: string; order_number: string; status: string; subtotal: number; tax_amount: number; tip_amount: number; total: number; item_count: number; store_name: string; estimated_pickup_at: string; created_at: string; }
export interface CheckoutResult { order: CheckoutOrder; payment: { client_secret: string; payment_intent_id: string; publishable_key: string } | null; }
export interface Order { id: string; order_number: string; status: string; subtotal: number; tax_amount: number; tip_amount: number; total: number; created_at: string; location?: { name: string }; order_items?: any[]; }
export interface LoyaltyInfo { points_balance: number; lifetime_points: number; tier: string; next_tier: string | null; points_to_next_tier: number; reward_dollars: number; orders_counted: number; recent_transactions: { type: string; points: number; description: string; created_at: string }[]; }
export interface FavoriteModifier { id: string; name: string; price_adjustment: number; is_active: boolean; }
export interface Favorite {
  id: string;
  custom_name: string | null;
  quantity: number;
  modifier_ids: string[];
  modifiers: FavoriteModifier[];
  unavailable_modifiers: FavoriteModifier[];
  menu_item: { id: string; name: string; description: string; price: number; image_url?: string; category: string; is_active: boolean; };
  created_at: string;
  is_available: boolean;
}
