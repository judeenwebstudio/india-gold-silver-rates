import {
  getLatestNationalBaseRates,
} from "@/lib/city-rate-service";
import { v1Error, v1Success } from "@/lib/api/v1/response";
import {
  getV1FeaturedCities,
  serializeNationalRates,
} from "@/lib/api/v1/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [snapshot, featured] = await Promise.all([
      getLatestNationalBaseRates(),
      getV1FeaturedCities(),
    ]);

    return v1Success(
      {
        ...serializeNationalRates(snapshot),
        featuredCities: featured,
      },
      "rates",
    );
  } catch {
    return v1Error(
      503,
      "RATES_UNAVAILABLE",
      "Latest rates are temporarily unavailable.",
    );
  }
}
