import { NextResponse } from 'next/server';
import { processMeetingReminders } from '@/lib/meeting-scheduler';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    // Secure the endpoint using a secret token configured in the environment
    if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
      console.warn('[Cron] Unauthorized attempt to run meeting reminders check.');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('[Cron] Running meeting reminders check...');
    await processMeetingReminders();
    console.log('[Cron] Meeting reminders check complete.');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Error processing meeting reminders:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
