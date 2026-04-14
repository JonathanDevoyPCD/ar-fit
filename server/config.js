const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function getRequired(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getNumber(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number.`);
  }
  return parsed;
}

function getBoolean(name, fallback = false) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  return raw === "true";
}

const frontendOrigins = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = {
  port: getNumber("PORT", 3000),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: getRequired("DATABASE_URL"),
  databaseSsl: getBoolean("DATABASE_SSL", false),
  frontendOrigins,
  sessionCookieName: process.env.SESSION_COOKIE_NAME || "arfit_session",
  sessionTtlDays: getNumber("SESSION_TTL_DAYS", 30),
  otpTtlMinutes: getNumber("OTP_TTL_MINUTES", 10),
  otpMaxAttempts: getNumber("OTP_MAX_ATTEMPTS", 5),
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: getNumber("SMTP_PORT", 587),
  smtpSecure: getBoolean("SMTP_SECURE", false),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  emailFrom: process.env.EMAIL_FROM || "",
  emailProvider: (process.env.EMAIL_PROVIDER || "smtp").toLowerCase(),
  resendApiKey: process.env.RESEND_API_KEY || "",
  resendApiUrl: process.env.RESEND_API_URL || "https://api.resend.com/emails",
};
