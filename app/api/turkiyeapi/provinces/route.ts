import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://turkiyeapi.dev/api/v1/provinces', {
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
    console.error('Provinces proxy error:', error);
    return NextResponse.json({ status: "ERROR", message: "Failed to fetch provinces" }, { status: 500 });
  }
}
