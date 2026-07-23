import { v1Error, v1Success } from "@/lib/api/v1/response";
import { getV1States } from "@/lib/api/v1/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return v1Success(await getV1States(), "locations");
  } catch {
    return v1Error(
      503,
      "LOCATIONS_UNAVAILABLE",
      "States are temporarily unavailable.",
    );
  }
}
