import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocationStore } from '../stores/locationStore';
import { useCartStore } from '../stores/cartStore';
import { colors, typography, spacing, radius } from '../theme';

export function LocationSelectScreen({ navigation }: any) {
  const { locations, isLoading, error, fetchLocations, selectLocation } =
    useLocationStore();
  const setLocationId = useCartStore((s) => s.setLocationId);

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleSelect = (location: any) => {
    selectLocation(location);
    setLocationId(location.id);
    navigation.navigate('Menu');
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
      <View style={styles.header}>
        <Text style={styles.logo}>STORM</Text>
        <Text style={styles.logoAccent}>BURGER</Text>
      </View>
      <Text style={styles.subtitle}>Choose your location</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Couldn't load stores</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchLocations}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={locations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleSelect(item)}
            activeOpacity={0.7}
          >
            <View style={styles.cardContent}>
              <Text style={styles.locationName}>{item.name}</Text>
              <Text style={styles.locationAddress}>
                {item.address}, {item.city}, {item.state} {item.zip}
              </Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: item.is_accepting_orders
                        ? colors.success
                        : colors.error,
                    },
                  ]}
                />
                <Text style={styles.statusText}>
                  {item.is_accepting_orders ? 'Open' : 'Closed'}
                </Text>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.sm,
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary,
  },
  logoAccent: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.secondary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  list: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    flex: 1,
  },
  locationName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  locationAddress: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  arrow: {
    fontSize: 28,
    color: colors.textMuted,
    marginLeft: spacing.md,
  },
  errorContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.h3,
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  errorDetail: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  retryText: {
    ...typography.button,
    color: colors.textInverse,
  },
});
