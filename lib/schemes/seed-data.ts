/**
 * RateStack Savings Scheme Module - Seeder
 * Populates default plans, coin denominations, and merchant configuration placeholder.
 */

import { prisma } from '@/lib/prisma';
import { inrToPaise, gramsToMilligrams } from './precision';

export async function seedSchemeData() {
  // 1. Ensure MerchantConfig exists
  const merchantConfig = await prisma.merchantConfig.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      legalSellerName: 'RateStack Jewellery & Coins India Private Limited',
      gstin: '27AAAAA0000A1Z5',
      invoiceIssuer: 'RateStack Operations Hub',
      coinSupplier: 'RateStack Minting & Refinery Partners',
      fulfilmentEntity: 'RateStack Logistics & Retail Outlets',
      refundLiableEntity: 'RateStack Savings Escrow Account',
      ownerApproved: false,
      caApproved: false,
      legalApproved: false,
    },
    update: {},
  });

  // 2. Default Plans
  // Plan A: 22K (916) Gold Coin Savings Scheme - 12 Months
  const gold12 = await prisma.schemePlan.upsert({
    where: { id: 'plan-gold-22k-12m' },
    create: {
      id: 'plan-gold-22k-12m',
      name: '22K Gold Coin Savings Scheme (12 Months)',
      metalType: 'GOLD',
      purity: 'K22',
      tenureMonths: 12,
      minMonthlyAmountPaise: inrToPaise(200),
      maxMonthlyAmountPaise: inrToPaise(100000),
      presetAmountsJson: [20000, 50000, 100000, 200000, 500000], // in paise (₹200, ₹500, ₹1000, ₹2000, ₹5000)
      gracePeriodDays: 7,
      termsVersion: 'v1.0-2026',
      termsContent: 'Official RateStack 22K Gold Coin Savings Scheme Terms & Conditions.',
      kycRequired: false,
      visibility: true,
      isActive: true,
      version: 1,
    },
    update: {},
  });

  // Plan B: Silver 999 Coin Savings Scheme - 12 Months
  const silver12 = await prisma.schemePlan.upsert({
    where: { id: 'plan-silver-999-12m' },
    create: {
      id: 'plan-silver-999-12m',
      name: 'Silver 999 Coin Savings Scheme (12 Months)',
      metalType: 'SILVER',
      purity: 'P999',
      tenureMonths: 12,
      minMonthlyAmountPaise: inrToPaise(200),
      maxMonthlyAmountPaise: inrToPaise(50000),
      presetAmountsJson: [20000, 50000, 100000, 200000, 500000],
      gracePeriodDays: 7,
      termsVersion: 'v1.0-2026',
      termsContent: 'Official RateStack Silver 999 Coin Savings Scheme Terms & Conditions.',
      kycRequired: false,
      visibility: true,
      isActive: true,
      version: 1,
    },
    update: {},
  });

  // 3. Coin Denominations for 22K Gold
  const goldDenominations = [
    { weightGrams: 0.5, title: '0.5 Gram 22K Gold Coin (916 Hallmarked)', mintingFee: 150 },
    { weightGrams: 1.0, title: '1 Gram 22K Gold Coin (916 Hallmarked)', mintingFee: 200 },
    { weightGrams: 2.0, title: '2 Gram 22K Gold Coin (916 Hallmarked)', mintingFee: 300 },
    { weightGrams: 4.0, title: '4 Gram 22K Gold Coin (916 Hallmarked)', mintingFee: 450 },
    { weightGrams: 8.0, title: '8 Gram 22K Gold Coin (916 Hallmarked)', mintingFee: 600 },
    { weightGrams: 10.0, title: '10 Gram 22K Gold Coin (916 Hallmarked)', mintingFee: 750 },
    { weightGrams: 20.0, title: '20 Gram 22K Gold Coin (916 Hallmarked)', mintingFee: 1200 },
    { weightGrams: 50.0, title: '50 Gram 22K Gold Coin (916 Hallmarked)', mintingFee: 2500 },
  ];

  for (const item of goldDenominations) {
    const denomId = `denom-gold-${item.weightGrams}g`;
    await prisma.coinProductDenomination.upsert({
      where: { id: denomId },
      create: {
        id: denomId,
        planId: gold12.id,
        metalType: 'GOLD',
        purity: 'K22',
        weightMilligrams: gramsToMilligrams(item.weightGrams),
        title: item.title,
        mintingFeePaise: inrToPaise(item.mintingFee),
        packagingFeePaise: inrToPaise(50),
        inStock: true,
      },
      update: {},
    });
  }

  // 4. Coin Denominations for Silver 999
  const silverDenominations = [
    { weightGrams: 10.0, title: '10 Gram Silver 999 Coin', mintingFee: 40 },
    { weightGrams: 20.0, title: '20 Gram Silver 999 Coin', mintingFee: 60 },
    { weightGrams: 50.0, title: '50 Gram Silver 999 Coin', mintingFee: 100 },
    { weightGrams: 100.0, title: '100 Gram Silver 999 Bar/Coin', mintingFee: 180 },
    { weightGrams: 250.0, title: '250 Gram Silver 999 Bar/Coin', mintingFee: 350 },
    { weightGrams: 500.0, title: '500 Gram Silver 999 Bar/Coin', mintingFee: 600 },
    { weightGrams: 1000.0, title: '1000 Gram (1 kg) Silver 999 Bar', mintingFee: 1000 },
  ];

  for (const item of silverDenominations) {
    const denomId = `denom-silver-${item.weightGrams}g`;
    await prisma.coinProductDenomination.upsert({
      where: { id: denomId },
      create: {
        id: denomId,
        planId: silver12.id,
        metalType: 'SILVER',
        purity: 'P999',
        weightMilligrams: gramsToMilligrams(item.weightGrams),
        title: item.title,
        mintingFeePaise: inrToPaise(item.mintingFee),
        packagingFeePaise: inrToPaise(30),
        inStock: true,
      },
      update: {},
    });
  }

  return { merchantConfig, gold12, silver12 };
}
