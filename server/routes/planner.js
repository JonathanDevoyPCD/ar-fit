const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { generateId } = require("../utils/security");

const router = express.Router();

function isWeekStart(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function normalizeWeekStartValue(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value || "").slice(0, 10);
}

function normalizePlannerInput(payload = {}) {
  return {
    weekStart: String(payload.weekStart || "").trim(),
    day: Number(payload.day),
    type: String(payload.type || "").trim(),
    timeLabel: String(payload.time || payload.timeLabel || "").trim(),
    title: String(payload.title || "").trim(),
    notes: String(payload.notes || "").trim(),
    status: String(payload.status || "pending").trim(),
  };
}

function validatePlannerInput(item, { requireWeekStart = true } = {}) {
  if (requireWeekStart && !isWeekStart(item.weekStart)) {
    return "A valid week start date is required.";
  }
  if (!Number.isInteger(item.day) || item.day < 0 || item.day > 6) {
    return "Day must be between 0 and 6.";
  }
  if (!["workout", "meal"].includes(item.type)) {
    return "Type must be workout or meal.";
  }
  if (!item.title || item.title.length > 60) {
    return "Title is required and must be 60 characters or fewer.";
  }
  if (item.notes.length > 220) {
    return "Notes must be 220 characters or fewer.";
  }
  if (!["pending", "completed", "skipped"].includes(item.status)) {
    return "Status must be pending, completed, or skipped.";
  }
  return null;
}

router.use(requireAuth);

router.get("/items", async (req, res, next) => {
  const weekStart = String(req.query.weekStart || "").trim();
  if (!isWeekStart(weekStart)) {
    return res.status(400).json({ error: "A valid weekStart query parameter is required." });
  }

  try {
    const { rows } = await db.query(
      `
        SELECT
          id,
          week_start AS "weekStart",
          day,
          type,
          time_label AS time,
          title,
          notes,
          status
        FROM planner_items
        WHERE user_id = $1
          AND week_start = $2
        ORDER BY day ASC, time_label ASC, title ASC
      `,
      [req.auth.user.id, weekStart]
    );
    return res.json({ items: rows });
  } catch (error) {
    return next(error);
  }
});

router.post("/items", async (req, res, next) => {
  const item = normalizePlannerInput(req.body);
  const validationError = validatePlannerInput(item);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const id = generateId();
    const { rows } = await db.query(
      `
        INSERT INTO planner_items (
          id, user_id, week_start, day, type, time_label, title, notes, status, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING
          id,
          week_start AS "weekStart",
          day,
          type,
          time_label AS time,
          title,
          notes,
          status
      `,
      [id, req.auth.user.id, item.weekStart, item.day, item.type, item.timeLabel, item.title, item.notes, item.status]
    );
    return res.status(201).json({ item: rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.patch("/items/:itemId", async (req, res, next) => {
  const item = normalizePlannerInput(req.body);

  try {
    const existing = await db.query(
      `
        SELECT *
        FROM planner_items
        WHERE id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [req.params.itemId, req.auth.user.id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ error: "Planner item not found." });
    }

    const current = existing.rows[0];
    const nextValues = {
      weekStart: typeof req.body.weekStart === "undefined" ? current.week_start : item.weekStart,
      day: typeof req.body.day === "undefined" ? current.day : item.day,
      type: typeof req.body.type === "undefined" ? current.type : item.type,
      time: typeof req.body.time === "undefined" && typeof req.body.timeLabel === "undefined" ? current.time_label : item.timeLabel,
      title: typeof req.body.title === "undefined" ? current.title : item.title,
      notes: typeof req.body.notes === "undefined" ? current.notes : item.notes,
      status: typeof req.body.status === "undefined" ? current.status : item.status,
    };

    const validationError = validatePlannerInput({
      weekStart: normalizeWeekStartValue(nextValues.weekStart),
      day: nextValues.day,
      type: nextValues.type,
      title: nextValues.title,
      notes: nextValues.notes,
      status: nextValues.status,
    });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { rows } = await db.query(
      `
        UPDATE planner_items
        SET
          week_start = $3,
          day = $4,
          type = $5,
          time_label = $6,
          title = $7,
          notes = $8,
          status = $9,
          updated_at = NOW()
        WHERE id = $1
          AND user_id = $2
        RETURNING
          id,
          week_start AS "weekStart",
          day,
          type,
          time_label AS time,
          title,
          notes,
          status
      `,
      [
        req.params.itemId,
        req.auth.user.id,
        nextValues.weekStart,
        nextValues.day,
        nextValues.type,
        nextValues.time,
        nextValues.title,
        nextValues.notes,
        nextValues.status,
      ]
    );

    return res.json({ item: rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.delete("/items/:itemId", async (req, res, next) => {
  try {
    const result = await db.query(
      "DELETE FROM planner_items WHERE id = $1 AND user_id = $2",
      [req.params.itemId, req.auth.user.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: "Planner item not found." });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.post("/import", async (req, res, next) => {
  const input = req.body?.data;
  if (!input || typeof input !== "object") {
    return res.status(400).json({ error: "Import payload is required." });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    let importedCount = 0;
    const entries = Object.entries(input);

    for (const [weekStart, items] of entries) {
      if (!isWeekStart(weekStart) || !Array.isArray(items)) {
        continue;
      }

      for (const rawItem of items) {
        const item = normalizePlannerInput({ ...rawItem, weekStart });
        const validationError = validatePlannerInput(item);
        if (validationError) {
          continue;
        }

        const duplicate = await client.query(
          `
            SELECT 1
            FROM planner_items
            WHERE user_id = $1
              AND week_start = $2
              AND day = $3
              AND type = $4
              AND LOWER(title) = LOWER($5)
              AND time_label = $6
            LIMIT 1
          `,
          [req.auth.user.id, weekStart, item.day, item.type, item.title, item.timeLabel]
        );

        if (duplicate.rows.length) {
          continue;
        }

        await client.query(
          `
            INSERT INTO planner_items (
              id, user_id, week_start, day, type, time_label, title, notes, status, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          `,
          [generateId(), req.auth.user.id, weekStart, item.day, item.type, item.timeLabel, item.title, item.notes, item.status]
        );
        importedCount += 1;
      }
    }

    await client.query("COMMIT");
    return res.json({ importedCount });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
