import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../store/AuthContext';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { requestOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    const cleaned = phone.replace(/\s|-/g, '');
    if (!/^(0|\+233)\d{9}$/.test(cleaned)) {
      Alert.alert('Invalid number', 'Please enter a valid Ghana phone number like 0241234567');
      return;
    }
    setLoading(true);
    try {
      const res = await requestOtp(cleaned.startsWith('0') ? '+233' + cleaned.slice(1) : cleaned);
      // In dev, the OTP may be returned in `devOtp`
      if (res.devOtp) console.log('DEV OTP:', res.devOtp);
      navigation.navigate('Otp', { phone: cleaned.startsWith('0') ? '+233' + cleaned.slice(1) : cleaned });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.brandRow}>
            <View style={styles.logo}><Text style={styles.logoText}>B</Text></View>
            <View>
              <Text style={styles.brandName}>Besonc</Text>
              <Text style={styles.brandCity}>Cape Coast, Ghana</Text>
            </View>
          </View>

          <Text style={styles.h1}>Welcome</Text>
          <Text style={styles.subtitle}>Sign in with your Ghana phone number.</Text>

          <Text style={styles.label}>Phone number</Text>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            placeholder="0241234567"
            value={phone}
            onChangeText={setPhone}
            autoComplete="tel"
            editable={!loading}
          />

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={onSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send code</Text>}
          </TouchableOpacity>

          <Text style={styles.terms}>By continuing you agree to our Terms & Privacy Policy.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
  flex: { flex: 1 },
  content: { flex: 1, padding: spacing.xl, justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xxl, gap: spacing.md },
  logo: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  logoText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  brandName: { ...typography.h2 },
  brandCity: { ...typography.small, color: colors.textMuted },
  h1: { ...typography.h1, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.xl },
  label: { ...typography.label, marginBottom: spacing.sm },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, fontSize: 17, color: colors.text },
  button: { backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.xl },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  terms: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
