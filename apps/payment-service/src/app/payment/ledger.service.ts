import { Injectable, Logger } from '@nestjs/common';
import { LedgerReasonCode, ghsToPesewas, type UserType } from '@besonc/shared-types';
import { randomUUID } from 'node:crypto';

export interface LedgerEntry {
  entryId: string;
  userId: string;
  userType: UserType;
  deltaPesewas: number;
  reason: LedgerReasonCode;
  referenceType?: string;
  referenceId?: string;
  paystackRef?: string;
  createdAt: string;
}

/**
 * Ledger Service — v1 (Cape Coast launch) simple per-user balance + audit log.
 * Per v3.1 plan Section 8.3, double-entry enforced via daily reconciliation.
 * v2 will migrate to a full double-entry ledger.
 */
@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);
  private readonly balances = new Map<string, number>();        // userId -> pesewas
  private readonly entries: LedgerEntry[] = [];

  record(input: {
    userId: string;
    userType: UserType;
    deltaPesewas: number;
    reason: LedgerReasonCode;
    referenceType?: string;
    referenceId?: string;
    paystackRef?: string;
  }): LedgerEntry {
    const entry: LedgerEntry = {
      entryId: randomUUID(),
      userId: input.userId,
      userType: input.userType,
      deltaPesewas: input.deltaPesewas,
      reason: input.reason,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      paystackRef: input.paystackRef,
      createdAt: new Date().toISOString(),
    };
    this.entries.push(entry);
    const current = this.balances.get(input.userId) ?? 0;
    this.balances.set(input.userId, current + input.deltaPesewas);
    this.logger.log(
      `Ledger: ${input.userType}:${input.userId} ${input.deltaPesewas > 0 ? '+' : ''}${input.deltaPesewas / 100} GHS (${input.reason})`,
    );
    return entry;
  }

  getBalance(userId: string): number {
    return this.balances.get(userId) ?? 0;
  }

  getEntriesForUser(userId: string, limit = 50): LedgerEntry[] {
    return this.entries
      .filter((e) => e.userId === userId)
      .slice(-limit)
      .reverse();
  }

  getEntriesForReference(referenceType: string, referenceId: string): LedgerEntry[] {
    return this.entries.filter((e) => e.referenceType === referenceType && e.referenceId === referenceId);
  }

  /** Daily reconciliation: sum all entries, should net to zero (no money created/destroyed). */
  reconcile(): { sum: number; variance: number } {
    const sum = this.entries.reduce((acc, e) => acc + e.deltaPesewas, 0);
    return { sum, variance: sum };
  }
}
