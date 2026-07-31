import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext';
import { colors, spacing, radius, typography } from '../theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.phone ?? '+').slice(-2)}</Text>
          </View>
          <Text style={styles.phone}>{user?.phone}</Text>
          <Text style={styles.id}>{user?.id}</Text>
        </View>

        <View style={styles.section}>
          <Row label="Customer ID" value={user?.id ?? '—'} />
          <Row label="Phone" value={user?.phone ?? '—'} />
          <Row label="Launch city" value="Cape Coast (CC)" />
          <Row label="KYC status" value="Pending" />
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() =>
            Alert.alert('Sign out?', 'You can sign back in any time.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: logout },
            ])
          }
        >
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>BESONC v0.1.0 — Cape Coast</Text>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
  content: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  profileHeader: { alignItems: 'center', padding: spacing.xl, backgroundColor: colors.bg, borderRadius: radius.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  phone: { ...typography.h2, marginBottom: 4 },
  id: { ...typography.caption, fontFamily: 'monospace', color: colors.textMuted },
  section: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLabel: { ...typography.body, color: colors.textMuted },
  rowValue: { ...typography.body, fontWeight: '500' },
  logoutBtn: { padding: spacing.lg, backgroundColor: colors.bg, borderRadius: radius.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.error },
  logoutText: { ...typography.body, color: colors.error, fontWeight: '600' },
  version: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: 'auto' },
});
