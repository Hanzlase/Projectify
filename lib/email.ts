import nodemailer from 'nodemailer';

// ─── Gmail SMTP Transporter ───────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password (16 chars, no spaces)
  },
});

const FROM_ADDRESS = `Projectify <${process.env.EMAIL_USER}>`;
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://projectify.up.railway.app';

interface SendPasswordResetEmailParams {
  to: string;
  userName: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({ to, userName, resetUrl }: SendPasswordResetEmailParams) {
  const appName = 'Projectify';
  const appUrl = APP_URL;

  try {
    const info = await transporter.sendMail({
      from: FROM_ADDRESS,
      to,
      subject: 'Reset Your Password - Projectify',
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden;">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #1E6F3E 0%, #15803d 100%); padding: 40px 40px 30px; text-align: center;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <!-- Logo/Icon -->
                    <div style="width: 70px; height: 70px; background-color: rgba(255, 255, 255, 0.2); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                      <img src="${APP_URL}/logo.png" alt="Projectify" style="width: 50px; height: 50px;" onerror="this.style.display='none'">
                    </div>
                    <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">
                      Password Reset
                    </h1>
                    <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 10px 0 0; font-weight: 400;">
                      ${appName}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #1e293b; font-size: 18px; font-weight: 600; margin: 0 0 8px;">
                Hi ${userName},
              </p>
              <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 30px;">
                We received a request to reset your password for your Projectify account. Click the button below to create a new password.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #1E6F3E 0%, #15803d 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 14px 0 rgba(30, 111, 62, 0.4);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Info Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef3c7; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="width: 36px; height: 36px; background-color: #f59e0b; border-radius: 8px; text-align: center; line-height: 36px; font-size: 18px;">
                            ⏰
                          </div>
                        </td>
                        <td style="padding-left: 15px;">
                          <p style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 4px;">
                            Link expires in 20 minutes
                          </p>
                          <p style="color: #a16207; font-size: 13px; margin: 0; line-height: 1.5;">
                            For security reasons, this password reset link will expire in 20 minutes. If you need more time, please request a new link.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0 0 15px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="background-color: #f1f5f9; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #1E6F3E; word-break: break-all; margin: 0 0 25px;">
                ${resetUrl}
              </p>

              <!-- Security Notice -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0fdf4; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="width: 36px; height: 36px; background-color: #1E6F3E; border-radius: 8px; text-align: center; line-height: 36px; font-size: 18px;">
                            🔒
                          </div>
                        </td>
                        <td style="padding-left: 15px;">
                          <p style="color: #166534; font-size: 14px; font-weight: 600; margin: 0 0 4px;">
                            Didn't request this?
                          </p>
                          <p style="color: #15803d; font-size: 13px; margin: 0; line-height: 1.5;">
                            If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <p style="color: #94a3b8; font-size: 13px; margin: 0 0 10px;">
                      This email was sent by <a href="${appUrl}" style="color: #1E6F3E; text-decoration: none; font-weight: 500;">Projectify</a>
                    </p>
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                      Built for FAST NUCES FYP Management
                    </p>
                    <p style="color: #cbd5e1; font-size: 11px; margin: 15px 0 0;">
                      © ${new Date().getFullYear()} Projectify. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `
Hi ${userName},

We received a request to reset your password for your Projectify account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 20 minutes for security reasons.

If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

---
Projectify - FAST NUCES FYP Management
${appUrl}
      `,
    });

    console.log('Password reset email sent:', info.messageId);
    return { success: true, data: info };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

// ─── Meeting Email Types ───────────────────────────────────────────────────────

interface MeetingEmailParams {
  to: string;
  userName: string;
  meetingTitle: string;
  scheduledAt: Date;
  duration: number;
  meetingLink?: string | null;
  description?: string | null;
  groupName?: string;
}

interface MeetingReminderEmailParams extends MeetingEmailParams {
  reminderType: 'immediate' | '24h' | '1h';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMeetingDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatMeetingTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

function buildMeetingEmailHtml({
  userName,
  meetingTitle,
  scheduledAt,
  duration,
  meetingLink,
  description,
  groupName,
  badgeLabel,
  badgeColor,
  headerSubtitle,
}: {
  userName: string;
  meetingTitle: string;
  scheduledAt: Date;
  duration: number;
  meetingLink?: string | null;
  description?: string | null;
  groupName?: string;
  badgeLabel: string;
  badgeColor: string;
  headerSubtitle: string;
}): string {
  const dateStr = formatMeetingDate(scheduledAt);
  const timeStr = formatMeetingTime(scheduledAt);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting Notification - Projectify</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8fafc;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" style="width:100%;max-width:600px;border-collapse:collapse;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1E6F3E 0%,#15803d 100%);padding:40px 40px 30px;text-align:center;">
              <img src="${APP_URL}/logo.png" alt="Projectify" style="width:50px;height:50px;margin-bottom:20px;" onerror="this.style.display='none'">
              <h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0;">📅 Meeting Scheduled</h1>
              <p style="color:rgba(255,255,255,0.9);font-size:15px;margin:8px 0 0;">${headerSubtitle}</p>
            </td>
          </tr>

          <!-- Badge -->
          <tr>
            <td align="center" style="padding:20px 40px 0;">
              <span style="display:inline-block;background-color:${badgeColor};color:#ffffff;font-size:13px;font-weight:600;padding:6px 18px;border-radius:20px;">
                ${badgeLabel}
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 40px 40px;">
              <p style="color:#1e293b;font-size:17px;font-weight:600;margin:0 0 6px;">Hi ${userName},</p>
              <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 28px;">
                ${headerSubtitle}
              </p>

              <!-- Meeting Details Card -->
              <table role="presentation" style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="color:#1e293b;font-size:18px;font-weight:700;margin:0 0 16px;">📌 ${meetingTitle}</p>

                    <table role="presentation" style="width:100%;border-collapse:collapse;">
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">📆 Date</span>
                          <p style="color:#1e293b;font-size:15px;font-weight:500;margin:2px 0 0;">${dateStr}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">🕐 Time</span>
                          <p style="color:#1e293b;font-size:15px;font-weight:500;margin:2px 0 0;">${timeStr}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">⏱ Duration</span>
                          <p style="color:#1e293b;font-size:15px;font-weight:500;margin:2px 0 0;">${duration} minutes</p>
                        </td>
                      </tr>
                      ${groupName ? `
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">👥 Group</span>
                          <p style="color:#1e293b;font-size:15px;font-weight:500;margin:2px 0 0;">${groupName}</p>
                        </td>
                      </tr>` : ''}
                      ${description ? `
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">📝 Description</span>
                          <p style="color:#64748b;font-size:14px;line-height:1.5;margin:4px 0 0;">${description}</p>
                        </td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              ${meetingLink ? `
              <!-- Join Button -->
              <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${meetingLink}" target="_blank"
                      style="display:inline-block;background:linear-gradient(135deg,#1E6F3E 0%,#15803d 100%);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;box-shadow:0 4px 14px rgba(30,111,62,0.35);">
                      🔗 Join Meeting
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0 0 20px;word-break:break-all;">
                Or copy link: <span style="color:#1E6F3E;">${meetingLink}</span>
              </p>` : ''}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="color:#94a3b8;font-size:13px;margin:0 0 6px;">
                <a href="${APP_URL}" style="color:#1E6F3E;text-decoration:none;font-weight:500;">Projectify</a> — FAST NUCES FYP Management
              </p>
              <p style="color:#cbd5e1;font-size:11px;margin:0;">© ${new Date().getFullYear()} Projectify. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Send meeting created email ───────────────────────────────────────────────

export async function sendMeetingCreatedEmail(params: MeetingEmailParams) {
  const { to, userName, meetingTitle, scheduledAt, duration, meetingLink, description, groupName } = params;
  try {
    const info = await transporter.sendMail({
      from: FROM_ADDRESS,
      to,
      subject: `📅 New Meeting Scheduled: ${meetingTitle}`,
      html: buildMeetingEmailHtml({
        userName,
        meetingTitle,
        scheduledAt,
        duration,
        meetingLink,
        description,
        groupName,
        badgeLabel: '✅ New Meeting',
        badgeColor: '#1E6F3E',
        headerSubtitle: `A new meeting has been scheduled for your group.`,
      }),
      text: `Hi ${userName},\n\nA new meeting has been scheduled.\n\nTitle: ${meetingTitle}\nDate: ${formatMeetingDate(scheduledAt)}\nTime: ${formatMeetingTime(scheduledAt)}\nDuration: ${duration} minutes${meetingLink ? `\nJoin: ${meetingLink}` : ''}\n\n— Projectify`,
    });
    console.log('Meeting created email sent:', info.messageId);
    return { success: true, data: info };
  } catch (err) {
    console.error('sendMeetingCreatedEmail error:', err);
    return { success: false, error: 'Failed to send email' };
  }
}

// ─── Send meeting reminder email ──────────────────────────────────────────────

export async function sendMeetingReminderEmail(params: MeetingReminderEmailParams) {
  const { to, userName, meetingTitle, scheduledAt, duration, meetingLink, description, groupName, reminderType } = params;

  const reminderLabels: Record<string, { badge: string; color: string; subtitle: string; subject: string }> = {
    '24h': {
      badge: '⏰ Reminder: 24 Hours',
      color: '#f59e0b',
      subtitle: 'Your meeting is tomorrow. Be prepared!',
      subject: `⏰ Meeting Tomorrow: ${meetingTitle}`,
    },
    '1h': {
      badge: '🔔 Reminder: 1 Hour',
      color: '#ef4444',
      subtitle: 'Your meeting starts in 1 hour. Get ready!',
      subject: `🔔 Meeting in 1 Hour: ${meetingTitle}`,
    },
    immediate: {
      badge: '✅ Meeting Confirmed',
      color: '#1E6F3E',
      subtitle: 'A new meeting has been scheduled for your group.',
      subject: `📅 New Meeting Scheduled: ${meetingTitle}`,
    },
  };

  const label = reminderLabels[reminderType] ?? reminderLabels['immediate'];

  try {
    const info = await transporter.sendMail({
      from: FROM_ADDRESS,
      to,
      subject: label.subject,
      html: buildMeetingEmailHtml({
        userName,
        meetingTitle,
        scheduledAt,
        duration,
        meetingLink,
        description,
        groupName,
        badgeLabel: label.badge,
        badgeColor: label.color,
        headerSubtitle: label.subtitle,
      }),
      text: `Hi ${userName},\n\n${label.subtitle}\n\nTitle: ${meetingTitle}\nDate: ${formatMeetingDate(scheduledAt)}\nTime: ${formatMeetingTime(scheduledAt)}\nDuration: ${duration} minutes${meetingLink ? `\nJoin: ${meetingLink}` : ''}\n\n— Projectify`,
    });
    console.log('Meeting reminder email sent:', info.messageId);
    return { success: true, data: info };
  } catch (err) {
    console.error('sendMeetingReminderEmail error:', err);
    return { success: false, error: 'Failed to send email' };
  }
}
