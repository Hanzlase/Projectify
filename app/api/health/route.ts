import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}

// Ensure this runs on Edge for fastest response
export const runtime = 'edge';
