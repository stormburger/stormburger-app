import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';

@Injectable()
export class FavoritesService {
  constructor(private readonly supabase: SupabaseService) {}

  async getFavorites(userId: string) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('favorites')
      .select(`
        id,
        created_at,
        menu_item:menu_items!inner(
          id, name, description, base_price, image_url, category, is_active
        )
      `)
      .eq('user_id', userId)
      .eq('menu_items.is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((f: any) => ({
      id: f.id,
      menu_item: {
        id: f.menu_item.id,
        name: f.menu_item.name,
        description: f.menu_item.description,
        price: f.menu_item.base_price,
        image_url: f.menu_item.image_url,
        category: f.menu_item.category,
      },
      created_at: f.created_at,
    }));
  }

  async addFavorite(userId: string, menuItemId: string) {
    const admin = this.supabase.getAdminClient();

    // Verify item exists
    const { data: item } = await admin
      .from('menu_items')
      .select('id, name')
      .eq('id', menuItemId)
      .eq('is_active', true)
      .single();

    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    const { data, error } = await admin
      .from('favorites')
      .insert({ user_id: userId, menu_item_id: menuItemId })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException('Item is already in your favorites');
      }
      throw error;
    }

    return { id: data.id, menu_item_id: menuItemId, created_at: data.created_at };
  }

  async removeFavorite(userId: string, menuItemId: string) {
    const { error } = await this.supabase
      .getAdminClient()
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('menu_item_id', menuItemId);

    if (error) throw error;

    return { removed: true };
  }
}
