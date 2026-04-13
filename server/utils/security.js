const crypto = require("crypto");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username || "").trim();
}

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function generateOtpCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function generateId() {
  return crypto.randomUUID();
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function isValidUsername(username) {
  return /^[a-zA-Z0-9._-]{3,24}$/.test(normalizeUsername(username));
}

module.exports = {
  addDays,
  addMinutes,
  generateId,
  generateOtpCode,
  generateSessionToken,
  hashValue,
  isValidEmail,
  isValidUsername,
  normalizeEmail,
  normalizeUsername,
};
