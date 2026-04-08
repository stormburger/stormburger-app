import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';
import { CartValidatorService } from './cart-validator.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly validator: CartValidatorService,
  ) {}

  /**
   * Gets the user's cart for a store, with items and calculated prices.
   * Returns an empty cart structure if no cart exists.
   */
  async getCart(userId: string, storeId: string) {
    const admin = this.supabase.getAdminClient();

    const { data: cart } = await admin
      .from('carts')
      .select('*')
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .single();

    if (!cart) {
      return {
        id: null,
        store_id: storeId,
        items: [],
        subtotal: 0,
        item_count: 0,
        promo_code: null,
      };
    }

    return this.buildCartResponse(cart);
  }

  /**
   * Adds an item to the cart. Creates the cart if it doesn't exist.
   * All prices are calculated server-side from the database.
   */
  async addItem(userId: string, storeId: string, dto: AddCartItemDto) {
    const admin = this.supabase.getAdminClient();

    // Validate the item and modifiers against the database
    await this.validator.validateItem(dto.menu_item_id, storeId, dto.modifier_ids);

    // Find or create cart
    let cart = await this.findOrCreateCart(userId, storeId);

    // Insert cart item
    const { data: cartItem, error: itemError } = await admin
      .from('cart_items')
      .insert({
        cart_id: cart.id,
        menu_item_id: dto.menu_item_id,
        quantity: dto.quantity,
        special_instructions: dto.special_instructions || null,
      })
      .select()
      .single();

    if (itemError) throw itemError;

    // Insert cart item modifiers
    if (dto.modifier_ids.length > 0) {
      const modRows = dto.modifier_ids.map((modId) => ({
        cart_item_id: cartItem.id,
        modifier_id: modId,
      }));

      const { error: modError } = await admin
        .from('cart_item_modifiers')
        .insert(modRows);

      if (modError) throw modError;
    }

    // Refresh cart expiry
    await admin
      .from('carts')
      .update({ expires_at: this.expiresAt() })
      .eq('id', cart.id);

    return this.buildCartResponse(cart);
  }

  /**
   * Updates a cart item's quantity, modifiers, or instructions.
   * Setting quantity to 0 removes the item.
   */
  async updateItem(
    userId: string,
    storeId: string,
    cartItemId: string,
    dto: UpdateCartItemDto,
  ) {
    const admin = this.supabase.getAdminClient();

    // Verify the cart item belongs to this user
    const cartItem = await this.getCartItemWithOwnership(
      cartItemId,
      userId,
      storeId,
    );

    // Quantity 0 = remove
    if (dto.quantity === 0) {
      return this.removeItem(userId, storeId, cartItemId);
    }

    // Update quantity and/or instructions
    const updateData: Record<string, any> = {};
    if (dto.quantity !== undefined) updateData.quantity = dto.quantity;
    if (dto.special_instructions !== undefined)
      updateData.special_instructions = dto.special_instructions;

    if (Object.keys(updateData).length > 0) {
      await admin
        .from('cart_items')
        .update(updateData)
        .eq('id', cartItemId);
    }

    // Replace modifiers if provided
    if (dto.modifier_ids !== undefined) {
      // Validate new modifiers
      await this.validator.validateItem(
        cartItem.menu_item_id,
        storeId,
        dto.modifier_ids,
      );

      // Delete old modifiers
      await admin
        .from('cart_item_modifiers')
        .delete()
        .eq('cart_item_id', cartItemId);

      // Insert new modifiers
      if (dto.modifier_ids.length > 0) {
        const modRows = dto.modifier_ids.map((modId) => ({
          cart_item_id: cartItemId,
          modifier_id: modId,
        }));
        await admin.from('cart_item_modifiers').insert(modRows);
      }
    }

    const cart = await this.getUserCart(userId, storeId);
    return this.buildCartResponse(cart);
  }

  /**
   * Removes a single item from the cart.
   */
  async removeItem(userId: string, storeId: string, cartItemId: string) {
    const admin = this.supabase.getAdminClient();

    await this.getCartItemWithOwnership(cartItemId, userId, storeId);

    // Cascade delete handles cart_item_modifiers
    await admin.from('cart_items').delete().eq('id', cartItemId);

    const cart = await this.getUserCart(userId, storeId);
    return this.buildCartResponse(cart);
  }

  /**
   * Clears all items from the cart.
   */
  async clearCart(userId: string, storeId: string) {
    const admin = this.supabase.getAdminClient();

    const cart = await this.getUserCart(userId, storeId);
    if (cart) {
      // Cascade delete handles cart_item_modifiers
      await admin.from('cart_items').delete().eq('cart_id', cart.id);
    }

    return { cleared: true };
  }

  // --- Private helpers ---

  private async findOrCreateCart(userId: string, storeId: string) {
    const admin = this.supabase.getAdminClient();

    // Try to find existing cart
    const { data: existing } = await admin
      .from('carts')
      .select('*')
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .single();

    if (existing) {
      // Check if expired
      if (new Date(existing.expires_at) < new Date()) {
        // Clean up expired cart items and reset
        await admin.from('cart_items').delete().eq('cart_id', existing.id);
        await admin
          .from('carts')
          .update({ expires_at: this.expiresAt() })
          .eq('id', existing.id);
        return existing;
      }
      return existing;
    }

    // Create new cart
    const { data: newCart, error } = await admin
      .from('carts')
      .insert({
        user_id: userId,
        store_id: storeId,
        expires_at: this.expiresAt(),
      })
      .select()
      .single();

    if (error) throw error;
    return newCart;
  }

  private async getUserCart(userId: string, storeId: string) {
    const { data } = await this.supabase
      .getAdminClient()
      .from('carts')
      .select('*')
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .single();

    return data;
  }

  private async getCartItemWithOwnership(
    cartItemId: string,
    userId: string,
    storeId: string,
  ) {
    const admin = this.supabase.getAdminClient();

    const { data: cartItem } = await admin
      .from('cart_items')
      .select('*, cart:carts!inner(user_id, store_id)')
      .eq('id', cartItemId)
      .single();

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (
      cartItem.cart.user_id !== userId ||
      cartItem.cart.store_id !== storeId
    ) {
      throw new ForbiddenException('Cart item does not belong to you');
    }

    return cartItem;
  }

  /**
   * Builds the full cart response with items and calculated prices.
   * Prices are always calculated from the menu — never stored in the cart.
   */
  private async buildCartResponse(cart: any) {
    const admin = this.supabase.getAdminClient();

    // Fetch cart items with their modifiers
    const { data: cartItems } = await admin
      .from('cart_items')
      .select(`
        id,
        menu_item_id,
        quantity,
        special_instructions,
        cart_item_modifiers(modifier_id)
      `)
      .eq('cart_id', cart.id)
      .order('created_at');

    if (!cartItems || cartItems.length === 0) {
      return {
        id: cart.id,
        store_id: cart.store_id,
        items: [],
        subtotal: 0,
        item_count: 0,
        promo_code: cart.promo_code || null,
      };
    }

    // For each cart item, calculate the price from the menu
    const items: any[] = [];
    let subtotal = 0;
    let itemCount = 0;

    for (const ci of cartItems) {
      const modIds = (ci.cart_item_modifiers || []).map(
        (m: any) => m.modifier_id,
      );

      // Validate and price the item — this catches items that became unavailable
      try {
        const validated = await this.validator.validateItem(
          ci.menu_item_id,
          cart.store_id,
          modIds,
        );

        const lineTotal = validated.unitPrice * ci.quantity;
        subtotal += lineTotal;
        itemCount += ci.quantity;

        items.push({
          id: ci.id,
          menu_item: {
            id: validated.menuItem.id,
            name: validated.menuItem.name,
            image_url: validated.menuItem.image_url,
            category: validated.menuItem.category,
          },
          quantity: ci.quantity,
          unit_price: validated.unitPrice,
          line_total: lineTotal,
          modifiers: validated.modifiers.map((m) => ({
            id: m.id,
            name: m.name,
            group_name: m.group_name,
            price_adjustment: m.price_adjustment,
          })),
          special_instructions: ci.special_instructions,
        });
      } catch {
        // Item became unavailable — remove it from cart silently
        await admin.from('cart_items').delete().eq('id', ci.id);
      }
    }

    return {
      id: cart.id,
      store_id: cart.store_id,
      items,
      subtotal,
      item_count: itemCount,
      promo_code: cart.promo_code || null,
    };
  }

  private expiresAt(): string {
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }
}
