import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, FlatList, Dimensions,
} from 'react-native';
import { useLocationStore } from '../stores/locationStore';
import { useCartStore } from '../stores/cartStore';
import { api } from '../services/api';
import { formatPrice } from '../utils/format';
import { colors, typography, spacing, radius, shadow } from '../theme';

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - spacing.xl * 2 - spacing.md) / 2;

const categoryLabels: Record<string, string> = {
  combos: 'Combos', burgers: 'Burgers', chicken: 'Chicken',
  sides: 'Sides', drinks: 'Drinks', desserts: 'Shakes',
};
const categoryOrder = ['combos', 'burgers', 'chicken', 'sides', 'drinks', 'desserts'];

export function MenuScreen({ navigation }: any) {
  const location = useLocationStore((s) => s.selectedLocation);
  const itemCount = useCartStore((s) => s.itemCount());
  const [categories, setCategories] = useState<Record<string, any[]>>({});
  const [activeCategory, setActiveCategory] = useState('combos');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!location) return;
    api.getMenuForLocation(location.id).then((data: any) => {
      setCategories(data.categories || {});
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [location]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const items = categories[activeCategory] || [];

  return (
    <View style={styles.container}>
      {/* Category tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {categoryOrder.filter(c => categories[c]?.length > 0).map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.tab, activeCategory === cat && styles.tabActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.tabText, activeCategory === cat && styles.tabTextActive]}>
              {categoryLabels[cat] || cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Item grid */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemCard}
            onPress={() => navigation.navigate('ItemDetail', { itemId: item.id, locationId: location.id })}
            activeOpacity={0.7}
          >
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.itemImage} resizeMode="cover" />
            ) : (
              <View style={styles.itemImagePlaceholder}>
                <Text style={styles.placeholderEmoji}>🍔</Text>
              </View>
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              <View style={styles.itemFooter}>
                <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
                <TouchableOpacity style={styles.addBtn}>
                  <Text style={styles.addBtnText}>+ Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Cart badge */}
      {itemCount > 0 && (
        <TouchableOpacity style={styles.cartFloating} onPress={() => navigation.navigate('Cart')}>
          <Text style={styles.cartFloatingText}>View Cart ({itemCount})</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, maxHeight: 52 },
  tabBarContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: colors.textInverse },
  grid: { padding: spacing.xl, paddingBottom: 100 },
  gridRow: { justifyContent: 'space-between' },
  itemCard: {
    width: cardWidth, backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
    overflow: 'hidden', ...shadow.light,
  },
  itemImage: { width: '100%', height: 140 },
  itemImagePlaceholder: { width: '100%', height: 140, backgroundColor: '#EDF2F7', justifyContent: 'center', alignItems: 'center' },
  placeholderEmoji: { fontSize: 40 },
  itemInfo: { padding: spacing.md },
  itemName: { ...typography.h4, color: colors.text, marginBottom: spacing.sm, minHeight: 36 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemPrice: { ...typography.priceSmall, color: colors.text },
  addBtn: { backgroundColor: colors.secondary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm },
  addBtnText: { ...typography.small, color: colors.textInverse, fontWeight: '700' },
  cartFloating: {
    position: 'absolute', bottom: spacing.xl, left: spacing.xl, right: spacing.xl,
    backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md,
    alignItems: 'center', ...shadow.heavy,
  },
  cartFloatingText: { ...typography.button, color: colors.textInverse },
});
