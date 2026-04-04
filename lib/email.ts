// ─── Email Transport (Gmail SMTP via Nodemailer) ─────────────────────────────
import nodemailer from 'nodemailer';

// NOTE: Gmail SMTP is intended for dev / small-scale. Prefer a transactional provider for production.
function getGmailSmtpConfig() {
  const user = (process.env.GMAIL_SMTP_USER || '').trim();
  const pass = (process.env.GMAIL_SMTP_PASS || '').trim();
  const from = (process.env.EMAIL_FROM || user || 'FypSync@gmail.com').trim();
  const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').trim();

  if (process.env.NODE_ENV === 'development') {
    console.log('[Email Config] Using Gmail SMTP');
    console.log('[Email Config] GMAIL_SMTP_USER present:', !!user);
    console.log('[Email Config] GMAIL_SMTP_PASS present:', pass ? `*** (len ${pass.length})` : false);
    console.log('[Email Config] EMAIL_FROM:', from);
    console.log('[Email Config] APP_URL:', appUrl);
  }

  if (!user || !pass) {
    throw new Error(
      'Gmail SMTP not configured. Set GMAIL_SMTP_USER and GMAIL_SMTP_PASS (App Password) in .env'
    );
  }

  return { user, pass, from, appUrl };
}

let cachedTransport: nodemailer.Transporter | null = null;
function getTransport() {
  if (cachedTransport) return cachedTransport;
  const { user, pass } = getGmailSmtpConfig();

  cachedTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return cachedTransport;
}

async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  const { from } = getGmailSmtpConfig();
  const transporter = getTransport();

  const info = await transporter.sendMail({
    from: `Projectify <${from}>`,
    to,
    subject,
    html,
    text,
  });

  return info;
}

// Backwards-compatible alias (older code expected Brevo config)
function getBrevoConfig() {
  const { from: senderEmail, appUrl } = getGmailSmtpConfig();
  return { apiKey: 'gmail-smtp', senderEmail, appUrl };
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
  appUrl,
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
  appUrl: string;
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
              <img src="${appUrl}/logo.png" alt="Projectify" style="width:50px;height:50px;margin-bottom:20px;" onerror="this.style.display='none'">
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
                <a href="${appUrl}" style="color:#1E6F3E;text-decoration:none;font-weight:500;">Projectify</a> — FAST NUCES FYP Management
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
  const { appUrl } = getBrevoConfig();
  try {
    const info = await sendEmail({
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
        appUrl,
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
  const { appUrl } = getBrevoConfig();

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
    const info = await sendEmail({
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
        appUrl,
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

// ─── Send password reset email ────────────────────────────────────────────────

interface SendPasswordResetEmailParams {
  to: string;
  userName: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({ to, userName, resetUrl }: SendPasswordResetEmailParams) {
  const appName = 'Projectify';
  const { appUrl } = getBrevoConfig();

  try {
    const info = await sendEmail({
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
          <tr>
            <td style="background: linear-gradient(135deg, #1E6F3E 0%, #15803d 100%); padding: 40px 40px 30px; text-align: center;">
              <div style="width: 70px; height: 70px; background-color: rgba(255, 255, 255, 0.2); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <img src="${appUrl}/logo.png" alt="Projectify" style="width: 50px; height: 50px;" onerror="this.style.display='none'">
              </div>
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">Password Reset</h1>
              <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 10px 0 0; font-weight: 400;">${appName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="color: #1e293b; font-size: 18px; font-weight: 600; margin: 0 0 8px;">Hi ${userName},</p>
              <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 30px;">We received a request to reset your password for your Projectify account. Click the button below to create a new password.</p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #1E6F3E 0%, #15803d 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 14px 0 rgba(30, 111, 62, 0.4);">Reset Password</a>
                  </td>
                </tr>
              </table>
              <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0 0 15px;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="background-color: #f1f5f9; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #1E6F3E; word-break: break-all; margin: 0 0 25px;">${resetUrl}</p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">This link expires in 20 minutes.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #94a3b8; font-size: 13px; margin: 0 0 10px;">This email was sent by <a href="${appUrl}" style="color: #1E6F3E; text-decoration: none; font-weight: 500;">Projectify</a></p>
              <p style="color: #cbd5e1; font-size: 11px; margin: 15px 0 0;">© ${new Date().getFullYear()} Projectify. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `Hi ${userName},\n\nWe received a request to reset your password for your Projectify account.\n\nReset link (expires in 20 minutes):\n${resetUrl}\n\nIf you didn't request this, ignore this email.\n\n— Projectify\n${appUrl}`,
    });

    console.log('[PasswordReset] Email sent successfully:', (info as any)?.messageId || (info as any)?.messageId);
    return { success: true, data: info };
  } catch (error) {
    console.error('[PasswordReset] Error sending password reset email:', error instanceof Error ? error.message : error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}
