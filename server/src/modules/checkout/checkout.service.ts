import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../config/supabase.config';
import { CartValidatorService, ValidatedItem } from '../cart/cart-validator.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CheckoutDto } from './dto/checkout.dto';

const Stripe = require('stripe');

@Injectable()
export class CheckoutService {
  private stripe: any;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cartValidator: CartValidatorService,
    private readonly loyalty: LoyaltyService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(config.getOrThrow('STRIPE_SECRET_KEY'));
  }

  /**
   * Preview the checkout — validates everything and returns the price breakdown
   * without creating an order. Used by the checkout screen to show totals.
   */
  async preview(userId: string, storeId: string, tipAmount = 0) {
    const store = await this.validateStore(storeId);
    const { validatedItems, subtotal, itemCount } = await this.validateCart(
      userId,
      storeId,
    );

    const taxRate = parseFloat(this.config.get('CA_TAX_RATE', '0.0975'));
    const taxAmount = Math.round(subtotal * taxRate);
    const total = subtotal + taxAmount + tipAmount;

    return {
      store: {
        id: store.id,
        name: store.name,
        address: `${store.address}, ${store.city}, ${store.state} ${store.zip}`,
        estimated_pickup_at: this.estimatePickup(store.estimated_prep_minutes ?? 15),
      },
      items: validatedItems.map((vi) => ({
        name: vi.menuItem.name,
        quantity: vi.quantity,
        unit_price: vi.unitPrice,
        line_total: vi.unitPrice * vi.quantity,
        modifiers: vi.modifiers.map((m) => ({
          name: m.name,
          price_adjustment: m.price_adjustment,
        })),
      })),
      pricing: {
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        tip_amount: tipAmount,
        total,
      },
      item_count: itemCount,
    };
  }

  /**
   * Creates an order from the user's cart and initiates Stripe payment.
   *
   * This is the most critical function in the system. It:
   * 1. Checks idempotency (prevents duplicate orders)
   * 2. Validates the store is open
   * 3. Reads the cart from the database (never from the client)
   * 4. Re-validates every item and modifier
   * 5. Calculates all prices from the database
   * 6. Creates the order atomically
   * 7. Creates a Stripe PaymentIntent
   * 8. Clears the cart
   *
   * Prices are NEVER trusted from the client. The client sends only
   * the idempotency key, optional tip, and optional instructions.
   */
  async checkout(userId: string, storeId: string, dto: CheckoutDto) {
    const admin = this.supabase.getAdminClient();
    const tipAmount = dto.tip_amount || 0;

    // --- 1. Idempotency check ---
    const { data: existingOrder } = await admin
      .from('orders')
      .select('*')
      .eq('idempotency_key', dto.idempotency_key)
      .maybeSingle();

    if (existingOrder) {
      // Return existing order with payment info
      const { data: payment } = await admin
        .from('payments')
        .select('stripe_payment_intent_id')
        .eq('order_id', existingOrder.id)
        .single();

      let clientSecret = null;
      if (payment?.stripe_payment_intent_id) {
        const pi = await this.stripe.paymentIntents.retrieve(
          payment.stripe_payment_intent_id,
        );
        clientSecret = pi.client_secret;
      }

      return {
        order: existingOrder,
        payment: {
          client_secret: clientSecret,
          publishable_key: this.config.get('STRIPE_PUBLISHABLE_KEY'),
        },
      };
    }

    // --- 2. Validate store ---
    const store = await this.validateStore(storeId);

    // --- 3 & 4. Load and validate cart ---
    const { validatedItems, subtotal, itemCount } = await this.validateCart(
      userId,
      storeId,
    );

    // --- 5. Calculate totals ---
    const taxRate = parseFloat(this.config.get('CA_TAX_RATE', '0.0975'));
    const taxAmount = Math.round(subtotal * taxRate);

    // --- 5b. Loyalty redemption ---
    let loyaltyDiscount = 0;
    let pointsRedeemed = 0;
    if (dto.loyalty_points_to_redeem && dto.loyalty_points_to_redeem > 0) {
      loyaltyDiscount = await this.loyalty.redeemPoints(
        userId,
        dto.loyalty_points_to_redeem,
      );
      pointsRedeemed = dto.loyalty_points_to_redeem;
    }

    const total = Math.max(0, subtotal + taxAmount + tipAmount - loyaltyDiscount);

    // --- 6. Generate order number ---
    const orderNumber = await this.generateOrderNumber();

    const estimatedPickup = this.estimatePickup(store.estimated_prep_minutes ?? 15);

    // --- 7. Create order ---
    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        store_id: storeId,
        status: 'pending',
        subtotal,
        discount_amount: loyaltyDiscount,
        tax_amount: taxAmount,
        tip_amount: tipAmount,
        total,
        tax_rate: taxRate,
        loyalty_points_redeemed: pointsRedeemed,
        estimated_pickup_at: estimatedPickup,
        special_instructions: dto.special_instructions || null,
        idempotency_key: dto.idempotency_key,
        store_name: store.name,
        item_count: itemCount,
      })
      .select()
      .single();

    if (orderError) {
      // Unique constraint on idempotency_key — race condition with concurrent request
      if (orderError.code === '23505') {
        const { data: raceOrder } = await admin
          .from('orders')
          .select('*')
          .eq('idempotency_key', dto.idempotency_key)
          .single();
        if (raceOrder) return { order: raceOrder, payment: null };
      }
      throw new InternalServerErrorException(
        `Order creation failed: ${orderError.message}`,
      );
    }

    // --- 8. Create order items + modifiers ---
    for (const vi of validatedItems) {
      const { data: orderItem, error: itemError } = await admin
        .from('order_items')
        .insert({
          order_id: order.id,
          menu_item_id: vi.menuItem.id,
          quantity: vi.quantity,
          unit_price: vi.unitPrice,
          total_price: vi.unitPrice * vi.quantity,
          special_instructions: vi.specialInstructions || null,
          menu_item_name: vi.menuItem.name,
          menu_item_category: vi.menuItem.category,
        })
        .select()
        .single();

      if (itemError) throw itemError;

      if (vi.modifiers.length > 0) {
        const modRows = vi.modifiers.map((m) => ({
          order_item_id: orderItem.id,
          modifier_id: m.id,
          modifier_name: m.name,
          modifier_group_name: m.group_name,
          price_adjustment: m.price_adjustment,
        }));

        const { error: modError } = await admin
          .from('order_item_modifiers')
          .insert(modRows);
        if (modError) throw modError;
      }
    }

    // --- 9. Create Stripe PaymentIntent ---
    let paymentResult: any = null;
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: total,
        currency: 'usd',
        metadata: {
          order_id: order.id,
          order_number: orderNumber,
          user_id: userId,
          store_id: storeId,
        },
        automatic_payment_methods: { enabled: true },
      });

      await admin.from('payments').insert({
        order_id: order.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: total,
        tip_amount: tipAmount,
        status: 'pending',
        method: 'card',
      });

      paymentResult = {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        publishable_key: this.config.get('STRIPE_PUBLISHABLE_KEY'),
      };
    } catch (stripeError: any) {
      // Payment init failed — cancel the order so the user can retry
      await admin
        .from('orders')
        .update({ status: 'cancelled', cancel_reason: 'Payment initialization failed' })
        .eq('id', order.id);

      throw new InternalServerErrorException(
        `Payment initialization failed: ${stripeError.message}`,
      );
    }

    // --- 10. Clear cart ---
    const { data: cart } = await admin
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .single();

    if (cart) {
      await admin.from('cart_items').delete().eq('cart_id', cart.id);
    }

    return {
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        subtotal: order.subtotal,
        tax_amount: order.tax_amount,
        tip_amount: order.tip_amount,
        total: order.total,
        item_count: order.item_count,
        store_name: order.store_name,
        estimated_pickup_at: order.estimated_pickup_at,
        created_at: order.created_at,
      },
      payment: paymentResult,
    };
  }

  // --- Private helpers ---

  private async validateStore(storeId: string) {
    const { data: store } = await this.supabase
      .getAdminClient()
      .from('locations')
      .select('*')
      .eq('id', storeId)
      .eq('is_active', true)
      .single();

    if (!store) {
      throw new BadRequestException('Store not found');
    }

    if (!store.is_accepting_orders) {
      throw new BadRequestException(
        'This location is not currently accepting orders',
      );
    }

    // Check if store is open based on hours
    const now = new Date();
    const dayOfWeek = now.getDay();

    const { data: hours } = await this.supabase
      .getAdminClient()
      .from('location_hours')
      .select('*')
      .eq('location_id', storeId)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (!hours || hours.is_closed) {
      throw new BadRequestException('This location is currently closed');
    }

    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      timeZone: store.timezone,
    });

    if (currentTime < hours.open_time || currentTime > hours.close_time) {
      throw new BadRequestException(
        `This location is closed. Hours: ${hours.open_time} – ${hours.close_time}`,
      );
    }

    return store;
  }

  /**
   * Loads the cart from the database and validates every item.
   * Returns validated items with server-calculated prices.
   */
  private async validateCart(userId: string, storeId: string) {
    const admin = this.supabase.getAdminClient();

    const { data: cart } = await admin
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .eq('store_id', storeId)
      .single();

    if (!cart) {
      throw new BadRequestException('Your cart is empty');
    }

    const { data: cartItems } = await admin
      .from('cart_items')
      .select(`
        id,
        menu_item_id,
        quantity,
        special_instructions,
        cart_item_modifiers(modifier_id)
      `)
      .eq('cart_id', cart.id);

    if (!cartItems || cartItems.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    // Validate each item and calculate prices from the database
    const validatedItems: (ValidatedItem & {
      quantity: number;
      specialInstructions: string | null;
    })[] = [];
    let subtotal = 0;
    let itemCount = 0;

    for (const ci of cartItems) {
      const modIds = (ci.cart_item_modifiers || []).map(
        (m: any) => m.modifier_id,
      );

      const validated = await this.cartValidator.validateItem(
        ci.menu_item_id,
        storeId,
        modIds,
      );

      const lineTotal = validated.unitPrice * ci.quantity;
      subtotal += lineTotal;
      itemCount += ci.quantity;

      validatedItems.push({
        ...validated,
        quantity: ci.quantity,
        specialInstructions: ci.special_instructions,
      });
    }

    return { validatedItems, subtotal, itemCount };
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

  private estimatePickup(prepMinutes: number): string {
    return new Date(Date.now() + prepMinutes * 60 * 1000).toISOString();
  }
}
