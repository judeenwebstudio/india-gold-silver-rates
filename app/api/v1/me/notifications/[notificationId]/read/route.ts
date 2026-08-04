import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateSchemeUserFromRequest } from "@/lib/schemes/user-auth";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ notificationId: string }> }
) {
  try {
    const auth = await authenticateSchemeUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
    }

    const { notificationId } = await context.params;
    if (!notificationId) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "notificationId is required" } }, { status: 400 });
    }

    await prisma.customerNotification.updateMany({
      where: { id: notificationId, customerId: auth.userId },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, data: { read: true, notificationId } });
  } catch (error: any) {
    console.error("PATCH /api/v1/me/notifications/[id]/read error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to mark notification read" } }, { status: 500 });
  }
}
