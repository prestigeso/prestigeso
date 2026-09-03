import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { RefundError, refundOrder } from "@/lib/paytr/refundOrder";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdminRequest(req))) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = (await req.json()) as {
      orderId?: unknown;
      newStatus?: unknown;
    };
    const orderId = Number(body.orderId);
    const newStatus = body.newStatus;
    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return NextResponse.json(
        { error: "Geçersiz sipariş numarası." },
        { status: 400 },
      );
    }
    if (newStatus !== "İptal Edildi" && newStatus !== "İade Edildi") {
      return NextResponse.json(
        { error: "Geçersiz iade durumu." },
        { status: 400 },
      );
    }

    const result = await refundOrder({ orderId, newStatus });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const status = error instanceof RefundError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "İade işlemi başarısız.";
    console.error("Refund error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
