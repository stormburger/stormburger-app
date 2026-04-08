export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  phone: string;
  is_active: boolean;
  is_accepting_orders: boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface LocationHours {
  id: string;
  location_id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  open_time: string;   // HH:MM (24h)
  close_time: string;  // HH:MM (24h)
  is_closed: boolean;
}
