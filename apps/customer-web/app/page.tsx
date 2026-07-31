'use client';

import { useState } from 'react';
import { CONFIG } from '@besonc/shared-config';
import { ServiceCodes, ServiceNames } from '@besonc/shared-types';
import { BesoncApiClient } from '@besonc/shared-api-client';
import { formatGHS, isValidGhanaPhone, normalizeGhanaPhone } from '@besonc/shared-utils';

const apiClient = new BesoncApiClient({
  baseUrl: typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' ? 'http://localhost:3000' : '')
    : '',
});

export default function HomePage() {
  const [step, setStep] = useState<'phone' | 'otp' | 'home'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestOtp() {
    setError(null);
    if (!isValidGhanaPhone(phone)) {
      setError('Please enter a valid Ghana phone number (e.g. 0241234567)');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post<{ devOtp?: string }>('/api/v1/bff/customer/auth/otp', {
        phone: normalizeGhanaPhone(phone),
        deviceId: 'web-' + Math.random().toString(36).slice(2, 10),
      });
      if (res?.devOtp) setDevOtp(res.devOtp);
      setStep('otp');
    } catch (e) {
      setError('Network error: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.post<{ token: string; userId: string }>('/api/v1/bff/customer/auth/verify', {
        phone: normalizeGhanaPhone(phone),
        otp,
        deviceId: 'web-' + Math.random().toString(36).slice(2, 10),
      });
      if (!res?.token) {
        setError('Invalid OTP');
        return;
      }
      setToken(res.token);
      setUserId(res.userId);
      setStep('home');
    } catch (e) {
      setError('Network error: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (step === 'home') {
    return (
      <div className="container">
        <div className="brand">
          <div className="brand-mark">B</div>
          <div>
            <div className="brand-name">Besonc</div>
            <div className="brand-city">Cape Coast, Ghana</div>
          </div>
        </div>

        <div className="card">
          <h1>You are in! 🛵</h1>
          <p>Signed in as <strong>{userId}</strong></p>
          <p style={{ fontSize: 13, fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>
            Token: {token?.slice(0, 40)}...
          </p>
        </div>

        <h2>What would you like?</h2>
        <div className="service-grid">
          {Object.entries(ServiceNames).map(([code, name]) => (
            <div className="service-tile" key={code}>
              <div className="service-tile-icon">{getEmoji(code as keyof typeof ServiceCodes)}</div>
              <div className="service-tile-name">{name}</div>
            </div>
          ))}
        </div>

        <p className="hint" style={{ marginTop: 32 }}>
          <strong>8 services, locked.</strong> No others are planned or in scope.
        </p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="brand">
        <div className="brand-mark">B</div>
        <div>
          <div className="brand-name">Besonc</div>
          <div className="brand-city">Cape Coast, Ghana</div>
        </div>
      </div>

      {step === 'phone' && (
        <div className="card">
          <h1>Welcome to Besonc</h1>
          <p>Sign in with your Ghana phone number. We'll send you a 6-digit code.</p>
          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            placeholder="0241234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            data-testid="phone-input"
          />
          {error && <div className="error">{error}</div>}
          <button onClick={requestOtp} disabled={loading} data-testid="request-otp-button">
            {loading ? 'Sending...' : 'Send code'}
          </button>
          <p className="hint">By continuing you agree to our Terms & Privacy Policy.</p>
        </div>
      )}

      {step === 'otp' && (
        <div className="card">
          <h1>Enter your code</h1>
          <p>We sent a 6-digit code to <strong>{phone}</strong>.</p>
          <label htmlFor="otp">6-digit code</label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            data-testid="otp-input"
          />
          {error && <div className="error">{error}</div>}
          {devOtp && (
            <div className="dev-otp" data-testid="dev-otp">
              DEV ONLY — Your OTP is: <strong>{devOtp}</strong>
              <br />
              <small>(real SMS would be sent in production)</small>
            </div>
          )}
          <button onClick={verifyOtp} disabled={loading || otp.length !== 6} data-testid="verify-otp-button">
            {loading ? 'Verifying...' : 'Continue'}
          </button>
          <p className="hint">
            <a onClick={() => setStep('phone')} style={{ cursor: 'pointer' }}>Use a different number</a>
          </p>
        </div>
      )}
    </div>
  );
}

function getEmoji(code: keyof typeof ServiceCodes): string {
  const map: Record<keyof typeof ServiceCodes, string> = {
    FO: '🍲',
    GR: '🛒',
    SH: '🛍️',
    MK: '🥬',
    PH: '💊',
    LD: '👔',
    PR: '📦',
    ER: '🏃',
  };
  return map[code];
}
