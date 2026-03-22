import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,   // Google App Password (not your account password)
  },
});

// Verify connection on startup (non-blocking)
transporter.verify().catch(err =>
  console.warn('⚠️  Nodemailer: could not verify SMTP connection –', err.message)
);

/**
 * Send a 6-digit password-reset OTP.
 */
export const sendOtpEmail = async (toEmail, otp) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0f172a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:40px 20px;">
          <table width="520" cellpadding="0" cellspacing="0"
            style="background:#1e293b;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#adff2f,#00f2ff);padding:2px;"></td>
            </tr>
            <tr>
              <td style="padding:40px 48px;text-align:center;">
                <h1 style="font-size:36px;font-weight:900;letter-spacing:4px;
                  background:linear-gradient(90deg,#adff2f,#00f2ff);
                  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                  margin:0 0 8px;">VIBEFIT</h1>
                <p style="color:#64748b;font-size:13px;margin:0 0 32px;text-transform:uppercase;letter-spacing:2px;">
                  Password Reset</p>

                <p style="color:#e2e8f0;font-size:15px;line-height:1.7;margin:0 0 28px;">
                  Someone (hopefully you) requested a password reset.<br>
                  Use the code below — it expires in <strong>10 minutes</strong>.
                </p>

                <div style="background:#0f172a;border:1px solid rgba(173,255,47,0.3);
                  border-radius:12px;padding:24px 16px;margin:0 0 28px;">
                  <span style="font-size:48px;font-weight:900;letter-spacing:12px;color:#adff2f;">
                    ${otp}
                  </span>
                </div>

                <p style="color:#475569;font-size:13px;margin:0;">
                  If you didn't request this, you can safely ignore this email.<br>
                  Your password will remain unchanged.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 48px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
                <p style="color:#334155;font-size:11px;margin:0;">
                  © ${new Date().getFullYear()} VibeFit AI · Built for gainers
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from:    `"VibeFit AI 💪" <${process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject: `${otp} is your VibeFit reset code`,
    html,
  });
};

/**
 * Send a welcome email after registration.
 */
export const sendWelcomeEmail = async (toEmail, name) => {
  await transporter.sendMail({
    from:    `"VibeFit AI 💪" <${process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject: `Welcome to VibeFit, ${name}! Let's get to work.`,
    html: `
      <body style="background:#0f172a;color:#e2e8f0;font-family:Helvetica,Arial,sans-serif;padding:40px;">
        <h1 style="color:#adff2f;letter-spacing:4px;">VIBEFIT</h1>
        <h2 style="color:#e2e8f0;">Hey ${name}, you're in. 🏋️</h2>
        <p style="color:#94a3b8;">Complete your onboarding to unlock your personalised AI coaching experience.</p>
      </body>
    `,
  });
};
