import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendPasswordResetEmailParams {
  to: string;
  userName: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({ to, userName, resetUrl }: SendPasswordResetEmailParams) {
  const appName = 'Projectify';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://projectify.up.railway.app';

  try {
    const { data, error } = await resend.emails.send({
      from: 'Projectify <onboarding@resend.dev>',
      to: [to],
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
                      <img src="https://projectify.up.railway.app/logo.png" alt="Projectify" style="width: 50px; height: 50px;" onerror="this.style.display='none'">
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
                            Link expires in 1 hour
                          </p>
                          <p style="color: #a16207; font-size: 13px; margin: 0; line-height: 1.5;">
                            For security reasons, this password reset link will expire in 1 hour. If you need more time, please request a new link.
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

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

---
Projectify - FAST NUCES FYP Management
${appUrl}
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}
