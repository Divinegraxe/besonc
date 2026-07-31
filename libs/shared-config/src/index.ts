/**
 * BESONC Shared Config
 *
 * Service endpoints, environment-specific URLs, feature flags.
 */

export interface BesoncServiceEndpoints {
  apiGateway: string;
  authService: string;
  userService: string;
  catalogueService: string;
  orderService: string;
  dispatchService: string;
  trackingService: string;
  paymentService: string;
  notificationService: string;
  chatService: string;
  mediaService: string;
  searchService: string;
  pricingService: string;
  adminService: string;
  bffCustomer: string;
  bffVendor: string;
  bffRider: string;
  bffAdmin: string;
}

export const DEV_ENDPOINTS: BesoncServiceEndpoints = {
  apiGateway: 'http://localhost:3000',
  authService: 'http://localhost:3001',
  userService: 'http://localhost:3002',
  catalogueService: 'http://localhost:3003',
  orderService: 'http://localhost:3004',
  dispatchService: 'http://localhost:3005',
  trackingService: 'http://localhost:3006',
  paymentService: 'http://localhost:3007',
  notificationService: 'http://localhost:3008',
  chatService: 'http://localhost:3009',
  mediaService: 'http://localhost:3010',
  searchService: 'http://localhost:3011',
  pricingService: 'http://localhost:3012',
  adminService: 'http://localhost:3013',
  bffCustomer: 'http://localhost:4000',
  bffVendor: 'http://localhost:4001',
  bffRider: 'http://localhost:4002',
  bffAdmin: 'http://localhost:4003',
};

export interface BesoncConfig {
  environment: 'development' | 'staging' | 'production';
  launchCity: 'CC';
  platformName: string;
  supportPhone: string;
  supportEmail: string;
  endpoints: BesoncServiceEndpoints;
  features: {
    cod: boolean;
    prescriptions: boolean;
    marketModeB: boolean;
    multiVendorGroupCart: boolean;
    mlEtaPrediction: boolean;
    globalMatching: boolean;
  };
}

export const CONFIG: BesoncConfig = {
  environment: (process.env['NODE_ENV'] as BesoncConfig['environment']) ?? 'development',
  launchCity: 'CC',
  platformName: 'Besonc',
  supportPhone: '+233 50 000 0000',
  supportEmail: 'support@besonc.gh',
  endpoints: DEV_ENDPOINTS,
  features: {
    cod: true,
    prescriptions: true,
    marketModeB: true,
    multiVendorGroupCart: false, // v2 feature
    mlEtaPrediction: false, // v2 feature
    globalMatching: false, // v2 feature (using competitive matching in v1)
  },
};
