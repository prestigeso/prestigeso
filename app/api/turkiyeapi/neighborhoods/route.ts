import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const districtId = searchParams.get('districtId');
    const limit = searchParams.get('limit') || '1000';

    if (!districtId) {
      return NextResponse.json({ status: "ERROR", message: "districtId is required" }, { status: 400 });
    }

    const res = await fetch(`https://turkiyeapi.dev/api/v1/neighborhoods?districtId=${districtId}&limit=${limit}`, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 86400 } // cache for 1 day
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch from turkiyeapi: ${res.status}`);
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Neighborhoods proxy error:', error);
    return NextResponse.json({ status: "ERROR", message: "Failed to fetch neighborhoods" }, { status: 500 });
  }
}
