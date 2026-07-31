import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../store/AuthContext';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Otp'>;
type R = RouteProp<RootStackParamList, 'Otp'>;

export default function OtpScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { verifyOtp } = useAuth();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (otp.length !== 6) {
      Alert.alert('Invalid code', 'OTP must be 6 digits');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(route.params.phone, otp);
      // Root will auto-switch to Home
    } catch (e: any) {
      Alert.alert('Wrong code', e.message ?? 'Try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.h1}>Enter your code</Text>
        <Text style={styles.subtitle}>We sent a 6-digit code to {route.params.phone}.</Text>

        <Text style={styles.label}>6-digit code</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="123456"
          value={otp}
          onChangeText={(v) => setOtp(v.replace(/\D/g, ''))}
          editable={!loading}
        />

        <TouchableOpacity style={[styles.button, (loading || otp.length !== 6) && styles.buttonDisabled]} onPress={onSubmit} disabled={loading || otp.length !== 6}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backText}>Use a different number</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: spacing.xl, justifyContent: 'center' },
  h1: { ...typography.h1, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.xl },
  label: { ...typography.label, marginBottom: spacing.sm },
  input: { backgroundColor: colors.bgSoft, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, fontSize: 22, letterSpacing: 6, textAlign: 'center', color: colors.text },
  button: { backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.xl },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backLink: { marginTop: spacing.xl, alignItems: 'center' },
  backText: { color: colors.primary, ...typography.body },
});
