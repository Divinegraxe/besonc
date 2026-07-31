// Local type definitions for the Customer mobile app.
// In v2, we can use the shared-types workspace package.

export type CityCode = 'CC' | 'AC' | 'KS' | 'TK' | 'TM';
export type ServiceCode = 'FO' | 'GR' | 'SH' | 'MK' | 'PH' | 'LD' | 'PR' | 'ER';
export const ServiceCodes = { FO: 'FO', GR: 'GR', SH: 'SH', MK: 'MK', PH: 'PH', LD: 'LD', PR: 'PR', ER: 'ER' } as const;
export const ServiceNames: Record<ServiceCode, string> = {
  FO: 'Food', GR: 'Groceries', SH: 'Shop', MK: 'Market', PH: 'Pharmacy & Health',
  LD: 'Laundry', PR: 'Parcel & Courier', ER: 'Errands & Personal Assistant',
};
export type UserType = 'customer' | 'vendor' | 'rider' | 'admin';
