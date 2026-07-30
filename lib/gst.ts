import { z } from "zod";
export const GSTIN_PATTERN=/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const gstDetailsSchema=z.object({enabled:z.literal(true),businessName:z.string().trim().min(1,"GST registered business name is required.").max(150),billingAddress:z.string().trim().min(1,"GST billing address is required.").max(500),gstNumber:z.string().trim().transform(value=>value.toUpperCase()).refine(value=>GSTIN_PATTERN.test(value),"Enter a valid 15-character GSTIN.")});
export const optionalGstSchema=z.discriminatedUnion("enabled",[z.object({enabled:z.literal(false)}),gstDetailsSchema]).default({enabled:false});
export const normalizeGstNumber=(value:string)=>value.trim().toUpperCase();
