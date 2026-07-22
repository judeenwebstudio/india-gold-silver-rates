import { z } from "zod";

export const adminCredentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address.")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(1, "Password is required.")
    .min(8, "Password must contain at least 8 characters."),
});

export type AdminCredentials = z.infer<typeof adminCredentialsSchema>;
