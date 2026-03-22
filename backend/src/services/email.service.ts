import nodemailer from "nodemailer";
import { env } from "../config/env";

// ─── Transporter (Gmail SMTP) ──────────────────────────────────

const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
    },
});

// ─── Email Templates ──────────────────────────────────────────

const baseHtml = (content: string) => `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#E07B39;padding:28px 32px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                💰 Quản lý chi tiêu AI
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#999;text-align:center;">
                Email này được gửi tự động, vui lòng không reply.<br/>
                Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const btnStyle =
    "display:inline-block;padding:14px 32px;background:#E07B39;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:-0.2px;";

// ─── Send helper ───────────────────────────────────────────────

async function sendEmail(payload: {
    to: string;
    subject: string;
    html: string;
    devLog: string;
    link: string;
}): Promise<void> {
    try {
        await transporter.sendMail({
            from: `"Quản lý chi tiêu AI" <${env.fromEmail}>`,
            to: payload.to,
            subject: payload.subject,
            html: payload.html,
        });
        console.info(`[email] ${payload.devLog} sent → ${payload.to}`);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[email] Failed to send ${payload.devLog}:`, message);
        console.info(`[email] ${payload.devLog} link → ${payload.link}`);
        throw new Error(`Failed to send email: ${message}`);
    }
}

export const emailService = {
    sendVerificationEmail: async (to: string, name: string, rawToken: string) => {
        const link = `${env.frontendUrl}/verify-email?token=${rawToken}`;

        await sendEmail({
            to,
            subject: "Xác thực email của bạn — Quản lý chi tiêu AI",
            html: baseHtml(`
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">
          Xin chào ${name}! 👋
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
          Cảm ơn bạn đã đăng ký. Nhấn vào nút bên dưới để xác thực email
          và kích hoạt tài khoản của bạn.
        </p>
        <p style="margin:0 0 32px;">
          <a href="${link}" style="${btnStyle}">Xác thực email</a>
        </p>
        <p style="margin:0;font-size:13px;color:#999;line-height:1.5;">
          Link có hiệu lực trong <strong>24 giờ</strong>.<br/>
          Nếu nút không hoạt động, copy link này vào trình duyệt:<br/>
          <span style="word-break:break-all;color:#E07B39;">${link}</span>
        </p>
      `),
            devLog: "verify-email",
            link,
        });
    },

    sendPasswordResetEmail: async (to: string, name: string, rawToken: string) => {
        const link = `${env.frontendUrl}/reset-password?token=${rawToken}`;

        await sendEmail({
            to,
            subject: "Đặt lại mật khẩu — Quản lý chi tiêu AI",
            html: baseHtml(`
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">
          Đặt lại mật khẩu
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
          Xin chào <strong>${name}</strong>, chúng tôi nhận được yêu cầu đặt lại
          mật khẩu cho tài khoản <strong>${to}</strong>.
        </p>
        <p style="margin:0 0 32px;">
          <a href="${link}" style="${btnStyle}">Đặt lại mật khẩu</a>
        </p>
        <p style="margin:0;font-size:13px;color:#999;line-height:1.5;">
          Link có hiệu lực trong <strong>1 giờ</strong>.<br/>
          Nếu nút không hoạt động, copy link này vào trình duyệt:<br/>
          <span style="word-break:break-all;color:#E07B39;">${link}</span>
        </p>
      `),
            devLog: "reset-password",
            link,
        });
    },
};
