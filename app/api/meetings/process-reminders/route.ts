import { NextRequest, NextResponse } from 'next/server';
import { processMeetingReminders } from '@/lib/meeting-scheduler';

// Internal route called by the server.js polling loop. Protected by a shared secret.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret');
  const expectedSecret = process.env.INTERNAL_SCHEDULER_SECRET || 'scheduler-internal';

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await processMeetingReminders();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('process-reminders route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
