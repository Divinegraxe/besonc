import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken, loadApiBaseUrlOverride } from '../api/client';
import { authApi } from '../api';

const TOKEN_KEY = '@besonc/token';
const USER_KEY = '@besonc/user';

export interface User {
  id: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  requestOtp: (phone: string) => Promise<{ devOtp?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Load any saved API base URL override (so users can switch backends
        // without rebuilding the app), then restore the session.
        await loadApiBaseUrlOverride();
        const t = await AsyncStorage.getItem(TOKEN_KEY);
        const u = await AsyncStorage.getItem(USER_KEY);
        if (t && u) {
          setToken(t);
          setUser(JSON.parse(u));
          setAuthToken(t);
        }
      } catch (err) {
        console.warn('Auth init failed', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function requestOtp(phone: string) {
    const deviceId = 'mobile-' + Math.random().toString(36).slice(2, 10);
    return authApi.requestOtp(phone, deviceId);
  }

  async function verifyOtp(phone: string, otp: string) {
    const deviceId = 'mobile-' + Math.random().toString(36).slice(2, 10);
    const res = await authApi.verifyOtp(phone, otp, deviceId);
    setToken(res.token);
    const newUser: User = { id: res.userId, phone };
    setUser(newUser);
    setAuthToken(res.token);
    await AsyncStorage.setItem(TOKEN_KEY, res.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
  }

  async function logout() {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, requestOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
