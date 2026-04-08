import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';

@Injectable()
export class MenuService {
  constructor(private readonly supabase: SupabaseService) {}

  async getMenuForLocation(locationId: string) {
    const client = this.supabase.getClient();

    // Get all available items for this location with price overrides
    const { data: locationItems, error } = await client
      .from('location_menu_items')
      .select(
        `
        id,
        price_override,
        is_available,
        menu_item:menu_items!inner (
          id,
          name,
          description,
          category,
          base_price,
          image_url,
          sort_order
        )
      `,
      )
      .eq('location_id', locationId)
      .eq('is_available', true)
      .eq('menu_items.is_active', true);

    if (error) throw error;

    // Transform and group by category
    const items = (locationItems || []).map((li: any) => ({
      id: li.menu_item.id,
      name: li.menu_item.name,
      description: li.menu_item.description,
      category: li.menu_item.category,
      price: li.price_override ?? li.menu_item.base_price,
      image_url: li.menu_item.image_url,
      sort_order: li.menu_item.sort_order,
    }));

    items.sort((a: any, b: any) => a.sort_order - b.sort_order);

    const categories: Record<string, any[]> = {};
    for (const item of items) {
      if (!categories[item.category]) categories[item.category] = [];
      categories[item.category].push(item);
    }

    return { location_id: locationId, categories };
  }

  async getItemWithModifiers(itemId: string, locationId?: string) {
    const client = this.supabase.getClient();

    // Get menu item
    const { data: item, error: itemError } = await client
      .from('menu_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError || !item) throw new NotFoundException('Menu item not found');

    // Get price override if location specified
    let price = item.base_price;
    if (locationId) {
      const { data: locItem } = await client
        .from('location_menu_items')
        .select('price_override')
        .eq('menu_item_id', itemId)
        .eq('location_id', locationId)
        .single();

      if (locItem?.price_override) price = locItem.price_override;
    }

    // Get modifier groups linked to this item
    const { data: groupLinks } = await client
      .from('menu_item_modifier_groups')
      .select('modifier_group_id')
      .eq('menu_item_id', itemId);

    const groupIds = (groupLinks || []).map((l: any) => l.modifier_group_id);

    let modifierGroups: any[] = [];
    if (groupIds.length > 0) {
      const { data: groups } = await client
        .from('modifier_groups')
        .select('*')
        .in('id', groupIds)
        .order('sort_order');

      // Get modifiers for each group
      const { data: modifiers } = await client
        .from('modifiers')
        .select('*')
        .in('group_id', groupIds)
        .eq('is_active', true)
        .order('sort_order');

      modifierGroups = (groups || []).map((g: any) => ({
        ...g,
        modifiers: (modifiers || []).filter((m: any) => m.group_id === g.id),
      }));
    }

    return {
      ...item,
      price,
      modifier_groups: modifierGroups,
    };
  }
}
