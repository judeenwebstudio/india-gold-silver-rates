import {
  CityRateDataError,
  getCityDisplayRatesByLocation,
} from "@/lib/city-rate-service";
import { v1Error, v1Success } from "@/lib/api/v1/response";
import { serializeCityRates } from "@/lib/api/v1/service";
import { validateLocationSlugs } from "@/lib/api/v1/validation";

export const dynamic = "force-dynamic";

type CityRatesRouteProps = {
  params: Promise<{ state: string; city: string }>;
};

export async function GET(
  _request: Request,
  { params }: CityRatesRouteProps,
) {
  const { state, city } = await params;
  const location = validateLocationSlugs(state, city);

  if (!location.success) {
    return v1Error(
      400,
      "INVALID_LOCATION",
      "State and city must be valid lowercase URL slugs.",
    );
  }

  try {
    const snapshot = await getCityDisplayRatesByLocation(
      location.data.state,
      location.data.city,
    );

    return v1Success(serializeCityRates(snapshot), "rates");
  } catch (error) {
    if (
      error instanceof CityRateDataError &&
      error.message.includes("not found")
    ) {
      return v1Error(
        404,
        "LOCATION_NOT_FOUND",
        "The requested active state and city combination was not found.",
      );
    }

    return v1Error(
      503,
      "RATES_UNAVAILABLE",
      "City rates are temporarily unavailable.",
    );
  }
}
