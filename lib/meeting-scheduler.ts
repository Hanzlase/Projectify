import { prisma } from '@/lib/prisma';
import { sendMeetingReminderEmail } from '@/lib/email';

export async function processMeetingReminders(): Promise<void> {
  try {
    const dueReminders = await (prisma as any).meetingEmailReminder.findMany({
      where: {
        sent: false,
        sendAt: { lte: new Date() },
      },
      include: {
        meeting: {
          include: {
            group: {
              include: {
                students: { include: { user: true } },
              },
            },
          },
        },
      },
    });

    if (dueReminders.length === 0) return;

    for (const reminder of dueReminders) {
      const { meeting } = reminder;

      if (!meeting) {
        // Meeting was deleted; mark sent to avoid retrying
        await (prisma as any).meetingEmailReminder.update({
          where: { id: reminder.id },
          data: { sent: true, sentAt: new Date() },
        });
        continue;
      }

      const students = meeting.group?.students ?? [];
      const emailTargets: { email: string; name: string }[] = students.map((s: any) => ({
        email: s.user.email,
        name: s.user.name,
      }));

      if (meeting.group?.supervisorId) {
        try {
          const supervisor = await prisma.user.findUnique({
            where: { userId: meeting.group.supervisorId },
            select: { email: true, name: true },
          });
          if (supervisor) emailTargets.push({ email: supervisor.email, name: supervisor.name });
        } catch {
          // non-fatal
        }
      }

      await Promise.allSettled(
        emailTargets.map(({ email, name }) =>
          sendMeetingReminderEmail({
            to: email,
            userName: name,
            meetingTitle: meeting.title,
            scheduledAt: meeting.scheduledAt,
            duration: meeting.duration,
            meetingLink: meeting.meetingLink,
            description: meeting.description,
            groupName: meeting.group?.name,
            reminderType: reminder.reminderType as 'immediate' | '24h' | '1h',
          })
        )
      );

      // Mark sent regardless of per-address failures to avoid infinite retries
      await (prisma as any).meetingEmailReminder.update({
        where: { id: reminder.id },
        data: { sent: true, sentAt: new Date() },
      });
    }
  } catch (error) {
    console.error('Meeting reminder scheduler error:', error);
  }
}

// Creates reminder records for a new meeting (immediate, 24h before, 1h before).
export async function scheduleMeetingReminders(meetingId: number, scheduledAt: Date): Promise<void> {
  const now = new Date();
  const reminders: { reminderType: string; sendAt: Date }[] = [
    { reminderType: 'immediate', sendAt: now },
  ];

  const send24h = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);
  if (send24h > now) reminders.push({ reminderType: '24h', sendAt: send24h });

  const send1h = new Date(scheduledAt.getTime() - 60 * 60 * 1000);
  if (send1h > now) reminders.push({ reminderType: '1h', sendAt: send1h });

  await (prisma as any).meetingEmailReminder.createMany({
    data: reminders.map((r) => ({ meetingId, ...r })),
  });
}

// Replaces unsent 24h/1h reminders when a meeting is rescheduled.
export async function rescheduleMeetingReminders(meetingId: number, newScheduledAt: Date): Promise<void> {
  const now = new Date();

  await (prisma as any).meetingEmailReminder.deleteMany({
    where: { meetingId, sent: false, reminderType: { in: ['24h', '1h'] } },
  });

  const reminders: { reminderType: string; sendAt: Date }[] = [];

  const send24h = new Date(newScheduledAt.getTime() - 24 * 60 * 60 * 1000);
  if (send24h > now) reminders.push({ reminderType: '24h', sendAt: send24h });

  const send1h = new Date(newScheduledAt.getTime() - 60 * 60 * 1000);
  if (send1h > now) reminders.push({ reminderType: '1h', sendAt: send1h });

  if (reminders.length > 0) {
    await (prisma as any).meetingEmailReminder.createMany({
      data: reminders.map((r) => ({ meetingId, ...r })),
    });
  }
}
