import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { orderApi, paymentApi, type Order } from '../api';
import { useAuth } from '../store/AuthContext';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../../App';

// re-imports below
type _Order = Order;

type R = RouteProp<RootStackParamList, 'OrderDetail'>;

function formatGHS(p: number): string { return `GHS ${(p / 100).toFixed(2)}`; }

const STATE_HINTS: Record<string, string> = {
  placed: 'Waiting for vendor to accept',
  vendor_accepted: 'Vendor is preparing your order',
  preparing: 'Being prepared',
  ready_for_pickup: 'Ready for rider to pick up',
  rider_assigned: 'A rider is on the way to the vendor',
  in_transit: 'On the way to you',
  delivered: 'Delivered!',
  cancelled: 'Cancelled',
};

export default function OrderDetailScreen() {
  const route = useRoute<R>();
  const { user } = useAuth();
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  async function load() {
    try {
      const o = await orderApi.getById(orderId);
      setOrder(o);
    } catch (e) {
      console.warn('Failed to load order', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [orderId]);

  async function payNow() {
    if (!order || !user) return;
    setPaying(true);
    try {
      // Simulate MoMo payment: customer pays via phone number
      await paymentApi.charge({
        orderId: order.id,
        customerId: user.id,
        customerEmail: `${user.phone.replace('+', '')}@besonc.gh`,
        amountPesewas: order.grandTotalPesewas,
        method: 'momo',
        phone: user.phone,
        provider: 'mtn',
      });
      // Mark order paid
      await orderApi.transition(order.id, order.state, { paymentStatus: 'paid' });
      Alert.alert('Payment sent', 'Your MoMo prompt should arrive in a moment.');
      await load();
    } catch (e: any) {
      Alert.alert('Payment failed', e.message ?? 'Try again');
    } finally {
      setPaying(false);
    }
  }

  if (loading || !order) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.state}>{STATE_HINTS[order.state] ?? order.state}</Text>
          <Text style={styles.id}>{order.id}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>Items</Text>
          {order.items.map((i) => (
            <View key={i.itemId} style={styles.itemRow}>
              <Text style={styles.itemQty}>{i.quantity}×</Text>
              <Text style={styles.itemName}>{i.name}</Text>
              <Text style={styles.itemPrice}>{formatGHS(i.pricePesewas * i.quantity)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>Total</Text>
          <View style={styles.row}><Text style={styles.label}>Items</Text><Text style={styles.value}>{formatGHS(order.itemTotalPesewas)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Delivery</Text><Text style={styles.value}>{formatGHS(order.deliveryFeePesewas)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Service</Text><Text style={styles.value}>{formatGHS(order.serviceFeePesewas)}</Text></View>
          <View style={[styles.row, styles.totalRow]}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>{formatGHS(order.grandTotalPesewas)}</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>Payment</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Method</Text>
            <Text style={styles.value}>{order.paymentMethod === 'cash' ? 'Cash on delivery' : order.paymentMethod.toUpperCase()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={[styles.value, order.paymentStatus === 'paid' ? styles.paid : styles.unpaid]}>
              {order.paymentStatus.toUpperCase()}
            </Text>
          </View>
          {order.paymentMethod === 'cash' && order.paymentStatus === 'pending' && (
            <TouchableOpacity
              style={[styles.payBtn, paying && styles.payBtnDisabled]}
              onPress={payNow}
              disabled={paying}
            >
              {paying ? <ActivityIndicator color="#fff" /> : <Text style={styles.payBtnText}>Pay with MoMo</Text>}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md },
  header: { backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.sm },
  state: { color: '#fff', fontSize: 18, fontWeight: '700' },
  id: { color: '#fffCC', fontFamily: 'monospace', fontSize: 12, marginTop: 4 },
  card: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.lg },
  h2: { ...typography.h3, marginBottom: spacing.md },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md },
  itemQty: { ...typography.body, color: colors.textMuted, width: 32 },
  itemName: { ...typography.body, flex: 1 },
  itemPrice: { ...typography.body, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  label: { ...typography.body, color: colors.textMuted },
  value: { ...typography.body },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.md },
  totalLabel: { ...typography.h3 },
  totalValue: { ...typography.h3, color: colors.primary, fontWeight: '700' },
  paid: { color: colors.success, fontWeight: '600' },
  unpaid: { color: colors.warning, fontWeight: '600' },
  payBtn: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: '#fff', fontWeight: '600' },
});
