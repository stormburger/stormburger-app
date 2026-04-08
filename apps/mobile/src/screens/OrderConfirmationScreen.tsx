import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatPrice, formatStatus } from '../utils/format';
import { colors, typography, spacing, radius } from '../theme';

export function OrderConfirmationScreen({ route, navigation }: any) {
  const { order } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.checkmark}>✓</Text>
        <Text style={styles.title}>Order Placed!</Text>
        <Text style={styles.orderNumber}>{order.order_number}</Text>

        <View style={styles.detail}>
          <Text style={styles.label}>Total</Text>
          <Text style={styles.value}>{formatPrice(order.total)}</Text>
        </View>

        <View style={styles.detail}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.statusBadge}>
            {formatStatus(order.status)}
          </Text>
        </View>

        {order.estimated_pickup_at && (
          <View style={styles.detail}>
            <Text style={styles.label}>Estimated Pickup</Text>
            <Text style={styles.value}>
              {new Date(order.estimated_pickup_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => navigation.popToTop()}
      >
        <Text style={styles.menuButtonText}>Back to Menu</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  checkmark: {
    fontSize: 48,
    color: colors.success,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  orderNumber: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  detail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  label: { ...typography.body, color: colors.textSecondary },
  value: { ...typography.bodyBold, color: colors.text },
  statusBadge: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  menuButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  menuButtonText: { ...typography.button, color: colors.textInverse },
});
