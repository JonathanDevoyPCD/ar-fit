const express = require("express");
const rateLimit = require("express-rate-limit");
const db = require("../db");
const config = require("../config");
const { sendOtpEmail } = require("../utils/email");
const {
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
} = require("../utils/security");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth requests. Try again shortly." },
});

function getCookieOptions() {
  const isProduction = config.nodeEnv === "production";
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    expires: addDays(new Date(), config.sessionTtlDays),
  };
}

function buildSessionPayload(auth) {
  return {
    session: auth
      ? {
          user: auth.user,
        }
      : null,
  };
}

router.get("/session", (req, res) => {
  res.json(buildSessionPayload(req.auth));
});

router.post("/register/request-otp", authLimiter, async (req, res, next) => {
  const email = normalizeEmail(req.body.email);
  const username = normalizeUsername(req.body.username);

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  if (!isValidUsername(username)) {
    return res.status(400).json({ error: "Username must be 3-24 characters and use letters, numbers, dots, dashes, or underscores." });
  }

  try {
    const existingUser = await db.query(
      "SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [email]
    );
    if (existingUser.rows.length) {
      return res.status(409).json({ error: "An account already exists for that email. Use login instead." });
    }

    const existingUsername = await db.query(
      "SELECT 1 FROM profiles WHERE LOWER(username) = LOWER($1) LIMIT 1",
      [username]
    );
    if (existingUsername.rows.length) {
      return res.status(409).json({ error: "That username is already taken." });
    }

    const code = generateOtpCode();
    await db.query(
      `
        INSERT INTO otp_challenges (id, email, purpose, username, code_hash, expires_at)
        VALUES ($1, $2, 'register', $3, $4, $5)
      `,
      [
        generateId(),
        email,
        username,
        hashValue(code),
        addMinutes(new Date(), config.otpTtlMinutes),
      ]
    );

    await sendOtpEmail({ email, code, purpose: "register" });
    return res.json({ message: "OTP sent.", challenge: { email, purpose: "register" } });
  } catch (error) {
    return next(error);
  }
});

router.post("/login/request-otp", authLimiter, async (req, res, next) => {
  const email = normalizeEmail(req.body.email);

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  try {
    const existingUser = await db.query(
      "SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [email]
    );
    if (!existingUser.rows.length) {
      return res.status(404).json({ error: "No account exists for that email. Register first." });
    }

    const code = generateOtpCode();
    await db.query(
      `
        INSERT INTO otp_challenges (id, email, purpose, code_hash, expires_at)
        VALUES ($1, $2, 'login', $3, $4)
      `,
      [
        generateId(),
        email,
        hashValue(code),
        addMinutes(new Date(), config.otpTtlMinutes),
      ]
    );

    await sendOtpEmail({ email, code, purpose: "login" });
    return res.json({ message: "OTP sent.", challenge: { email, purpose: "login" } });
  } catch (error) {
    return next(error);
  }
});

router.post("/verify-otp", authLimiter, async (req, res, next) => {
  const email = normalizeEmail(req.body.email);
  const purpose = String(req.body.purpose || "").trim();
  const code = String(req.body.code || "").trim();

  if (!isValidEmail(email) || !["register", "login"].includes(purpose) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "Invalid verification request." });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const challengeResult = await client.query(
      `
        SELECT *
        FROM otp_challenges
        WHERE LOWER(email) = LOWER($1)
          AND purpose = $2
          AND used_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [email, purpose]
    );

    if (!challengeResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "No active OTP challenge found. Request a new code." });
    }

    const challenge = challengeResult.rows[0];

    if (challenge.used_at) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "That OTP has already been used." });
    }

    if (new Date(challenge.expires_at) <= new Date()) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "That OTP has expired. Request a new code." });
    }

    if (challenge.attempt_count >= config.otpMaxAttempts) {
      await client.query("ROLLBACK");
      return res.status(429).json({ error: "Maximum OTP attempts reached. Request a new code." });
    }

    if (challenge.code_hash !== hashValue(code)) {
      await client.query(
        "UPDATE otp_challenges SET attempt_count = attempt_count + 1 WHERE id = $1",
        [challenge.id]
      );
      await client.query("COMMIT");
      return res.status(400).json({ error: "Incorrect OTP code." });
    }

    let user;

    if (purpose === "register") {
      const existingUser = await client.query(
        "SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
        [email]
      );
      if (existingUser.rows.length) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "This account already exists. Use login instead." });
      }

      const existingUsername = await client.query(
        "SELECT 1 FROM profiles WHERE LOWER(username) = LOWER($1) LIMIT 1",
        [challenge.username]
      );
      if (existingUsername.rows.length) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "That username is already taken." });
      }

      const userId = generateId();
      const isOrganizer = config.organizerEmails.includes(email);
      await client.query(
        `
          INSERT INTO users (id, email, email_verified_at)
          VALUES ($1, $2, NOW())
        `,
        [userId, email]
      );
      await client.query(
        `
          INSERT INTO profiles (user_id, username, is_organizer)
          VALUES ($1, $2, $3)
        `,
        [userId, challenge.username, isOrganizer]
      );
      user = {
        id: userId,
        email,
        username: challenge.username,
        isOrganizer,
      };
    } else {
      const userResult = await client.query(
        `
          SELECT u.id, u.email, p.username, p.is_organizer AS "isOrganizer"
          FROM users u
          LEFT JOIN profiles p ON p.user_id = u.id
          WHERE LOWER(u.email) = LOWER($1)
          LIMIT 1
        `,
        [email]
      );
      if (!userResult.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "No account exists for that email." });
      }
      user = {
        ...userResult.rows[0],
        isOrganizer: Boolean(userResult.rows[0].isOrganizer)
          || config.organizerEmails.includes(email),
      };
    }

    await client.query(
      `
        UPDATE otp_challenges
        SET used_at = NOW()
        WHERE id = $1
      `,
      [challenge.id]
    );

    const sessionToken = generateSessionToken();
    await client.query(
      `
        INSERT INTO sessions (id, user_id, token_hash, expires_at)
        VALUES ($1, $2, $3, $4)
      `,
      [
        generateId(),
        user.id,
        hashValue(sessionToken),
        addDays(new Date(), config.sessionTtlDays),
      ]
    );

    await client.query("COMMIT");

    res.cookie(config.sessionCookieName, sessionToken, getCookieOptions());
    return res.json({
      message: "Authenticated.",
      session: {
        user,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    if (req.auth?.tokenHash) {
      await db.query("DELETE FROM sessions WHERE token_hash = $1", [req.auth.tokenHash]);
    }

    res.clearCookie(config.sessionCookieName, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.nodeEnv === "production",
      path: "/",
    });

    return res.json({ message: "Logged out." });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
