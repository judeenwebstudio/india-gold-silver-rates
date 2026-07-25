import { NextResponse } from 'next/server';
import { authenticateSchemeUserFromRequest } from '@/lib/schemes/user-auth';
import { generateRedemptionQuotation } from '@/lib/schemes/quotation';
import { paiseToInrNumber, milligramsToGrams } from '@/lib/schemes/precision';
import { z } from 'zod';

const quotationSchema = z.object({
  denominationId: z.string().min(1, 'Coin denomination selection is required'),
  collectionMethod: z.enum(['SHOWROOM_COLLECTION', 'HOME_DELIVERY']).default('SHOWROOM_COLLECTION'),
  deliveryAddressJson: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ enrollmentId: string }> }
) {
  try {
    const { enrollmentId } = await context.params;

    const authUser = await authenticateSchemeUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = quotationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const { reqId, quote } = await generateRedemptionQuotation({
      enrollmentId,
      userId: authUser.userId,
      denominationId: parsed.data.denominationId,
      collectionMethod: parsed.data.collectionMethod,
      deliveryAddressJson: parsed.data.deliveryAddressJson,
    });

    return NextResponse.json({
      success: true,
      data: {
        redemptionRequestId: reqId,
        quotationNumber: quote.quotationNumber,
        rateSource: quote.rateSource,
        rateTimestamp: quote.rateTimestamp,
        validUntil: quote.validUntil,
        ratePerGram: paiseToInrNumber(quote.ratePerGramPaise),
        selectedWeightGrams: milligramsToGrams(quote.selectedWeightMilligrams),
        metalValue: paiseToInrNumber(quote.metalValuePaise),
        mintingCharges: paiseToInrNumber(quote.mintingChargesPaise),
        packagingCharges: paiseToInrNumber(quote.packagingChargesPaise),
        gstRatePercent: quote.gstBasisPoints / 100,
        gstAmount: paiseToInrNumber(quote.gstAmountPaise),
        deliveryCharges: paiseToInrNumber(quote.deliveryChargesPaise),
        totalGrossValue: paiseToInrNumber(quote.totalGrossValuePaise),
        schemePurchaseBalanceApplied: paiseToInrNumber(quote.eligibleBalanceAppliedPaise),
        netDifferencePayable: paiseToInrNumber(quote.netDifferencePayablePaise),
        userAccepted: quote.userAccepted,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to generate quotation' } },
      { status: 500 }
    );
  }
}
