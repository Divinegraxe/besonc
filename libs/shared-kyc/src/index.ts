/**
 * BESONC Shared KYC Library
 *
 * Smile ID integration for vendor AND rider verification.
 * Per business rules: Ghana Card verification + liveness + AML/PEP screening.
 *
 * https://usesmileid.com/countries/ghana/
 */

const SMILE_ID_BASE = 'https://api.smileid.com/v1';
const SMILE_ID_PARTNER_ID = process.env['SMILE_ID_PARTNER_ID'] ?? '';
const SMILE_ID_API_KEY = process.env['SMILE_ID_API_KEY'] ?? '';

export interface GhanaCardVerificationRequest {
  idNumber: string; // Ghana Card number (GHA-XXXXXXXXX-X)
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  phone?: string;
}

export interface GhanaCardVerificationResponse {
  status: 'verified' | 'not_verified' | 'pending';
  confidence: number;
  matchedFields: {
    firstName: boolean;
    lastName: boolean;
    dob: boolean;
  };
  smileJobId: string;
}

export interface LivenessCheckRequest {
  userId: string;
  images: string[]; // Base64-encoded selfie images
}

export interface LivenessCheckResponse {
  status: 'live' | 'not_live' | 'inconclusive';
  confidence: number;
  smileJobId: string;
}

export interface AmlScreeningRequest {
  fullName: string;
  dob: string;
  country: 'GH';
}

export interface AmlScreeningResponse {
  status: 'clear' | 'flagged' | 'pending';
  pepHit: boolean;
  sanctionsHit: boolean;
  smileJobId: string;
}

/**
 * Verify a Ghana Card.
 * Cost: $0.10-0.30 per check (volume dependent).
 */
export async function verifyGhanaCard(req: GhanaCardVerificationRequest): Promise<GhanaCardVerificationResponse> {
  if (!SMILE_ID_API_KEY) {
    if (process.env['NODE_ENV'] !== 'production') {
      console.log(`[kyc:dev] Ghana Card verify (no-op): ${req.idNumber}`);
      return {
        status: 'verified',
        confidence: 0.99,
        matchedFields: { firstName: true, lastName: true, dob: true },
        smileJobId: 'dev-noop',
      };
    }
    throw new Error('SMILE_ID_API_KEY is required in production');
  }

  const res = await fetch(`${SMILE_ID_BASE}/id_verification`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SMILE_ID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      partner_id: SMILE_ID_PARTNER_ID,
      country: 'GH',
      id_type: 'GHANA_CARD',
      id_number: req.idNumber,
      first_name: req.firstName,
      last_name: req.lastName,
      dob: req.dob,
      phone: req.phone,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Smile ID verification failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<GhanaCardVerificationResponse>;
}

/**
 * Liveness check (face match against ID photo).
 * Cost: $0.30-1.00 per check.
 */
export async function checkLiveness(req: LivenessCheckRequest): Promise<LivenessCheckResponse> {
  if (!SMILE_ID_API_KEY) {
    if (process.env['NODE_ENV'] !== 'production') {
      return { status: 'live', confidence: 0.95, smileJobId: 'dev-noop' };
    }
    throw new Error('SMILE_ID_API_KEY is required in production');
  }

  const res = await fetch(`${SMILE_ID_BASE}/liveness`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SMILE_ID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      partner_id: SMILE_ID_PARTNER_ID,
      user_id: req.userId,
      images: req.images,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Smile ID liveness failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<LivenessCheckResponse>;
}

/**
 * AML/PEP screening.
 * Cost: $0.05+ per screen.
 */
export async function screenAml(req: AmlScreeningRequest): Promise<AmlScreeningResponse> {
  if (!SMILE_ID_API_KEY) {
    if (process.env['NODE_ENV'] !== 'production') {
      return {
        status: 'clear',
        pepHit: false,
        sanctionsHit: false,
        smileJobId: 'dev-noop',
      };
    }
    throw new Error('SMILE_ID_API_KEY is required in production');
  }

  const res = await fetch(`${SMILE_ID_BASE}/aml`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SMILE_ID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      partner_id: SMILE_ID_PARTNER_ID,
      full_name: req.fullName,
      dob: req.dob,
      country: req.country,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Smile ID AML failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<AmlScreeningResponse>;
}

/** Run the full KYC flow for a vendor or rider. */
export async function runFullKyc(
  userId: string,
  ghanaCard: GhanaCardVerificationRequest,
  selfieImages: string[],
): Promise<{
  card: GhanaCardVerificationResponse;
  liveness: LivenessCheckResponse;
  aml: AmlScreeningResponse;
  approved: boolean;
}> {
  const [card, liveness, aml] = await Promise.all([
    verifyGhanaCard(ghanaCard),
    checkLiveness({ userId, images: selfieImages }),
    screenAml({
      fullName: `${ghanaCard.firstName} ${ghanaCard.lastName}`,
      dob: ghanaCard.dob,
      country: 'GH',
    }),
  ]);

  const approved =
    card.status === 'verified' &&
    liveness.status === 'live' &&
    aml.status === 'clear' &&
    !aml.pepHit &&
    !aml.sanctionsHit;

  return { card, liveness, aml, approved };
}
