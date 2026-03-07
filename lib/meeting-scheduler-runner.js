// Polls the meeting reminder API route on a fixed interval.
// Uses fetch so Prisma runs inside the Next.js runtime, not in this CommonJS file.

const POLL_INTERVAL_MS = 60000;
let baseUrl = null;

async function pollReminders() {
  if (!baseUrl) return;
  try {
    const res = await fetch(`${baseUrl}/api/meetings/process-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_SCHEDULER_SECRET || 'scheduler-internal',
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`Meeting reminder poll returned ${res.status}: ${text}`);
    }
  } catch (err) {
    console.error('Meeting reminder poll error:', err.message);
  }
}

function startMeetingReminderScheduler(serverBaseUrl) {
  baseUrl = serverBaseUrl || `http://localhost:${process.env.PORT || 3000}`;
  console.log('Meeting reminder scheduler started, polling every 60s');
  // Small delay so Next.js finishes booting before the first poll
  setTimeout(pollReminders, 5000);
  setInterval(pollReminders, POLL_INTERVAL_MS);
}

module.exports = { startMeetingReminderScheduler };
