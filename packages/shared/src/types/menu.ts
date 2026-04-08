import { ItemCategory, ModifierType } from './enums';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  base_price: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LocationMenuItem {
  id: string;
  location_id: string;
  menu_item_id: string;
  price_override: number | null;  // null = use base_price
  is_available: boolean;
  menu_item?: MenuItem;
}

export interface ModifierGroup {
  id: string;
  name: string;           // e.g. "Toppings", "Size", "Extras"
  type: ModifierType;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  sort_order: number;
}

export interface Modifier {
  id: string;
  group_id: string;
  name: string;            // e.g. "Extra Cheese", "No Onions"
  price_adjustment: number; // 0 for free, positive for upcharge
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface MenuItemModifierGroup {
  menu_item_id: string;
  modifier_group_id: string;
}
