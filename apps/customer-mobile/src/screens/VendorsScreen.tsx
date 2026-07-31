import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { catalogueApi, type Vendor } from '../api';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Vendors'>;
type R = RouteProp<RootStackParamList, 'Vendors'>;

function formatGHS(pesewas: number): string {
  return `GHS ${(pesewas / 100).toFixed(2)}`;
}

export default function VendorsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { service } = route.params;
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await catalogueApi.listVendors(service as any);
        setVendors(list);
      } catch (e) {
        console.warn('Failed to load vendors', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [service]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (vendors.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>No vendors open right now</Text>
          <Text style={styles.emptySubtitle}>Check back soon or try another category</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={vendors}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('VendorMenu', { vendorId: item.id, vendorName: item.name })}
          >
            <View style={styles.row}>
              <View style={styles.logoBox}>
                <Text style={styles.logoEmoji}>🍽️</Text>
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.isOpen && <View style={styles.openDot} />}
                </View>
                {item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
                <View style={styles.metaRow}>
                  <Text style={styles.rating}>⭐ {item.rating.toFixed(1)}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>{item.prepTimeMinutes} min</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>{formatGHS(item.minimumOrderPesewas)} min</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  logoBox: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.bgSoft, justifyContent: 'center', alignItems: 'center' },
  logoEmoji: { fontSize: 32 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  name: { ...typography.h3, flex: 1 },
  openDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  desc: { ...typography.small, color: colors.textMuted, marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rating: { ...typography.small, fontWeight: '600' },
  metaDot: { ...typography.small, color: colors.textMuted },
  metaText: { ...typography.small, color: colors.textMuted },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: { ...typography.h2, marginBottom: spacing.sm },
  emptySubtitle: { ...typography.body, color: colors.textMuted },
});
