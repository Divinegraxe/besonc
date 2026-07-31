import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { orderApi, type Order } from '../api';
import { useAuth } from '../store/AuthContext';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Orders'>;

function formatGHS(p: number): string { return `GHS ${(p / 100).toFixed(2)}`; }

const STATE_COLORS: Record<string, string> = {
  placed: '#3B82F6',
  vendor_accepted: '#3B82F6',
  preparing: '#F59E0B',
  ready_for_pickup: '#F59E0B',
  rider_assigned: '#F59E0B',
  in_transit: '#8B5CF6',
  delivered: '#16A34A',
  cancelled: '#DC2626',
};

export default function OrdersScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const list = await orderApi.listForCustomer(user.id);
        setOrders(list);
      } catch (e) {
        console.warn('Failed to load orders', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  if (orders.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>Place your first order from the home screen</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
          >
            <View style={styles.cardHead}>
              <Text style={styles.id}>{item.id}</Text>
              <View style={[styles.badge, { backgroundColor: STATE_COLORS[item.state] ?? '#6B7280' }]}>
                <Text style={styles.badgeText}>{item.state.replace(/_/g, ' ')}</Text>
              </View>
            </View>
            <Text style={styles.items}>{item.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</Text>
            <View style={styles.cardFoot}>
              <Text style={styles.total}>{formatGHS(item.grandTotalPesewas)}</Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
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
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  id: { ...typography.small, fontFamily: 'monospace', color: colors.textMuted },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  items: { ...typography.body, marginBottom: spacing.sm },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { ...typography.h3, color: colors.primary, fontWeight: '700' },
  date: { ...typography.caption, color: colors.textMuted },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: { ...typography.h2, marginBottom: spacing.sm },
  emptySubtitle: { ...typography.body, color: colors.textMuted },
});
