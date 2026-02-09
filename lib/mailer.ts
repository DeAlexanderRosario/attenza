import nodemailer from "nodemailer"

// Configure nodemailer with Gmail SMTP
// Note: User needs to provide GMAIL_USER and GMAIL_PASS in .env
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
})

export async function sendPasswordResetEmail(email: string, token: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.warn("⚠️ Mailer skipped: GMAIL_USER or GMAIL_PASS not set.")
    console.log(`[Mock Email] To: ${email} | Subject: Password Reset | Token: ${token}`)
    return
  }

  try {
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`

    await transporter.sendMail({
      from: `"TrueCheck Support" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Reset Your Password - TrueCheck",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #333;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; background-color: #18181b; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">TRUECHECK</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin-top: 0; margin-bottom: 20px; font-size: 20px; color: #111;">Password Reset Request</h2>
              
              <p style="margin: 0 0 20px; line-height: 1.6; color: #555;">
                Hello,
              </p>
              <p style="margin: 0 0 30px; line-height: 1.6; color: #555;">
                We received a request to reset the password for your TrueCheck account. If you didn't make this request, you can safely ignore this email.
              </p>

              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; padding: 14px 30px; background-color: #4F46E5; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 16px;">Reset Password</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; line-height: 1.6; color: #555; font-size: 14px;">
                This link will expire in 1 hour for security reasons.
              </p>
              
              <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
              
              <p style="margin: 0; font-size: 12px; color: #999; line-height: 1.5;">
                If you're having trouble clicking the button, copy and paste the URL below into your web browser:<br>
                <a href="${resetLink}" style="color: #4F46E5; text-decoration: underline;">${resetLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 12px; color: #888;">
                &copy; ${new Date().getFullYear()} TrueCheck System. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    })
    console.log(`✅ Password reset email sent to ${email}`)
  } catch (error) {
    console.error("❌ Error sending email:", error)
    throw new Error("Failed to send email")
  }
}
