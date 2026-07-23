import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  const path = req.nextUrl.searchParams.get("path") || "";
  if (!path.startsWith("returns/") || path.includes("..") || path.length > 500)
    return NextResponse.json({ error: "Geçersiz dosya yolu." }, { status: 400 });
  const { data, error } = await supabaseAdmin.storage
    .from("return-evidence")
    .createSignedUrl(path, 60);
  if (error || !data?.signedUrl)
    return NextResponse.json({ error: "Görsel açılamadı." }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
