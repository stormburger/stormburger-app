import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { useCartStore } from '../stores/cartStore';
import { useLocationStore } from '../stores/locationStore';
import { api } from '../services/api';
import { formatPrice } from '../utils/format';
import { colors, typography, spacing, radius } from '../theme';
import uuid from 'react-native-uuid';

const TAX_RATE = 0.0975;

export function CheckoutScreen({ navigation }: any) {
  const { items, subtotal, clearCart, locationId } = useCartStore();
  const location = useLocationStore((s) => s.selectedLocation);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');

  const sub = subtotal();
  const tax = Math.round(sub * TAX_RATE);
  const total = sub + tax;

  const handlePlaceOrder = async () => {
    if (!locationId) {
      Alert.alert('Error', 'No location selected');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create the order
      const order = await api.createOrder({
        location_id: locationId,
        items: items.map((item) => ({
          menu_item_id: item.menuItemId,
          quantity: item.quantity,
          modifier_ids: item.modifierIds,
          special_instructions: item.specialInstructions,
        })),
        special_instructions: specialInstructions || undefined,
        idempotency_key: String(uuid.v4()),
      });

      // 2. Create payment intent
      const { client_secret, publishable_key } =
        await api.createPaymentIntent(order.id);

      // 3. Initialize Stripe payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: client_secret,
        merchantDisplayName: 'StormBurger',
        style: 'automatic',
      });

      if (initError) {
        Alert.alert('Payment Error', initError.message);
        return;
      }

      // 4. Present payment sheet
      const { error: payError } = await presentPaymentSheet();

      if (payError) {
        if (payError.code === 'Canceled') {
          // User cancelled — order still exists but unpaid
          return;
        }
        Alert.alert('Payment Failed', payError.message);
        return;
      }

      // 5. Payment succeeded — clear cart and show confirmation
      clearCart();
      navigation.replace('OrderConfirmation', { order });
    } catch (err: any) {
      Alert.alert('Order Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Pickup Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup Location</Text>
          <View style={styles.card}>
            <Text style={styles.locationName}>{location?.name}</Text>
            <Text style={styles.locationAddress}>
              {location?.address}, {location?.city}
            </Text>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Order Summary ({items.length} items)
          </Text>
          <View style={styles.card}>
            {items.map((item) => (
              <View key={item.id} style={styles.summaryItem}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.summaryQty}>{item.quantity}x</Text>
                  <View>
                    <Text style={styles.summaryName}>{item.name}</Text>
                    {item.modifierNames.length > 0 && (
                      <Text style={styles.summaryMods}>
                        {item.modifierNames.join(', ')}
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={styles.summaryPrice}>
                  {formatPrice(item.unitPrice * item.quantity)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Special Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Instructions</Text>
          <TextInput
            style={styles.instructionsInput}
            placeholder="Any special requests? (optional)"
            placeholderTextColor={colors.textMuted}
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatPrice(sub)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax (9.75%)</Text>
            <Text style={styles.totalValue}>{formatPrice(tax)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatPrice(total)}</Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.placeOrderButton, isSubmitting && styles.disabled]}
        onPress={handlePlaceOrder}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <Text style={styles.placeOrderText}>
            Pay {formatPrice(total)}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.md, paddingBottom: 100 },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  locationName: { ...typography.bodyBold, color: colors.text },
  locationAddress: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  summaryLeft: { flexDirection: 'row', flex: 1 },
  summaryQty: {
    ...typography.bodyBold,
    color: colors.primary,
    marginRight: spacing.sm,
    width: 28,
  },
  summaryName: { ...typography.body, color: colors.text },
  summaryMods: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  summaryPrice: { ...typography.bodyBold, color: colors.text },
  instructionsInput: {
    ...typography.body,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  totals: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  totalLabel: { ...typography.body, color: colors.textSecondary },
  totalValue: { ...typography.body, color: colors.text },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  grandTotalLabel: { ...typography.h3, color: colors.text },
  grandTotalValue: { ...typography.h3, color: colors.primary },
  placeOrderButton: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  disabled: { opacity: 0.6 },
  placeOrderText: { ...typography.button, color: colors.textInverse },
});
