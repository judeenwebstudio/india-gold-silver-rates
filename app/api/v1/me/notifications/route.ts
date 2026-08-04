import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateSchemeUserFromRequest } from "@/lib/schemes/user-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateSchemeUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
    }

    const items = await prisma.customerNotification.findMany({
      where: { customerId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const notifications = items.map((n) => ({
      id: n.id,
      category: n.category,
      title: n.title,
      message: n.message,
      deepLink: n.deepLink,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data: notifications });
  } catch (error: any) {
    console.error("GET /api/v1/me/notifications error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch notifications" } }, { status: 500 });
  }
}
