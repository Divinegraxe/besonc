import {
  ghsToPesewas,
  pesewasToGhs,
  formatGHS,
  ID_PATTERNS,
  isValidCustomerId,
  PaystackChargeProvider,
  PaystackTransferBankCode,
  ServiceCodes,
  CityCodes,
} from './index';

describe('shared-types', () => {
  describe('money conversion', () => {
    it('converts GHS to pesewas', () => {
      expect(ghsToPesewas(1)).toBe(100);
      expect(ghsToPesewas(50.5)).toBe(5050);
      expect(ghsToPesewas(0.5)).toBe(50);
    });

    it('converts pesewas to GHS', () => {
      expect(pesewasToGhs(100)).toBe(1);
      expect(pesewasToGhs(5050)).toBe(50.5);
    });

    it('formats GHS correctly', () => {
      expect(formatGHS(100)).toBe('GHS 1.00');
      expect(formatGHS(123456)).toBe('GHS 1234.56');
    });
  });

  describe('ID validation', () => {
    it('validates customer ID format', () => {
      expect(isValidCustomerId('YDC-2026-000458')).toBe(true);
      expect(isValidCustomerId('YDC-26-458')).toBe(false);
      expect(isValidCustomerId('YDR-2026-0001')).toBe(false);
    });

    it('validates order ID format', () => {
      expect(ID_PATTERNS.order.test('YDO-CC-FO-20260321-0001')).toBe(true);
      expect(ID_PATTERNS.order.test('YDO-AC-PR-20260321-0017')).toBe(true);
      expect(ID_PATTERNS.order.test('YDO-CC-FO-2026-1')).toBe(false);
    });
  });

  describe('Paystack bank codes', () => {
    it('uses lowercase for Charge API', () => {
      expect(PaystackChargeProvider.MTN).toBe('mtn');
      expect(PaystackChargeProvider.VODAFONE).toBe('vod');
      expect(PaystackChargeProvider.AIRTELTIGO).toBe('atl');
    });

    it('uses UPPERCASE for Transfer Recipient API', () => {
      expect(PaystackTransferBankCode.MTN).toBe('MTN');
      expect(PaystackTransferBankCode.VODAFONE).toBe('VOD');
      expect(PaystackTransferBankCode.AIRTELTIGO).toBe('ATL');
    });
  });

  describe('Service and City codes', () => {
    it('has all 8 services', () => {
      expect(Object.keys(ServiceCodes)).toHaveLength(8);
      expect(ServiceCodes.FO).toBe('FO');
      expect(ServiceCodes.ER).toBe('ER');
    });

    it('has all city codes', () => {
      expect(CityCodes.CC).toBe('CC');
      expect(CityCodes.AC).toBe('AC');
    });
  });
});
