/**
 * RateStack Savings Scheme Module - Merchant & Legal Compliance Guard
 * Ensures merchant parameters and legal/CA approval flags are recorded before permitting plan joining or live payments.
 */

import { prisma } from '@/lib/prisma';

export interface MerchantGuardResult {
  isConfigured: boolean;
  isApproved: boolean;
  legalSellerName?: string;
  gstin?: string;
  missingRequirements: string[];
}

export async function checkMerchantGuard(): Promise<MerchantGuardResult> {
  const config = await prisma.merchantConfig.findUnique({
    where: { id: 'default' },
  });

  const missingRequirements: string[] = [];

  if (!config) {
    return {
      isConfigured: false,
      isApproved: false,
      missingRequirements: ['Merchant configuration record missing'],
    };
  }

  if (!config.legalSellerName || config.legalSellerName.trim() === '') {
    missingRequirements.push('Legal Seller Name missing');
  }

  if (!config.gstin || config.gstin.trim() === '') {
    missingRequirements.push('GSTIN missing');
  }

  if (!config.invoiceIssuer || config.invoiceIssuer.trim() === '') {
    missingRequirements.push('Invoice Issuer entity missing');
  }

  if (!config.coinSupplier || config.coinSupplier.trim() === '') {
    missingRequirements.push('Coin Supplier entity missing');
  }

  if (!config.fulfilmentEntity || config.fulfilmentEntity.trim() === '') {
    missingRequirements.push('Fulfilment Entity missing');
  }

  if (!config.refundLiableEntity || config.refundLiableEntity.trim() === '') {
    missingRequirements.push('Refund Liable Entity missing');
  }

  if (!config.ownerApproved) {
    missingRequirements.push('Owner Approval pending');
  }

  if (!config.caApproved) {
    missingRequirements.push('Chartered Accountant (CA) Approval pending');
  }

  if (!config.legalApproved) {
    missingRequirements.push('Legal Counsel Approval pending');
  }

  const isConfigured = config.legalSellerName && config.gstin ? true : false;
  const isApproved = missingRequirements.length === 0;

  return {
    isConfigured: !!isConfigured,
    isApproved,
    legalSellerName: config.legalSellerName || undefined,
    gstin: config.gstin || undefined,
    missingRequirements,
  };
}

export async function enforceMerchantGuardForLivePayments(): Promise<void> {
  // Allow Sandbox/Dev override only in development node env
  if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_SCHEME_TESTING === 'true') {
    return;
  }

  const guard = await checkMerchantGuard();
  if (!guard.isApproved) {
    throw new Error(
      `Live payment processing and plan enrollment are blocked: ${guard.missingRequirements.join(', ')}`
    );
  }
}
