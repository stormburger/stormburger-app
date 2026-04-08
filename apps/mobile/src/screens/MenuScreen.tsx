import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocationStore } from '../stores/locationStore';
import { useCartStore } from '../stores/cartStore';
import { api } from '../services/api';
import { formatPrice } from '../utils/format';
import { colors, typography, spacing, radius } from '../theme';

interface MenuItemData {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image_url: string | null;
}

const categoryLabels: Record<string, string> = {
  burgers: '🍔 Burgers',
  chicken: '🍗 Chicken',
  combos: '🎉 Combos',
  sides: '🍟 Sides',
  drinks: '🥤 Drinks',
  desserts: '🍦 Desserts',
};

const categoryOrder = ['combos', 'burgers', 'chicken', 'sides', 'drinks', 'desserts'];

export function MenuScreen({ navigation }: any) {
  const location = useLocationStore((s) => s.selectedLocation);
  const itemCount = useCartStore((s) => s.itemCount());
  const [sections, setSections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!location) return;
    loadMenu();
  }, [location]);

  const loadMenu = async () => {
    try {
      const data = await api.getMenuForLocation(location.id);
      const sectionData = categoryOrder
        .filter((cat) => data.categories[cat]?.length > 0)
        .map((cat) => ({
          title: categoryLabels[cat] || cat,
          data: data.categories[cat],
        }));
      setSections(sectionData);
    } catch (err) {
      console.error('Failed to load menu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }: { item: MenuItemData }) => (
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() =>
              navigation.navigate('ItemDetail', {
                itemId: item.id,
                locationId: location.id,
              })
            }
            activeOpacity={0.7}
          >
            {item.image_url && (
              <Image source={{ uri: item.image_url }} style={styles.itemImage} />
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDesc} numberOfLines={2}>
                {item.description}
              </Text>
              <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {itemCount > 0 && (
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => navigation.navigate('Cart')}
        >
          <Text style={styles.cartButtonText}>
            View Cart ({itemCount})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  sectionHeader: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  menuCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemImage: {
    width: 100,
    height: 100,
  },
  itemInfo: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  itemName: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  itemDesc: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  itemPrice: {
    ...typography.price,
    color: colors.primary,
  },
  cartButton: {
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
  cartButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
});
