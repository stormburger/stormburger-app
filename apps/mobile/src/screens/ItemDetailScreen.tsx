import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { api } from '../services/api';
import { useCartStore } from '../stores/cartStore';
import { formatPrice } from '../utils/format';
import { colors, typography, spacing, radius } from '../theme';

export function ItemDetailScreen({ route, navigation }: any) {
  const { itemId, locationId } = route.params;
  const [item, setItem] = useState<any>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<
    Record<string, string[]>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    loadItem();
  }, []);

  const loadItem = async () => {
    try {
      const data = await api.getMenuItem(itemId, locationId);
      setItem(data);
      // Set defaults
      const defaults: Record<string, string[]> = {};
      for (const group of data.modifier_groups || []) {
        const defaultMods = group.modifiers
          .filter((m: any) => m.is_default)
          .map((m: any) => m.id);
        if (defaultMods.length > 0) defaults[group.id] = defaultMods;
      }
      setSelectedModifiers(defaults);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleModifier = (groupId: string, modId: string, type: string) => {
    setSelectedModifiers((prev) => {
      const current = prev[groupId] || [];
      if (type === 'single') {
        return { ...prev, [groupId]: [modId] };
      }
      if (current.includes(modId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== modId) };
      }
      return { ...prev, [groupId]: [...current, modId] };
    });
  };

  const calculateTotal = () => {
    if (!item) return 0;
    let total = item.price;
    for (const group of item.modifier_groups || []) {
      for (const mod of group.modifiers) {
        if ((selectedModifiers[group.id] || []).includes(mod.id)) {
          total += mod.price_adjustment;
        }
      }
    }
    return total * quantity;
  };

  const getSelectedModifierIds = () => {
    return Object.values(selectedModifiers).flat();
  };

  const getSelectedModifierNames = () => {
    if (!item) return [];
    const names: string[] = [];
    for (const group of item.modifier_groups || []) {
      for (const mod of group.modifiers) {
        if ((selectedModifiers[group.id] || []).includes(mod.id)) {
          names.push(mod.name);
        }
      }
    }
    return names;
  };

  const handleAddToCart = () => {
    if (!item) return;
    const unitPrice = calculateTotal() / quantity;
    addItem({
      menuItemId: item.id,
      name: item.name,
      quantity,
      unitPrice,
      modifierIds: getSelectedModifierIds(),
      modifierNames: getSelectedModifierNames(),
    });
    navigation.goBack();
  };

  if (isLoading || !item) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {item.image_url && (
          <Image
            source={{ uri: item.image_url }}
            style={[styles.heroImage, { width: screenWidth - spacing.lg * 2, height: (screenWidth - spacing.lg * 2) * 0.65 }]}
            resizeMode="cover"
          />
        )}
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.description}>{item.description}</Text>
        <Text style={styles.basePrice}>{formatPrice(item.price)}</Text>

        {(item.modifier_groups || []).map((group: any) => (
          <View key={group.id} style={styles.modGroup}>
            <View style={styles.modGroupHeader}>
              <Text style={styles.modGroupName}>{group.display_name || group.name}</Text>
              {group.is_required && (
                <Text style={styles.required}>Required</Text>
              )}
            </View>
            <Text style={styles.modGroupHint}>
              {group.type === 'single'
                ? 'Choose one'
                : `Choose up to ${group.max_selections}`}
            </Text>

            {group.modifiers.map((mod: any) => {
              const isSelected = (
                selectedModifiers[group.id] || []
              ).includes(mod.id);
              return (
                <TouchableOpacity
                  key={mod.id}
                  style={[styles.modRow, isSelected && styles.modRowSelected]}
                  onPress={() => toggleModifier(group.id, mod.id, group.type)}
                >
                  <View
                    style={[
                      group.type === 'single'
                        ? styles.radio
                        : styles.checkbox,
                      isSelected && styles.checked,
                    ]}
                  >
                    {isSelected && <View style={styles.checkInner} />}
                  </View>
                  <Text style={styles.modName}>{mod.name}</Text>
                  {mod.price_adjustment > 0 && (
                    <Text style={styles.modPrice}>
                      +{formatPrice(mod.price_adjustment)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Quantity */}
        <View style={styles.quantityRow}>
          <Text style={styles.quantityLabel}>Quantity</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
        <Text style={styles.addButtonText}>
          Add to Cart — {formatPrice(calculateTotal())}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  heroImage: {
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  name: { ...typography.h1, color: colors.text, marginBottom: spacing.sm },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  basePrice: {
    ...typography.price,
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  modGroup: {
    marginBottom: spacing.lg,
  },
  modGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modGroupName: { ...typography.h3, color: colors.text, flex: 1 },
  required: {
    ...typography.small,
    color: colors.secondary,
    fontWeight: '600',
  },
  modGroupHint: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  modRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  modRowSelected: {
    backgroundColor: '#EBF0FF',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checked: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textInverse,
  },
  modName: { ...typography.body, color: colors.text, flex: 1 },
  modPrice: { ...typography.caption, color: colors.textSecondary },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  quantityLabel: { ...typography.bodyBold, color: colors.text },
  quantityControls: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { fontSize: 20, color: colors.textInverse, fontWeight: '700' },
  qtyValue: {
    ...typography.h3,
    color: colors.text,
    marginHorizontal: spacing.lg,
  },
  addButton: {
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
  addButtonText: { ...typography.button, color: colors.textInverse },
});
