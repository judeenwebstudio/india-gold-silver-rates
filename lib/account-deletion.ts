import { z } from "zod";

export const deletionRequestSchema = z.object({
  identifier: z.string().trim().min(1).max(254).transform((value) => {
    if (value.includes("@")) return value.toLowerCase();
    const digits = value.replace(/[\s()+-]/g, "");
    return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  }).refine((value) => z.email().safeParse(value).success || /^[6-9]\d{9}$/.test(value),
    "Enter your registered email address or Indian mobile number."),
  website: z.string().max(200).optional().default(""),
}).strict();

export const deletionRequestReceived = "Your request has been received for review. If it matches a RateStack account, our team will contact you using the contact details already registered to that account to verify ownership and confirm deletion. No account has been deleted.";

export function acceptsDeletionOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

export async function readDeletionRequest(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("INVALID_BODY");
  // Bound the actual stream, not just the client-controlled Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_BODY");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); throw new Error("INVALID_BODY"); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } finally { reader.releaseLock(); }
}
