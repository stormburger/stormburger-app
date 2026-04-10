import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../config/supabase.config';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  private taxRate: number;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.taxRate = parseFloat(config.get('CA_TAX_RATE', '0.0975'));
  }

  async createOrder(dto: CreateOrderDto, userId: string) {
    const admin = this.supabase.getAdminClient();

    // Idempotency check — return existing order if key already used
    const { data: existing } = await admin
      .from('orders')
      .select('*')
      .eq('idempotency_key', dto.idempotency_key)
      .maybeSingle();

    if (existing) return existing;

    // Validate location is open
    const { data: location } = await admin
      .from('locations')
      .select('*')
      .eq('id', dto.location_id)
      .eq('is_active', true)
      .eq('is_accepting_orders', true)
      .single();

    if (!location) {
      throw new BadRequestException('Location is not accepting orders');
    }

    // Validate and price each item
    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of dto.items) {
      // Get menu item
      const { data: menuItem } = await admin
        .from('menu_items')
        .select('*')
        .eq('id', item.menu_item_id)
        .eq('is_active', true)
        .single();

      if (!menuItem) {
        throw new BadRequestException(
          `Menu item ${item.menu_item_id} not found or unavailable`,
        );
      }

      // Check location availability
      const { data: locItem } = await admin
        .from('location_menu_items')
        .select('*')
        .eq('menu_item_id', item.menu_item_id)
        .eq('location_id', dto.location_id)
        .eq('is_available', true)
        .single();

      if (!locItem) {
        throw new BadRequestException(
          `${menuItem.name} is not available at this location`,
        );
      }

      const unitPrice = locItem.price_override ?? menuItem.base_price;

      // Validate and price modifiers
      let modifierTotal = 0;
      const orderModifiers: any[] = [];

      if (item.modifier_ids.length > 0) {
        const { data: modifiers } = await admin
          .from('modifiers')
          .select('*, modifier_groups!inner(name, type, min_selections, max_selections)')
          .in('id', item.modifier_ids)
          .eq('is_active', true);

        if (!modifiers || modifiers.length !== item.modifier_ids.length) {
          throw new BadRequestException('One or more modifiers are invalid');
        }

        for (const mod of modifiers) {
          modifierTotal += mod.price_adjustment;
          orderModifiers.push({
            modifier_id: mod.id,
            modifier_name: mod.name,
            price_adjustment: mod.price_adjustment,
          });
        }
      }

      const itemTotal = (unitPrice + modifierTotal) * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        menu_item_id: item.menu_item_id,
        menu_item_name: menuItem.name,
        quantity: item.quantity,
        unit_price: unitPrice + modifierTotal,
        total_price: itemTotal,
        special_instructions: item.special_instructions || null,
        modifiers: orderModifiers,
      });
    }

    const tax = Math.round(subtotal * this.taxRate);
    const total = subtotal + tax;

    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    // Estimated pickup: 15–20 minutes from now
    const estimatedPickup = new Date(Date.now() + 18 * 60 * 1000);

    // Insert order
    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        location_id: dto.location_id,
        status: 'pending',
        subtotal,
        tax,
        total,
        estimated_pickup_at: estimatedPickup.toISOString(),
        special_instructions: dto.special_instructions || null,
        idempotency_key: dto.idempotency_key,
      })
      .select()
      .single();

    if (orderError) {
      if (orderError.code === '23505') {
        // Unique constraint on idempotency_key — race condition
        const { data: raceOrder } = await admin
          .from('orders')
          .select('*')
          .eq('idempotency_key', dto.idempotency_key)
          .single();
        return raceOrder;
      }
      throw orderError;
    }

    // Insert order items and their modifiers
    for (const item of orderItems) {
      const { modifiers, ...itemData } = item;
      const { data: orderItem, error: itemError } = await admin
        .from('order_items')
        .insert({ ...itemData, order_id: order.id })
        .select()
        .single();

      if (itemError) throw itemError;

      if (modifiers.length > 0) {
        const modRows = modifiers.map((m: any) => ({
          ...m,
          order_item_id: orderItem.id,
        }));
        const { error: modError } = await admin
          .from('order_item_modifiers')
          .insert(modRows);
        if (modError) throw modError;
      }
    }

    return order;
  }

  async getOrder(orderId: string, userId: string) {
    const client = this.supabase.getAdminClient();

    const { data, error } = await client
      .from('orders')
      .select(
        `
        *,
        location:locations(name, address, city),
        order_items(
          *,
          order_item_modifiers(*)
        )
      `,
      )
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (error || !data) throw new NotFoundException('Order not found');
    return data;
  }

  async getUserOrders(userId: string) {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('orders')
      .select(
        `
        *,
        location:locations(name, address)
      `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data;
  }

  async updateStatus(orderId: string, status: string) {
    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['picked_up'],
    };

    const { data: order } = await this.supabase
      .getAdminClient()
      .from('orders')
      .select('status, user_id, order_number')
      .eq('id', orderId)
      .single();

    if (!order) throw new NotFoundException('Order not found');

    const allowed = validTransitions[order.status];
    if (!allowed || !allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${status}`,
      );
    }

    const { data, error } = await this.supabase
      .getAdminClient()
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    // Fire-and-forget push notification — does not block the response
    this.notificationsService
      .dispatchOrderNotification(order.user_id, order.order_number, status)
      .catch(() => null);

    return data;
  }

  private async generateOrderNumber(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const { count } = await this.supabase
      .getAdminClient()
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date().toISOString().slice(0, 10));

    const seq = ((count || 0) + 1).toString().padStart(3, '0');
    return `SB-${today}-${seq}`;
  }
}
