const nodemailer = require("nodemailer");
const config = require("../config");

let transporter;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (!config.smtpHost || !config.smtpUser || !config.smtpPass || !config.emailFrom) {
    throw new Error("SMTP configuration is incomplete. Fill SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM.");
  }

  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });

  return transporter;
}

async function verifyEmailTransport() {
  return getTransporter().verify();
}

async function sendOtpEmail({ email, code, purpose }) {
  const subject = purpose === "register" ? "Your AR-FIT registration code" : "Your AR-FIT login code";
  const intro = purpose === "register"
    ? "Use this one-time code to finish creating your AR-FIT account."
    : "Use this one-time code to sign in to your AR-FIT account.";

  const info = await getTransporter().sendMail({
    from: config.emailFrom,
    to: email,
    subject,
    text: `${intro}\n\nCode: ${code}\n\nThe code expires in ${config.otpTtlMinutes} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; background:#090204; color:#fff4ef; padding:24px;">
        <h1 style="margin:0 0 16px; color:#ff4c2e;">AR-FIT</h1>
        <p style="margin:0 0 16px;">${intro}</p>
        <p style="margin:0 0 20px; font-size:32px; font-weight:700; letter-spacing:0.2em;">${code}</p>
        <p style="margin:0; color:#cfada5;">This code expires in ${config.otpTtlMinutes} minutes.</p>
      </div>
    `,
  });

  console.log("SMTP send result:", {
    to: email,
    subject,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
    messageId: info.messageId,
  });

  return info;
}

module.exports = {
  sendOtpEmail,
  verifyEmailTransport,
};
