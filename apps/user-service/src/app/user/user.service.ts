import { Injectable } from '@nestjs/common';
import type { UserType } from '@besonc/shared-types';

interface UserProfile {
  id: string;
  phone: string;
  email?: string;
  name?: string;
  userType: UserType;
  createdAt: string;
  addresses: SavedAddress[];
  kycStatus: 'pending' | 'verified' | 'rejected';
}

interface SavedAddress {
  id: string;
  label: 'Home' | 'Work' | 'Other';
  coordinates: { lat: number; lng: number };
  areaName: string;
  landmark?: string;
  contactPhone: string;
  deliveryInstructions?: string;
}

/**
 * User Service — profiles, addresses, KYC status.
 *
 * Sprint 1-2: in-memory store. Replace with Neon Postgres in Sprint 3.
 * The customer_id format (YDC-YYYY-NNNNNN) is enforced here.
 */
@Injectable()
export class UserService {
  private readonly users = new Map<string, UserProfile>();

  async getById(id: string): Promise<UserProfile | null> {
    return this.users.get(id) ?? null;
  }

  async getByPhone(phone: string): Promise<UserProfile | null> {
    for (const u of this.users.values()) {
      if (u.phone === phone) return u;
    }
    return null;
  }

  async create(input: { phone: string; userType: UserType; name?: string }): Promise<UserProfile> {
    const year = new Date().getFullYear();
    const sequence = String(this.users.size + 1).padStart(6, '0');
    const id = `YDC-${year}-${sequence}`;

    const profile: UserProfile = {
      id,
      phone: input.phone,
      userType: input.userType,
      name: input.name,
      createdAt: new Date().toISOString(),
      addresses: [],
      kycStatus: 'pending',
    };
    this.users.set(id, profile);
    return profile;
  }

  async update(id: string, patch: Partial<UserProfile>): Promise<UserProfile | null> {
    const existing = this.users.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    this.users.set(id, updated);
    return updated;
  }
}
