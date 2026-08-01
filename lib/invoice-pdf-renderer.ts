// The standalone build embeds PDFKit's standard-font metrics. The default Node
// build resolves AFM files from its build-time path, which is invalid after a
// Next.js serverless bundle is deployed.
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import QRCode from "qrcode";
import bwipjs from "bwip-js";

export type InvoicePdfData = {
  invoiceNumber: string; orderNumber: string; invoiceDate: Date; paymentStatus: string; paymentMethod: string;
  customer: { name: string; mobile: string; email: string };
  shippingAddress: string;
  product: { image?: Buffer | null; name: string; metal: string; purity: string; weight: string; quantity: number; ratePaise: bigint; amountPaise: bigint };
  summary: { metalPaise: bigint; servicePaise: bigint; gstPaise: bigint; shippingPaise: bigint; discountPaise: bigint; totalPaise: bigint; couponCode?: string | null };
  company: { name: string; gstin: string; address: string; website: string; supportEmail: string };
  trackingUrl: string;
  gstBilling?: { businessName: string; gstin: string; address: string } | null;
  logo?: Buffer | null;
};

const GOLD = "#B88920", PALE_GOLD = "#FBF4E3", BLACK = "#171717", GREY = "#666666", LINE = "#DED8CC";
const money = (paise: bigint) => `INR ${(Number(paise) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const clean = (value: unknown) => String(value ?? "-").replace(/[\u0000-\u001f\u007f]/g, " ").trim() || "-";
const imageDataUri = (value: Buffer, mime = "image/png") => `data:${mime};base64,${value.toString("base64")}`;
const detectedImageDataUri = (value: Buffer) => imageDataUri(value, value[0] === 0xff && value[1] === 0xd8 ? "image/jpeg" : "image/png");

function labelValue(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width: number) {
  doc.font("Helvetica-Bold").fontSize(7).fillColor(GOLD).text(label.toUpperCase(), x, y, { width, characterSpacing: 0.5 });
  doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(clean(value), x, y + 13, { width, lineGap: 2 });
}

function summaryRow(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width: number, strong = false) {
  doc.font(strong ? "Helvetica-Bold" : "Helvetica").fontSize(strong ? 11 : 9).fillColor(strong ? BLACK : GREY).text(label, x, y, { width: width * 0.55 });
  doc.font(strong ? "Helvetica-Bold" : "Helvetica").fillColor(strong ? GOLD : BLACK).text(value, x + width * 0.55, y, { width: width * 0.45, align: "right" });
}

export async function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const [qrResult, barcodeResult] = await Promise.allSettled([
    QRCode.toBuffer(data.trackingUrl || data.company.website, { type: "png", width: 220, margin: 1, color: { dark: BLACK, light: "#FFFFFF" } }),
    bwipjs.toBuffer({ bcid: "code128", text: clean(data.invoiceNumber), scale: 2, height: 8, includetext: false, backgroundcolor: "FFFFFF", barcolor: "171717" }),
  ]);
  const qr = qrResult.status === "fulfilled" ? qrResult.value : null;
  const barcode = barcodeResult.status === "fulfilled" ? barcodeResult.value : null;
  const doc = new PDFDocument({ size: "A4", margin: 0, info: { Title: data.invoiceNumber, Author: "RateStack", Subject: `Invoice for ${data.orderNumber}` }, compress: true });
  const chunks: Buffer[] = [];
  const completed = new Promise<Buffer>((resolve, reject) => { doc.on("data", chunk => chunks.push(Buffer.from(chunk))); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  const pageWidth = 595.28, margin = 38, content = pageWidth - margin * 2;

  doc.rect(0, 0, pageWidth, 842).fill("#FFFFFF");
  doc.rect(0, 0, 10, 842).fill(GOLD);
  doc.roundedRect(margin, 32, content, 102, 10).fill(BLACK);
  if (data.logo) { try { doc.image(detectedImageDataUri(data.logo), margin + 18, 49, { fit: [90, 48], valign: "center" }); } catch { doc.font("Helvetica-Bold").fontSize(21).fillColor("#F4C95D").text("RateStack", margin + 18, 66); } }
  else doc.font("Helvetica-Bold").fontSize(21).fillColor("#F4C95D").text("RateStack", margin + 18, 66);
  doc.font("Helvetica-Bold").fontSize(22).fillColor("#FFFFFF").text("INVOICE", 330, 49, { width: 190, align: "right", characterSpacing: 1.5 });
  doc.font("Helvetica").fontSize(8).fillColor("#D7D1C6").text(data.invoiceNumber, 330, 79, { width: 190, align: "right" });
  if (barcode) doc.image(imageDataUri(barcode), 385, 96, { fit: [135, 24], align: "right" });
  else doc.font("Helvetica").fontSize(7).fillColor("#D7D1C6").text(clean(data.invoiceNumber), 385, 103, { width: 135, align: "right" });

  const badge = data.paymentStatus.toUpperCase();
  doc.roundedRect(margin, 146, 112, 22, 11).fill(badge === "SUCCESS" ? "#E7F7EE" : PALE_GOLD);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(badge === "SUCCESS" ? "#177245" : "#8A6517").text(`PAYMENT ${badge}`, margin, 153, { width: 112, align: "center" });
  labelValue(doc, "Invoice number", data.invoiceNumber, 170, 146, 150);
  labelValue(doc, "Order number", data.orderNumber, 325, 146, 120);
  labelValue(doc, "Invoice date", data.invoiceDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }), 450, 146, 100);

  doc.roundedRect(margin, 190, content, 86, 8).lineWidth(0.8).strokeColor(LINE).stroke();
  labelValue(doc, "Customer", data.customer.name, margin + 16, 205, 145);
  labelValue(doc, "Mobile", data.customer.mobile, margin + 16, 239, 145);
  labelValue(doc, "Email", data.customer.email, 195, 205, 150);
  labelValue(doc, "Payment method", data.paymentMethod, 195, 239, 150);
  doc.moveTo(365, 201).lineTo(365, 265).strokeColor(LINE).stroke();
  labelValue(doc, "Shipping address", data.shippingAddress, 382, 205, 160);

  doc.font("Helvetica-Bold").fontSize(10).fillColor(BLACK).text("PURCHASE DETAILS", margin, 294, { characterSpacing: 0.7 });
  doc.roundedRect(margin, 313, content, 124, 8).fill("#FCFBF8").strokeColor(LINE).stroke();
  doc.rect(margin, 313, content, 27).fill(BLACK);
  const cols = [margin + 10, margin + 82, margin + 250, margin + 340, margin + 405];
  ["PRODUCT", "DESCRIPTION", "WEIGHT / QTY", "TODAY'S RATE", "AMOUNT"].forEach((heading, index) => doc.font("Helvetica-Bold").fontSize(7).fillColor("#FFFFFF").text(heading, cols[index], 323, { width: index === 1 ? 158 : index === 4 ? 102 : 85, align: index >= 3 ? "right" : "left" }));
  if (data.product.image) { try { doc.image(detectedImageDataUri(data.product.image), margin + 12, 351, { fit: [54, 54], align: "center", valign: "center" }); } catch { doc.roundedRect(margin + 12, 351, 54, 54, 27).fill(PALE_GOLD); } }
  else doc.roundedRect(margin + 12, 351, 54, 54, 27).fill(PALE_GOLD);
  doc.font("Helvetica-Bold").fontSize(10).fillColor(BLACK).text(clean(data.product.name), cols[1], 352, { width: 155 });
  doc.font("Helvetica").fontSize(8).fillColor(GREY).text(`${clean(data.product.metal)} | ${clean(data.product.purity)}`, cols[1], 370, { width: 155 });
  doc.text("Certified coin", cols[1], 385, { width: 155 });
  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLACK).text(`${data.product.weight} x ${data.product.quantity}`, cols[2], 360, { width: 80 });
  doc.font("Helvetica").fontSize(8).fillColor(BLACK).text(`${money(data.product.ratePaise)} / g`, cols[3] - 10, 360, { width: 95, align: "right" });
  doc.font("Helvetica-Bold").fontSize(9).text(money(data.product.amountPaise), cols[4] - 5, 360, { width: 107, align: "right" });

  const summaryY = 458;
  if (data.gstBilling) {
    doc.roundedRect(margin, summaryY, 270, 120, 8).fill(PALE_GOLD);
    labelValue(doc, "GST billing details", data.gstBilling.businessName, margin + 15, summaryY + 15, 240);
    labelValue(doc, "GSTIN", data.gstBilling.gstin, margin + 15, summaryY + 49, 240);
    labelValue(doc, "Billing address", data.gstBilling.address, margin + 15, summaryY + 80, 240);
  } else {
    doc.roundedRect(margin, summaryY, 270, 112, 8).fill("#F7F7F5");
    doc.font("Helvetica-Bold").fontSize(10).fillColor(BLACK).text("ORDER ASSURANCE", margin + 16, summaryY + 18);
    doc.font("Helvetica").fontSize(8.5).fillColor(GREY).text("Certified product details and the immutable price breakup for this order are recorded in this invoice.", margin + 16, summaryY + 40, { width: 238, lineGap: 4 });
  }
  const sx = 335, sw = 222;
  summaryRow(doc, "Metal Value", money(data.summary.metalPaise), sx, summaryY + 2, sw);
  summaryRow(doc, "Making / Service Charges", money(data.summary.servicePaise), sx, summaryY + 20, sw);
  summaryRow(doc, "GST", money(data.summary.gstPaise), sx, summaryY + 38, sw);
  summaryRow(doc, "Shipping", data.summary.shippingPaise === 0n ? "FREE" : money(data.summary.shippingPaise), sx, summaryY + 56, sw);
  summaryRow(doc, data.summary.couponCode ? `Coupon Discount (${data.summary.couponCode})` : "Discount", money(data.summary.discountPaise), sx, summaryY + 74, sw);
  doc.moveTo(sx, summaryY + 94).lineTo(sx + sw, summaryY + 94).strokeColor(GOLD).stroke();
  summaryRow(doc, "GRAND TOTAL", money(data.summary.totalPaise), sx, summaryY + 102, sw, true);

  doc.roundedRect(margin, 594, content, 94, 8).lineWidth(0.8).strokeColor(LINE).stroke();
  if (qr) doc.image(imageDataUri(qr), margin + 13, 607, { fit: [68, 68] });
  else doc.roundedRect(margin + 13, 607, 68, 68, 5).fill(PALE_GOLD);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLACK).text("TRACK YOUR ORDER", margin + 94, 611);
  doc.font("Helvetica").fontSize(8).fillColor(GREY).text("Scan this QR code to open the RateStack order tracking page.", margin + 94, 629, { width: 170, lineGap: 3 });
  doc.moveTo(340, 611).lineTo(340, 673).strokeColor(LINE).stroke();
  doc.font("Helvetica").fontSize(8).fillColor(GREY).text("Authorized Signature", 365, 610, { width: 160, align: "center" });
  doc.font("Helvetica-Oblique").fontSize(18).fillColor(GOLD).text("RateStack", 365, 635, { width: 160, align: "center" });
  doc.moveTo(380, 662).lineTo(510, 662).strokeColor(BLACK).stroke();

  doc.font("Helvetica-Bold").fontSize(9).fillColor(BLACK).text(clean(data.company.name), margin, 713, { width: 260 });
  doc.font("Helvetica").fontSize(7.5).fillColor(GREY).text(`GSTIN: ${clean(data.company.gstin)}\n${clean(data.company.address)}\n${clean(data.company.website)} | ${clean(data.company.supportEmail)}`, margin, 730, { width: 275, lineGap: 2 });
  doc.font("Helvetica-Bold").fontSize(7).fillColor(GOLD).text("TERMS & CONDITIONS", 350, 713, { width: 205 });
  doc.font("Helvetica").fontSize(7).fillColor(GREY).text("Rates and taxes are recorded at purchase. Returns, refunds and delivery are governed by RateStack policies published on the website.", 350, 728, { width: 205, lineGap: 2 });
  doc.moveTo(margin, 785).lineTo(margin + content, 785).strokeColor(LINE).stroke();
  doc.font("Helvetica").fontSize(7).fillColor("#777777").text("This is a computer generated invoice.", margin, 795, { width: content, align: "center" });
  doc.end();
  return completed;
}
