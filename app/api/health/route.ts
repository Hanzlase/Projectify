import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}

// Note: Railway uses custom Node.js server, so this runs on Node runtime
// Health checks are fast regardless since no DB calls are made
