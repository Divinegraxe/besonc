import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { catalogueApi, orderApi, type Item, type Vendor } from '../api';
import { useAuth } from '../store/AuthContext';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../../App';

// ServiceCode is a union, so we use a const-assertion-safe type guard
// vendor!.category is typed as ServiceCode
type ServiceCodeLocal = 'FO' | 'GR' | 'SH' | 'MK' | 'PH' | 'LD' | 'PR' | 'ER';

type Nav = NativeStackNavigationProp<RootStackParamList, 'VendorMenu'>;
type R = RouteProp<RootStackParamList, 'VendorMenu'>;

function formatGHS(pesewas: number): string {
  return `GHS ${(pesewas / 100).toFixed(2)}`;
}

export default function VendorMenuScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { user } = useAuth();
  const { vendorId, vendorName } = route.params;
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [v, i] = await Promise.all([
          catalogueApi.getVendor(vendorId),
          catalogueApi.getVendorItems(vendorId),
        ]);
        setVendor(v);
        setItems(i);
      } catch (e) {
        console.warn('Failed to load vendor', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [vendorId]);

  async function quickOrder(item: Item) {
    if (!user) return;
    setOrdering(item.id);
    try {
      const itemTotal = item.pricePesewas;
      // Flat Cape Coast distance estimate: 2km average
      const order = await orderApi.create({
        customerId: user.id,
        service: vendor!.category,
        items: [{ itemId: item.id, vendorId: vendor!.id, name: item.name, pricePesewas: item.pricePesewas, quantity: 1 }],
        deliveryAddress: {
          label: 'Home',
          coordinates: { lat: 5.11, lng: -1.24 },
          areaName: 'Cape Coast',
          contactPhone: user.phone,
        },
        paymentMethod: 'cash',
        itemTotalPesewas: itemTotal,
        deliveryFeePesewas: 500,
        serviceFeePesewas: Math.round(itemTotal * 0.05),
        tipPesewas: 0,
        grandTotalPesewas: itemTotal + 500 + Math.round(itemTotal * 0.05),
      });
      navigation.navigate('OrderDetail', { orderId: order.id });
    } catch (e: any) {
      Alert.alert('Order failed', e.message ?? 'Try again');
    } finally {
      setOrdering(null);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          vendor ? (
            <View style={styles.header}>
              <Text style={styles.h1}>{vendor.name}</Text>
              {vendor.description && <Text style={styles.desc}>{vendor.description}</Text>}
              <View style={styles.metaRow}>
                <Text style={styles.rating}>⭐ {vendor.rating.toFixed(1)} ({vendor.reviewCount})</Text>
                <Text style={styles.metaText}>·  {vendor.prepTimeMinutes} min</Text>
                <Text style={styles.metaText}>·  {vendor.address}</Text>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.description && <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>}
              <View style={styles.itemFoot}>
                <Text style={styles.itemPrice}>{formatGHS(item.pricePesewas)}</Text>
                {item.tags?.map((t) => <Text key={t} style={styles.tag}>{t}</Text>)}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.addBtn, ordering === item.id && styles.addBtnDisabled]}
              onPress={() => quickOrder(item)}
              disabled={ordering === item.id}
            >
              {ordering === item.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>Order</Text>}
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.lg, gap: spacing.md },
  header: { marginBottom: spacing.lg },
  h1: { ...typography.h1, marginBottom: spacing.sm },
  desc: { ...typography.body, color: colors.textMuted, marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  rating: { ...typography.small, fontWeight: '600' },
  metaText: { ...typography.small, color: colors.textMuted },
  itemCard: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.lg, flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemName: { ...typography.h3, marginBottom: 4 },
  itemDesc: { ...typography.small, color: colors.textMuted, marginBottom: spacing.sm },
  itemFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemPrice: { ...typography.h3, color: colors.primary, fontWeight: '700' },
  tag: { ...typography.caption, color: colors.textMuted, backgroundColor: colors.bgSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: '#fff', fontWeight: '600' },
});
