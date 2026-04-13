const db = require("../db");
const config = require("../config");
const { hashValue } = require("../utils/security");

async function attachSession(req, _res, next) {
  const token = req.cookies[config.sessionCookieName];
  if (!token) {
    req.auth = null;
    return next();
  }

  try {
    const tokenHash = hashValue(token);
    const { rows } = await db.query(
      `
        SELECT
          s.id AS session_id,
          s.expires_at,
          u.id AS user_id,
          u.email,
          p.username
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN profiles p ON p.user_id = u.id
        WHERE s.token_hash = $1
          AND s.expires_at > NOW()
        LIMIT 1
      `,
      [tokenHash]
    );

    if (!rows.length) {
      req.auth = null;
      return next();
    }

    await db.query(
      `
        UPDATE sessions
        SET last_seen_at = NOW()
        WHERE id = $1
      `,
      [rows[0].session_id]
    );

    req.auth = {
      sessionId: rows[0].session_id,
      user: {
        id: rows[0].user_id,
        email: rows[0].email,
        username: rows[0].username,
      },
      token,
      tokenHash,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAuth(req, res, next) {
  if (!req.auth) {
    return res.status(401).json({ error: "Authentication required." });
  }
  return next();
}

module.exports = {
  attachSession,
  requireAuth,
};
