// Runs meeting reminder processing directly in-process using Prisma + Nodemailer (Gmail SMTP).
// No HTTP polling — avoids 405 errors and the "route not compiled yet" race condition.

const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const POLL_INTERVAL_MS = 60_000; // 1 minute

let prisma = null;
let transport = null;

function getPrisma() {
  if (!prisma) prisma = new PrismaClient({ log: [] });
  return prisma;
}

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Gmail App Password
      },
    });
  }
  return transport;
}

function formatMeetingDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatMeetingTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
}

async function sendReminderEmail({ to, userName, meetingTitle, scheduledAt, duration, meetingLink, description, groupName, reminderType }) {
  const FROM = `Projectify <${process.env.EMAIL_USER}>`;

  const labels = {
    '24h':      { subject: `⏰ Meeting Tomorrow: ${meetingTitle}`,      badge: '⏰ Reminder: 24 Hours',    color: '#f59e0b' },
    '1h':       { subject: `🔔 Meeting in 1 Hour: ${meetingTitle}`,     badge: '🔔 Reminder: 1 Hour',      color: '#ef4444' },
    'immediate':{ subject: `📅 New Meeting Scheduled: ${meetingTitle}`, badge: '✅ Meeting Confirmed',     color: '#1E6F3E' },
  };
  const label = labels[reminderType] || labels['immediate'];

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px;border-radius:12px">
      <div style="background:#1E6F3E;color:white;padding:20px 24px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">📅 Projectify</h1>
      </div>
      <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb">
        <span style="background:${label.color};color:white;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">${label.badge}</span>
        <h2 style="margin:16px 0 8px;color:#111827">${meetingTitle}</h2>
        ${groupName ? `<p style="color:#6b7280;margin:0 0 16px">Group: <strong>${groupName}</strong></p>` : ''}
        <p style="color:#374151;margin:0 0 8px">Hi <strong>${userName}</strong>,</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border-radius:8px;padding:16px">
          <tr><td style="padding:6px 0;color:#6b7280;font-size:14px">📅 Date</td><td style="padding:6px 0;font-weight:600;font-size:14px">${formatMeetingDate(scheduledAt)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:14px">🕐 Time</td><td style="padding:6px 0;font-weight:600;font-size:14px">${formatMeetingTime(scheduledAt)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:14px">⏱ Duration</td><td style="padding:6px 0;font-weight:600;font-size:14px">${duration} minutes</td></tr>
          ${meetingLink ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px">🔗 Link</td><td style="padding:6px 0"><a href="${meetingLink}" style="color:#1E6F3E;font-weight:600">Join Meeting</a></td></tr>` : ''}
        </table>
        ${description ? `<p style="color:#374151;font-size:14px;border-left:3px solid #1E6F3E;padding-left:12px;margin:16px 0">${description}</p>` : ''}
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">— Projectify Team</p>
      </div>
    </div>`;

  try {
    const info = await getTransport().sendMail({
      from: FROM,
      to,
      subject: label.subject,
      html,
      text: `Hi ${userName},\n\nMeeting: ${meetingTitle}\nDate: ${formatMeetingDate(scheduledAt)}\nTime: ${formatMeetingTime(scheduledAt)}\nDuration: ${duration} min${meetingLink ? `\nJoin: ${meetingLink}` : ''}\n\n— Projectify`,
    });
    console.log(`[Meeting Scheduler] Email sent to ${to}: ${info.messageId}`);
  } catch (err) {
    console.error(`[Meeting Scheduler] Email send error to ${to}:`, err.message);
  }
}

async function processReminders() {
  const db = getPrisma();
  try {
    const dueReminders = await db.meetingEmailReminder.findMany({
      where: { sent: false, sendAt: { lte: new Date() } },
      include: {
        meeting: true,
      },
    });

    if (dueReminders.length === 0) return;
    console.log(`[Meeting Scheduler] Processing ${dueReminders.length} reminder(s)…`);

    for (const reminder of dueReminders) {
      const { meeting } = reminder;

      // Mark sent first to prevent duplicates even if emails fail
      await db.meetingEmailReminder.update({
        where: { id: reminder.id },
        data: { sent: true, sentAt: new Date() },
      });

      if (!meeting) continue;

      // Fetch group with its students and their user info
      const group = await db.group.findUnique({
        where: { groupId: meeting.groupId },
        include: {
          students: { include: { user: true } },
        },
      });

      if (!group) continue;

      // Build targets: all students in the group
      const targets = group.students.map((s) => ({
        email: s.user.email,
        name: s.user.name,
      }));

      // Also include the supervisor if assigned
      if (group.supervisorId) {
        try {
          const sup = await db.user.findUnique({
            where: { userId: group.supervisorId },
            select: { email: true, name: true },
          });
          if (sup) targets.push({ email: sup.email, name: sup.name });
        } catch { /* non-fatal */ }
      }

      if (targets.length === 0) continue;

      await Promise.allSettled(
        targets.map(({ email, name }) =>
          sendReminderEmail({
            to: email,
            userName: name,
            meetingTitle: meeting.title,
            scheduledAt: meeting.scheduledAt,
            duration: meeting.duration,
            meetingLink: meeting.meetingLink,
            description: meeting.description,
            groupName: group.groupName,
            reminderType: reminder.reminderType,
          })
        )
      );
    }
  } catch (err) {
    console.error('[Meeting Scheduler] processReminders error:', err.message);
  }
}

function startMeetingReminderScheduler() {
  console.log('[Meeting Scheduler] Started — processing reminders every 60s');
  // First run after 10s to let Next.js finish booting
  setTimeout(processReminders, 10_000);
  setInterval(processReminders, POLL_INTERVAL_MS);
}

module.exports = { startMeetingReminderScheduler };
