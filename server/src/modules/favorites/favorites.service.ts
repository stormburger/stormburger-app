import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';
import { CreateFavoriteDto } from './dto/create-favorite.dto';

@Injectable()
export class FavoritesService {
  constructor(private readonly supabase: SupabaseService) {}

  async getFavorites(userId: string, storeId?: string) {
    const admin = this.supabase.getAdminClient();

    const { data: favs, error } = await admin
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const results: any[] = [];

    for (const fav of favs || []) {
      const { data: item } = await admin
        .from('menu_items')
        .select('id, name, description, base_price, image_url, category, is_active')
        .eq('id', fav.menu_item_id)
        .single();

      if (!item) continue;

      let price = item.base_price;
      let isAvailable = item.is_active;

      if (storeId) {
        const { data: locItem } = await admin
          .from('location_menu_items')
          .select('price_override, is_available')
          .eq('menu_item_id', fav.menu_item_id)
          .eq('location_id', storeId)
          .single();

        if (locItem) {
          price = locItem.price_override ?? item.base_price;
          isAvailable = item.is_active && locItem.is_available;
        } else {
          isAvailable = false;
        }
      }

      const savedModifierIds: string[] = fav.modifier_ids || [];
      const validModifiers: any[] = [];
      const invalidModifiers: string[] = [];

      if (savedModifierIds.length > 0) {
        const { data: mods } = await admin
          .from('modifiers')
          .select('id, name, price_adjustment, is_active')
          .in('id', savedModifierIds);

        for (const modId of savedModifierIds) {
          const mod = (mods || []).find((m: any) => m.id === modId);
          if (mod && mod.is_active) {
            validModifiers.push({ id: mod.id, name: mod.name, price_adjustment: mod.price_adjustment });
          } else {
            invalidModifiers.push(modId);
          }
        }
      }

      const modTotal = validModifiers.reduce((s: number, m: any) => s + m.price_adjustment, 0);

      results.push({
        id: fav.id,
        custom_name: fav.custom_name,
        quantity: fav.quantity || 1,
        menu_item: {
          id: item.id, name: item.name, description: item.description,
          price, image_url: item.image_url, category: item.category, is_available: isAvailable,
        },
        modifiers: validModifiers,
        invalid_modifiers: invalidModifiers,
        unit_price: price + modTotal,
        created_at: fav.created_at,
      });
    }

    return results;
  }

  async addFavorite(userId: string, dto: CreateFavoriteDto) {
    const admin = this.supabase.getAdminClient();

    const { data: item } = await admin
      .from('menu_items')
      .select('id, name')
      .eq('id', dto.menu_item_id)
      .eq('is_active', true)
      .single();

    if (!item) throw new NotFoundException('Menu item not found');

    const { data, error } = await admin
      .from('favorites')
      .insert({
        user_id: userId,
        menu_item_id: dto.menu_item_id,
        modifier_ids: dto.modifier_ids || [],
        custom_name: dto.custom_name || null,
        quantity: dto.quantity || 1,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new ConflictException('Already in favorites');
      throw error;
    }

    return data;
  }

  async updateFavorite(userId: string, favoriteId: string, updates: { custom_name?: string; quantity?: number }) {
    const admin = this.supabase.getAdminClient();

    const { data: fav } = await admin
      .from('favorites')
      .select('id')
      .eq('id', favoriteId)
      .eq('user_id', userId)
      .single();

    if (!fav) throw new NotFoundException('Favorite not found');

    const updateData: any = {};
    if (updates.custom_name !== undefined) updateData.custom_name = updates.custom_name;
    if (updates.quantity !== undefined) updateData.quantity = updates.quantity;

    const { data, error } = await admin
      .from('favorites')
      .update(updateData)
      .eq('id', favoriteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeFavorite(userId: string, menuItemId: string) {
    await this.supabase.getAdminClient()
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('menu_item_id', menuItemId);

    return { removed: true };
  }

  async favoriteToCartPayload(userId: string, favoriteId: string) {
    const admin = this.supabase.getAdminClient();

    const { data: fav } = await admin
      .from('favorites')
      .select('*')
      .eq('id', favoriteId)
      .eq('user_id', userId)
      .single();

    if (!fav) throw new NotFoundException('Favorite not found');

    const savedIds: string[] = fav.modifier_ids || [];
    let validIds: string[] = [];

    if (savedIds.length > 0) {
      const { data: mods } = await admin
        .from('modifiers')
        .select('id')
        .in('id', savedIds)
        .eq('is_active', true);

      validIds = (mods || []).map((m: any) => m.id);
    }

    return {
      menu_item_id: fav.menu_item_id,
      quantity: fav.quantity || 1,
      modifier_ids: validIds,
    };
  }
}
