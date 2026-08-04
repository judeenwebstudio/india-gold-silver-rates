import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateSchemeUserFromRequest } from "@/lib/schemes/user-auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateSchemeUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
    }

    await prisma.customerNotification.updateMany({
      where: { customerId: auth.userId, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, data: { updatedAll: true } });
  } catch (error: any) {
    console.error("POST /api/v1/me/notifications/read-all error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to mark notifications read" } }, { status: 500 });
  }
}
