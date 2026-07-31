import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../store/AuthContext';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../../App';
import type { ServiceCode } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const services: { code: ServiceCode; name: string; emoji: string; description: string }[] = [
  { code: 'FO', name: 'Food', emoji: '🍲', description: 'Restaurants, chop bars, fast food' },
  { code: 'GR', name: 'Groceries', emoji: '🛒', description: 'Daily household shopping' },
  { code: 'SH', name: 'Shop', emoji: '🛍️', description: 'Phones, fashion, beauty' },
  { code: 'MK', name: 'Market', emoji: '🥬', description: 'Fresh from the market' },
  { code: 'PH', name: 'Pharmacy', emoji: '💊', description: 'Licensed pharmacies' },
  { code: 'LD', name: 'Laundry', emoji: '👔', description: 'Pickup & delivery' },
  { code: 'PR', name: 'Parcel', emoji: '📦', description: 'Send anything, anywhere' },
  { code: 'ER', name: 'Errands', emoji: '🏃', description: 'We do it for you' },
];

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, {user?.phone}</Text>
            <Text style={styles.subtext}>Cape Coast</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.phone ?? '+').slice(-2)}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.h1}>What do you need?</Text>
        <View style={styles.grid}>
          {services.map((s) => (
            <TouchableOpacity
              key={s.code}
              style={styles.tile}
              onPress={() => navigation.navigate('Vendors', { service: s.code, serviceName: s.name })}
            >
              <Text style={styles.emoji}>{s.emoji}</Text>
              <Text style={styles.tileName}>{s.name}</Text>
              <Text style={styles.tileDesc} numberOfLines={2}>{s.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.ordersRow} onPress={() => navigation.navigate('Orders')}>
          <View>
            <Text style={styles.ordersTitle}>Your orders</Text>
            <Text style={styles.ordersSubtitle}>View past and current orders</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  greeting: { ...typography.h2 },
  subtext: { ...typography.small, color: colors.textMuted },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  h1: { ...typography.h1, marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { width: '47%', backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'flex-start' },
  emoji: { fontSize: 32, marginBottom: spacing.sm },
  tileName: { ...typography.h3, marginBottom: spacing.xs },
  tileDesc: { ...typography.caption, color: colors.textMuted },
  ordersRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.xl },
  ordersTitle: { ...typography.h3 },
  ordersSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  chev: { fontSize: 28, color: colors.textMuted },
});
