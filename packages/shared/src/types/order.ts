import { OrderStatus, PaymentStatus } from './enums';

export interface Order {
  id: string;
  order_number: string;       // Human-readable: SB-001, SB-002
  user_id: string;
  location_id: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  estimated_pickup_at: string | null;
  special_instructions: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions: string | null;
  menu_item_name: string;     // Denormalized for history
}

export interface OrderItemModifier {
  id: string;
  order_item_id: string;
  modifier_id: string;
  modifier_name: string;      // Denormalized
  price_adjustment: number;
}

export interface Payment {
  id: string;
  order_id: string;
  stripe_payment_intent_id: string;
  amount: number;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderRequest {
  location_id: string;
  items: CreateOrderItem[];
  special_instructions?: string;
  idempotency_key: string;
}

export interface CreateOrderItem {
  menu_item_id: string;
  quantity: number;
  modifier_ids: string[];
  special_instructions?: string;
}
