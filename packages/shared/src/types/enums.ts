export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  PICKED_UP = 'picked_up',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum ItemCategory {
  BURGERS = 'burgers',
  CHICKEN = 'chicken',
  SIDES = 'sides',
  DRINKS = 'drinks',
  COMBOS = 'combos',
  DESSERTS = 'desserts',
}

export enum ModifierType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
}

export enum UserRole {
  CUSTOMER = 'customer',
  STAFF = 'staff',
  MANAGER = 'manager',
  ADMIN = 'admin',
}
