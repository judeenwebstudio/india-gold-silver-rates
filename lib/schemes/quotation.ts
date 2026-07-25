/**
 * RateStack Savings Scheme Module - Server-Generated Redemption Quotation Engine
 * Calculates itemized metal price, GST, minting, delivery fees, balance deduction, and difference payable.
 * Zero auto-redemption. User acceptance required.
 */

import { prisma } from '@/lib/prisma';
import { calculateMetalValuePaise, calculatePercentagePaise } from './precision';

export interface GenerateQuotationParams {
  enrollmentId: string;
  userId: string;
  denominationId: string;
  collectionMethod: 'SHOWROOM_COLLECTION' | 'HOME_DELIVERY';
  deliveryAddressJson?: Record<string, unknown>;
}

export async function generateRedemptionQuotation(params: GenerateQuotationParams) {
  // 1. Fetch enrollment
  const enrollment = await prisma.schemeEnrollment.findUnique({
    where: { id: params.enrollmentId },
    include: { plan: true },
  });

  if (!enrollment) {
    throw new Error(`Enrollment ${params.enrollmentId} not found`);
  }

  if (enrollment.userId !== params.userId) {
    throw new Error(`Unauthorized enrollment access`);
  }

  if (enrollment.status !== 'MATURED') {
    throw new Error(`Redemption requests can only be initiated for MATURED schemes. Current status: ${enrollment.status}`);
  }

  // 2. Fetch denomination
  const denomination = await prisma.coinProductDenomination.findUnique({
    where: { id: params.denominationId },
  });

  if (!denomination || !denomination.inStock) {
    throw new Error(`Selected coin denomination is unavailable or out of stock`);
  }

  if (denomination.metalType !== enrollment.metalType) {
    throw new Error(`Selected coin category (${denomination.metalType}) does not match scheme category (${enrollment.metalType})`);
  }

  // 3. Fetch prevailing rate from MetalRate table
  const latestRate = await prisma.metalRate.findFirst({
    where: {
      metalType: enrollment.metalType,
      purity: enrollment.purity,
      isActive: true,
    },
    orderBy: { recordedAt: 'desc' },
  });

  if (!latestRate) {
    throw new Error(`No prevailing market rate available for ${enrollment.metalType} ${enrollment.purity}`);
  }

  // Rate in DB pricePerGram is Decimal in INR. Convert to paise per gram:
  const ratePerGramPaise = BigInt(Math.round(Number(latestRate.pricePerGram) * 100));

  // 4. Calculate itemized financials
  const weightMg = denomination.weightMilligrams;
  const metalValuePaise = calculateMetalValuePaise(ratePerGramPaise, weightMg);
  const mintingChargesPaise = denomination.mintingFeePaise;
  const packagingChargesPaise = denomination.packagingFeePaise;
  const deliveryChargesPaise = params.collectionMethod === 'HOME_DELIVERY' ? 25000n : 0n; // ₹250 home delivery charge

  const taxableBasePaise = metalValuePaise + mintingChargesPaise + packagingChargesPaise;
  const gstBasisPoints = 300; // 3% statutory GST on gold/silver coins
  const gstAmountPaise = calculatePercentagePaise(taxableBasePaise, gstBasisPoints);

  const totalGrossValuePaise = taxableBasePaise + gstAmountPaise + deliveryChargesPaise;

  const eligibleBalancePaise = enrollment.eligiblePurchaseBalancePaise;
  const appliedBalancePaise = eligibleBalancePaise > totalGrossValuePaise ? totalGrossValuePaise : eligibleBalancePaise;
  const netDifferencePayablePaise = totalGrossValuePaise - appliedBalancePaise;

  // 5. Create or update RedemptionRequest & RedemptionQuotation
  const now = new Date();
  const validUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes validity
  const quotationNumber = `QT-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  const redemptionRequest = await prisma.$transaction(async (tx) => {
    // Upsert RedemptionRequest
    const existingReq = await tx.redemptionRequest.findFirst({
      where: {
        enrollmentId: params.enrollmentId,
        status: { in: ['REQUESTED', 'QUOTED'] },
      },
    });

    const reqId = existingReq?.id || (await tx.redemptionRequest.create({
      data: {
        enrollmentId: params.enrollmentId,
        userId: params.userId,
        status: 'QUOTED',
        collectionMethod: params.collectionMethod,
        deliveryAddressJson: params.deliveryAddressJson ? (params.deliveryAddressJson as any) : undefined,
      },
    })).id;

    // Create Quotation
    const quote = await tx.redemptionQuotation.upsert({
      where: { redemptionRequestId: reqId },
      create: {
        quotationNumber,
        redemptionRequestId: reqId,
        rateSource: latestRate.source || 'IBJA',
        rateTimestamp: latestRate.recordedAt,
        validUntil,
        ratePerGramPaise,
        selectedWeightMilligrams: weightMg,
        metalValuePaise,
        mintingChargesPaise,
        packagingChargesPaise,
        gstBasisPoints,
        gstAmountPaise,
        deliveryChargesPaise,
        totalGrossValuePaise,
        eligibleBalanceAppliedPaise: appliedBalancePaise,
        netDifferencePayablePaise,
      },
      update: {
        quotationNumber,
        rateSource: latestRate.source || 'IBJA',
        rateTimestamp: latestRate.recordedAt,
        validUntil,
        ratePerGramPaise,
        selectedWeightMilligrams: weightMg,
        metalValuePaise,
        mintingChargesPaise,
        packagingChargesPaise,
        gstBasisPoints,
        gstAmountPaise,
        deliveryChargesPaise,
        totalGrossValuePaise,
        eligibleBalanceAppliedPaise: appliedBalancePaise,
        netDifferencePayablePaise,
        userAccepted: false,
        userAcceptedAt: null,
      },
    });

    await tx.redemptionRequest.update({
      where: { id: reqId },
      data: { status: 'QUOTED' },
    });

    await tx.schemeEnrollment.update({
      where: { id: params.enrollmentId },
      data: { status: 'REDEMPTION_REQUESTED' },
    });

    return { reqId, quote };
  });

  return redemptionRequest;
}
