const API_BASE = __DEV__
  ? 'http://192.168.1.65:3001/api'
  : 'https://api.stormburger.com/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // Locations
  getLocations() {
    return this.request<any[]>('/locations');
  }

  getLocation(id: string) {
    return this.request<any>(`/locations/${id}`);
  }

  getLocationStatus(id: string) {
    return this.request<any>(`/locations/${id}/status`);
  }

  // Menu
  getMenuForLocation(locationId: string) {
    return this.request<any>(`/menu/location/${locationId}`);
  }

  getMenuItem(id: string, locationId?: string) {
    const query = locationId ? `?location_id=${locationId}` : '';
    return this.request<any>(`/menu/items/${id}${query}`);
  }

  // Orders
  createOrder(data: any) {
    return this.request<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getMyOrders() {
    return this.request<any[]>('/orders/mine');
  }

  getOrder(id: string) {
    return this.request<any>(`/orders/${id}`);
  }

  // Payments
  createPaymentIntent(orderId: string) {
    return this.request<{
      client_secret: string;
      payment_intent_id: string;
      publishable_key: string;
    }>(`/payments/intent/${orderId}`, { method: 'POST' });
  }

  // Push notifications — register device token after login
  registerPushToken(token: string, platform: 'ios' | 'android', deviceId?: string) {
    return this.request<{ registered: boolean }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ push_token: token, push_platform: platform, push_device_id: deviceId }),
    });
  }

  // Notification preferences
  getNotificationPreferences() {
    return this.request<{ order_updates: boolean; promotions: boolean; loyalty_updates: boolean }>(
      '/notifications/preferences',
    );
  }

  updateNotificationPreferences(prefs: Partial<{ order_updates: boolean; promotions: boolean; loyalty_updates: boolean }>) {
    return this.request<{ order_updates: boolean; promotions: boolean; loyalty_updates: boolean }>(
      '/notifications/preferences',
      { method: 'PATCH', body: JSON.stringify(prefs) },
    );
  }
}

export const api = new ApiClient();
