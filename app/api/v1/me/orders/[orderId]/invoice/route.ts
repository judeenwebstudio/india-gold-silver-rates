import { NextResponse } from "next/server";
import { authenticateSchemeUserFromRequest } from "@/lib/schemes/user-auth";
import { getInvoicePdf, invoicePdfResponse } from "@/lib/invoice-pdf";

export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await authenticateSchemeUserFromRequest(request);
  if (!auth) return NextResponse.json({ success: false, error: { message: "Authentication required." } }, { status: 401 });
  const { orderId } = await context.params;
  const invoice = await getInvoicePdf(orderId, auth.userId);
  if (!invoice) return NextResponse.json({ success: false, error: { message: "Invoice not found." } }, { status: 404 });
  return invoicePdfResponse(invoice, true);
}
