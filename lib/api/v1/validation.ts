import { z } from "zod";

const locationSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Location slugs must contain lowercase letters, numbers, and single hyphens only.",
  );

export function validateLocationSlugs(state: string, city: string) {
  return z
    .object({
      state: locationSlugSchema,
      city: locationSlugSchema,
    })
    .safeParse({ state, city });
}
