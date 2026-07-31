import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../store/AuthContext';
import { colors, spacing, radius, typography } from '../theme';
import { getApiBaseUrl, setApiBaseUrl } from '../api/client';
import type { RootStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { requestOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  // Backend URL override (dev only). Visible when __DEV__ is true.
  const [backendUrl, setBackendUrl] = useState<string>('');
  const [showBackend, setShowBackend] = useState(false);

  useEffect(() => {
    setBackendUrl(getApiBaseUrl());
  }, []);

  async function onSubmit() {
    const cleaned = phone.replace(/\s|-/g, '');
    if (!/^(0|\+233)\d{9}$/.test(cleaned)) {
      Alert.alert('Invalid number', 'Please enter a valid Ghana phone number like 0241234567');
      return;
    }
    if (backendUrl && backendUrl !== getApiBaseUrl()) {
      await setApiBaseUrl(backendUrl);
    }
    setLoading(true);
    try {
      const res = await requestOtp(cleaned.startsWith('0') ? '+233' + cleaned.slice(1) : cleaned);
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

          {__DEV__ && (
            <View style={styles.devBox}>
              <TouchableOpacity onPress={() => setShowBackend((v) => !v)}>
                <Text style={styles.devHeader}>{showBackend ? '▾' : '▸'} Dev: Backend URL</Text>
              </TouchableOpacity>
              {showBackend && (
                <>
                  <Text style={styles.devNote}>
                    Current: {getApiBaseUrl()}{'\n'}
                    For a physical iPhone, set this to your Mac's LAN IP
                    (e.g. http://192.168.1.42:3000).
                  </Text>
                  <TextInput
                    style={styles.devInput}
                    value={backendUrl}
                    onChangeText={setBackendUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="http://192.168.1.42:3000"
                    placeholderTextColor={colors.textMuted}
                  />
                </>
              )}
            </View>
          )}
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
  devBox: { marginTop: spacing.xl, padding: spacing.md, backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  devHeader: { ...typography.label, color: colors.primary },
  devNote: { ...typography.small, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 18 },
  devInput: { marginTop: spacing.sm, backgroundColor: colors.bgSoft, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.md, color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
