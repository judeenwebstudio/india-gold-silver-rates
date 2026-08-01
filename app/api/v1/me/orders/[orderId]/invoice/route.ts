import { NextResponse } from "next/server";
import { authenticateSchemeUserFromRequest } from "@/lib/schemes/user-auth";
import { getInvoicePdf, invoicePdfResponse, InvoicePdfError, InvoicePdfGenerationError } from "@/lib/invoice-pdf";

export const runtime = "nodejs";

function logFailure(orderId: string, error: unknown) {
  console.error("invoice_pdf_failure", { route: "/api/v1/me/orders/[orderId]/invoice", orderId, invoiceId: error instanceof InvoicePdfGenerationError ? error.invoiceId : null, pdfStage: error instanceof InvoicePdfGenerationError ? error.stage : "query", errorClass: error instanceof Error ? error.name : "Unknown", errorMessage: error instanceof Error ? error.message : "Unknown invoice error" });
}

export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await authenticateSchemeUserFromRequest(request);
  if (!auth) return NextResponse.json({ success: false, error: { message: "Authentication required." } }, { status: 401 });
  const { orderId } = await context.params;
  try {
    const invoice = await getInvoicePdf(orderId, auth.userId);
    return invoicePdfResponse(invoice, true);
  } catch (error) {
    if (error instanceof InvoicePdfError) return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.code === "NOT_FOUND" ? 404 : 409 });
    logFailure(orderId, error);
    return NextResponse.json({ success: false, error: { message: "Unable to generate invoice PDF." } }, { status: 500 });
  }
}
