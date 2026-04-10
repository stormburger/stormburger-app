import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { useLocationStore } from '../stores/locationStore';
import { useCartStore } from '../stores/cartStore';
import { colors, typography, spacing, radius, shadow } from '../theme';

export function LocationSelectScreen({ navigation }: any) {
  const { locations, isLoading, error, fetchLocations, selectLocation } = useLocationStore();
  const setLocationId = useCartStore((s) => s.setLocationId);

  useEffect(() => { fetchLocations(); }, []);

  const handleSelect = (location: any) => {
    selectLocation(location);
    setLocationId(location.id);
    navigation.navigate('Menu');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Image source={{ uri: 'https://www.stormburger.com/StormLogo.png' }} style={styles.loadingLogo} resizeMode="contain" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Image source={{ uri: 'https://www.stormburger.com/StormLogo.png' }} style={styles.logo} resizeMode="contain" />
        <Text style={styles.heroTitle}>Pick Your Spot</Text>
        <Text style={styles.heroSubtitle}>Choose a StormBurger location to start your order.</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchLocations}>
            <Text style={styles.retryText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={locations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)} activeOpacity={0.7}>
            <View style={styles.cardLeft}>
              <View style={styles.iconWrap}>
                <Text style={styles.iconText}>📍</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.storeName}>{item.name}</Text>
                <Text style={styles.storeAddress}>{item.address}, {item.city}, {item.state} {item.zip}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: item.is_accepting_orders ? colors.success : colors.error }]} />
                  <Text style={[styles.statusText, { color: item.is_accepting_orders ? colors.success : colors.error }]}>
                    {item.is_accepting_orders ? 'Open Now' : 'Closed'}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingLogo: { width: 120, height: 48, marginBottom: 12 },
  loadingText: { ...typography.caption, color: colors.textMuted },
  hero: { alignItems: 'center', paddingTop: spacing.xxl, paddingBottom: spacing.xl, paddingHorizontal: spacing.xl },
  logo: { width: 160, height: 52, marginBottom: spacing.lg },
  heroTitle: { ...typography.hero, color: colors.text, marginBottom: spacing.sm },
  heroSubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  errorBox: { alignItems: 'center', marginHorizontal: spacing.xl, marginBottom: spacing.lg, padding: spacing.lg, backgroundColor: '#FFF5F5', borderRadius: radius.md, borderWidth: 1, borderColor: '#FEB2B2' },
  errorText: { ...typography.body, color: '#C53030', marginBottom: spacing.sm },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.md },
  retryText: { ...typography.button, color: colors.textInverse },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border, ...shadow.light,
  },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 54, height: 54, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, marginRight: spacing.md },
  iconText: { fontSize: 24 },
  cardInfo: { flex: 1 },
  storeName: { ...typography.h4, color: colors.text, marginBottom: 2 },
  storeAddress: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.xs },
  statusText: { ...typography.small, fontWeight: '600' },
  arrow: { fontSize: 24, color: colors.textMuted, marginLeft: spacing.sm },
});
