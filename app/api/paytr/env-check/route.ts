import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    PAYTR_MERCHANT_ID: !!process.env.PAYTR_MERCHANT_ID,
    PAYTR_MERCHANT_KEY: !!process.env.PAYTR_MERCHANT_KEY,
    PAYTR_MERCHANT_SALT: !!process.env.PAYTR_MERCHANT_SALT,
    PAYTR_TEST_MODE: process.env.PAYTR_TEST_MODE || null,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || null,
  });
}