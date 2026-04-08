import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';

@Injectable()
export class AdminService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * GET /api/admin/orders — all active orders, optionally filtered by store.
   * Used by the kitchen dashboard and admin order list.
   */
  async getOrders(storeId?: string, status?: string) {
    const admin = this.supabase.getAdminClient();

    let query = admin
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          order_item_modifiers(*)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (storeId) {
      query = query.eq('location_id', storeId);
    }

    if (status) {
      query = query.eq('status', status);
    } else {
      // Default: show active orders only
      query = query.in('status', ['pending', 'confirmed', 'preparing', 'ready']);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  /**
   * PATCH /api/admin/menu/items/:id — toggle is_active on a menu item.
   */
  async toggleMenuItem(itemId: string) {
    const admin = this.supabase.getAdminClient();

    // Get current state
    const { data: item, error: fetchError } = await admin
      .from('menu_items')
      .select('id, name, is_active')
      .eq('id', itemId)
      .single();

    if (fetchError || !item) {
      throw new NotFoundException('Menu item not found');
    }

    // Toggle
    const { data: updated, error: updateError } = await admin
      .from('menu_items')
      .update({ is_active: !item.is_active })
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) throw updateError;

    return updated;
  }

  /**
   * PATCH /api/admin/menu/items/:id/price — update base price or store-specific price.
   * If storeId is provided, updates location_menu_items.price_override.
   * If not, updates menu_items.base_price.
   */
  async updateMenuItemPrice(
    itemId: string,
    price: number,
    storeId?: string,
  ) {
    const admin = this.supabase.getAdminClient();

    if (typeof price !== 'number' || price < 0) {
      throw new BadRequestException('Price must be a non-negative number (in cents)');
    }

    // Verify item exists
    const { data: item } = await admin
      .from('menu_items')
      .select('id')
      .eq('id', itemId)
      .single();

    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    if (storeId) {
      // Update store-specific price override
      const { data: existing } = await admin
        .from('location_menu_items')
        .select('id')
        .eq('menu_item_id', itemId)
        .eq('location_id', storeId)
        .single();

      if (!existing) {
        throw new NotFoundException('Item is not linked to this store');
      }

      const { data: updated, error } = await admin
        .from('location_menu_items')
        .update({ price_override: price })
        .eq('menu_item_id', itemId)
        .eq('location_id', storeId)
        .select()
        .single();

      if (error) throw error;
      return updated;
    } else {
      // Update base price
      const { data: updated, error } = await admin
        .from('menu_items')
        .update({ base_price: price })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return updated;
    }
  }

  /**
   * PATCH /api/admin/menu/items/:id — update basic item fields.
   * Only updates fields that are provided (partial update).
   */
  async updateMenuItem(
    itemId: string,
    updates: {
      name?: string;
      description?: string;
      image_url?: string;
      category?: string;
      is_featured?: boolean;
      sort_order?: number;
    },
  ) {
    const admin = this.supabase.getAdminClient();

    const { data: item } = await admin
      .from('menu_items')
      .select('id')
      .eq('id', itemId)
      .single();

    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    // Only include fields that were actually provided
    const updateData: Record<string, any> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.image_url !== undefined) updateData.image_url = updates.image_url;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.is_featured !== undefined) updateData.is_featured = updates.is_featured;
    if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    const { data: updated, error } = await admin
      .from('menu_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }
}
