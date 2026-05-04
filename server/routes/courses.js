const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { requireOrganizer } = require("../middleware/organizer");
const { generateId } = require("../utils/security");

const router = express.Router();

const DISCIPLINES = new Set(["bike", "hike", "kayak", "run", "trek", "other"]);

function normalizeText(value) {
  return String(value || "").trim();
}

function slugify(input) {
  return normalizeText(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed);
}

function toNumber(value, fallback = null) {
  if (value === "" || value === null || typeof value === "undefined") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInt(value, fallback = null) {
  if (value === "" || value === null || typeof value === "undefined") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function validateCoursePayload(payload, { partial = false } = {}) {
  const errors = [];

  if (!partial || typeof payload.name !== "undefined") {
    const name = normalizeText(payload.name);
    if (!name || name.length > 80) {
      errors.push("Course name is required and must be 80 characters or fewer.");
    }
  }

  if (typeof payload.region !== "undefined") {
    const region = normalizeText(payload.region);
    if (region.length > 80) {
      errors.push("Region must be 80 characters or fewer.");
    }
  }

  if (typeof payload.description !== "undefined") {
    const description = normalizeText(payload.description);
    if (description.length > 1200) {
      errors.push("Description must be 1200 characters or fewer.");
    }
  }

  if (typeof payload.status !== "undefined" && !["draft", "published"].includes(payload.status)) {
    errors.push("Status must be draft or published.");
  }

  return errors;
}

function validateLegPayload(payload) {
  const errors = [];
  const legIndex = toInt(payload.legIndex);
  const name = normalizeText(payload.name);
  const discipline = normalizeText(payload.discipline).toLowerCase();
  const targetMinutes = toInt(payload.targetMinutes, null);
  const notes = normalizeText(payload.notes);

  if (!legIndex || legIndex < 1) {
    errors.push("Leg index must be an integer greater than 0.");
  }
  if (!name || name.length > 80) {
    errors.push("Leg name is required and must be 80 characters or fewer.");
  }
  if (!DISCIPLINES.has(discipline)) {
    errors.push("Leg discipline is invalid.");
  }
  if (targetMinutes !== null && targetMinutes < 0) {
    errors.push("Target minutes must be zero or greater.");
  }
  if (notes.length > 400) {
    errors.push("Leg notes must be 400 characters or fewer.");
  }

  return {
    errors,
    legIndex,
    name,
    discipline,
    targetMinutes,
    notes,
  };
}

function validateCheckpointPayload(payload) {
  const errors = [];
  const legId = normalizeText(payload.legId);
  const sequence = toInt(payload.sequence);
  const code = normalizeText(payload.code);
  const name = normalizeText(payload.name);
  const latitude = toNumber(payload.latitude);
  const longitude = toNumber(payload.longitude);
  const radiusM = toInt(payload.radiusM, 25);
  const notes = normalizeText(payload.notes);

  if (!legId) {
    errors.push("Checkpoint legId is required.");
  }
  if (!sequence || sequence < 1) {
    errors.push("Checkpoint sequence must be greater than 0.");
  }
  if (!code || code.length > 30) {
    errors.push("Checkpoint code is required and must be 30 characters or fewer.");
  }
  if (!name || name.length > 80) {
    errors.push("Checkpoint name is required and must be 80 characters or fewer.");
  }
  if (!isFiniteNumber(latitude) || latitude < -90 || latitude > 90) {
    errors.push("Checkpoint latitude must be between -90 and 90.");
  }
  if (!isFiniteNumber(longitude) || longitude < -180 || longitude > 180) {
    errors.push("Checkpoint longitude must be between -180 and 180.");
  }
  if (!radiusM || radiusM < 5 || radiusM > 200) {
    errors.push("Checkpoint radius must be between 5 and 200 meters.");
  }
  if (notes.length > 400) {
    errors.push("Checkpoint notes must be 400 characters or fewer.");
  }

  return {
    errors,
    legId,
    sequence,
    code,
    name,
    latitude,
    longitude,
    radiusM,
    notes,
  };
}

function validateTransitionPayload(payload) {
  const errors = [];
  const fromLegId = normalizeText(payload.fromLegId);
  const toLegId = normalizeText(payload.toLegId);
  const discipline = normalizeText(payload.discipline).toLowerCase();
  const notes = normalizeText(payload.notes);

  if (!fromLegId || !toLegId) {
    errors.push("Transition fromLegId and toLegId are required.");
  }
  if (fromLegId && toLegId && fromLegId === toLegId) {
    errors.push("Transition legs must be different.");
  }
  if (!DISCIPLINES.has(discipline)) {
    errors.push("Transition discipline is invalid.");
  }
  if (notes.length > 400) {
    errors.push("Transition notes must be 400 characters or fewer.");
  }

  return {
    errors,
    fromLegId,
    toLegId,
    discipline,
    notes,
  };
}

async function getCourseBundleBySlug(slug) {
  const courseResult = await db.query(
    `
      SELECT
        c.id,
        c.slug,
        c.name,
        c.region,
        c.description,
        c.status,
        c.owner_user_id AS "ownerUserId",
        c.created_at AS "createdAt",
        c.updated_at AS "updatedAt",
        p.username AS "ownerUsername"
      FROM courses c
      LEFT JOIN profiles p ON p.user_id = c.owner_user_id
      WHERE c.slug = $1
      LIMIT 1
    `,
    [slug]
  );
  if (!courseResult.rows.length) {
    return null;
  }
  const course = courseResult.rows[0];
  const legsResult = await db.query(
    `
      SELECT
        id,
        course_id AS "courseId",
        leg_index AS "legIndex",
        name,
        discipline,
        notes,
        target_minutes AS "targetMinutes"
      FROM course_legs
      WHERE course_id = $1
      ORDER BY leg_index ASC
    `,
    [course.id]
  );
  const checkpointsResult = await db.query(
    `
      SELECT
        id,
        course_id AS "courseId",
        leg_id AS "legId",
        sequence,
        code,
        name,
        latitude,
        longitude,
        radius_m AS "radiusM",
        notes
      FROM course_checkpoints
      WHERE course_id = $1
      ORDER BY leg_id ASC, sequence ASC
    `,
    [course.id]
  );
  const transitionsResult = await db.query(
    `
      SELECT
        id,
        course_id AS "courseId",
        from_leg_id AS "fromLegId",
        to_leg_id AS "toLegId",
        discipline,
        notes
      FROM course_transitions
      WHERE course_id = $1
      ORDER BY created_at ASC
    `,
    [course.id]
  );

  return {
    course,
    legs: legsResult.rows,
    checkpoints: checkpointsResult.rows,
    transitions: transitionsResult.rows,
  };
}

async function requireCourseOwnership(req, res, next) {
  try {
    const { rows } = await db.query(
      "SELECT owner_user_id FROM courses WHERE id = $1 LIMIT 1",
      [req.params.courseId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Course not found." });
    }

    if (rows[0].owner_user_id !== req.auth.user.id) {
      return res.status(403).json({ error: "You can only edit courses you created." });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

function courseBundleToGeoJson(bundle) {
  const legById = new Map(bundle.legs.map((leg) => [leg.id, leg]));
  const checkpointsByLeg = new Map();
  bundle.checkpoints.forEach((checkpoint) => {
    if (!checkpointsByLeg.has(checkpoint.legId)) {
      checkpointsByLeg.set(checkpoint.legId, []);
    }
    checkpointsByLeg.get(checkpoint.legId).push(checkpoint);
  });

  const features = [];
  bundle.checkpoints.forEach((checkpoint) => {
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [checkpoint.longitude, checkpoint.latitude],
      },
      properties: {
        featureType: "checkpoint",
        checkpointId: checkpoint.id,
        code: checkpoint.code,
        name: checkpoint.name,
        legId: checkpoint.legId,
        legName: legById.get(checkpoint.legId)?.name || "",
        sequence: checkpoint.sequence,
        radiusM: checkpoint.radiusM,
        notes: checkpoint.notes,
      },
    });
  });

  bundle.legs.forEach((leg) => {
    const legPoints = (checkpointsByLeg.get(leg.id) || [])
      .sort((a, b) => a.sequence - b.sequence)
      .map((point) => [point.longitude, point.latitude]);

    if (legPoints.length >= 2) {
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: legPoints,
        },
        properties: {
          featureType: "leg",
          legId: leg.id,
          legIndex: leg.legIndex,
          name: leg.name,
          discipline: leg.discipline,
          targetMinutes: leg.targetMinutes,
          notes: leg.notes,
        },
      });
    }
  });

  return {
    type: "FeatureCollection",
    properties: {
      courseId: bundle.course.id,
      slug: bundle.course.slug,
      name: bundle.course.name,
      region: bundle.course.region,
      description: bundle.course.description,
    },
    features,
  };
}

function courseBundleToGpx(bundle) {
  const escaped = (value) => String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  const checkpoints = bundle.checkpoints
    .slice()
    .sort((a, b) => {
      const legA = bundle.legs.find((leg) => leg.id === a.legId)?.legIndex || 0;
      const legB = bundle.legs.find((leg) => leg.id === b.legId)?.legIndex || 0;
      if (legA !== legB) {
        return legA - legB;
      }
      return a.sequence - b.sequence;
    });

  const waypointMarkup = checkpoints.map((checkpoint) => {
    const leg = bundle.legs.find((entry) => entry.id === checkpoint.legId);
    return `  <wpt lat="${checkpoint.latitude}" lon="${checkpoint.longitude}">
    <name>${escaped(checkpoint.code)}</name>
    <desc>${escaped(`${checkpoint.name} | Leg ${leg ? leg.legIndex : "?"}`)}</desc>
  </wpt>`;
  }).join("\n");

  const routePointsMarkup = checkpoints.map((checkpoint) => {
    return `    <rtept lat="${checkpoint.latitude}" lon="${checkpoint.longitude}">
      <name>${escaped(checkpoint.code)}</name>
    </rtept>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="AR-FIT" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escaped(bundle.course.name)}</name>
    <desc>${escaped(bundle.course.description || "AR-FIT virtual adventure race course")}</desc>
  </metadata>
${waypointMarkup}
  <rte>
    <name>${escaped(bundle.course.name)} Route</name>
${routePointsMarkup}
  </rte>
</gpx>`;
}

router.get("/public/list", async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `
        SELECT
          c.id,
          c.slug,
          c.name,
          c.region,
          c.description,
          c.updated_at AS "updatedAt",
          p.username AS "ownerUsername",
          COALESCE(legs.leg_count, 0) AS "legCount",
          COALESCE(checkpoints.checkpoint_count, 0) AS "checkpointCount"
        FROM courses c
        LEFT JOIN profiles p ON p.user_id = c.owner_user_id
        LEFT JOIN (
          SELECT course_id, COUNT(*) AS leg_count
          FROM course_legs
          GROUP BY course_id
        ) legs ON legs.course_id = c.id
        LEFT JOIN (
          SELECT course_id, COUNT(*) AS checkpoint_count
          FROM course_checkpoints
          GROUP BY course_id
        ) checkpoints ON checkpoints.course_id = c.id
        WHERE c.status = 'published'
        ORDER BY c.updated_at DESC
      `
    );
    return res.json({ courses: rows });
  } catch (error) {
    return next(error);
  }
});

router.get("/public/:slug", async (req, res, next) => {
  try {
    const bundle = await getCourseBundleBySlug(normalizeText(req.params.slug));
    if (!bundle || bundle.course.status !== "published") {
      return res.status(404).json({ error: "Course not found." });
    }
    return res.json(bundle);
  } catch (error) {
    return next(error);
  }
});

router.get("/public/:slug/export.geojson", async (req, res, next) => {
  try {
    const bundle = await getCourseBundleBySlug(normalizeText(req.params.slug));
    if (!bundle || bundle.course.status !== "published") {
      return res.status(404).json({ error: "Course not found." });
    }
    return res.json(courseBundleToGeoJson(bundle));
  } catch (error) {
    return next(error);
  }
});

router.get("/public/:slug/export.gpx", async (req, res, next) => {
  try {
    const bundle = await getCourseBundleBySlug(normalizeText(req.params.slug));
    if (!bundle || bundle.course.status !== "published") {
      return res.status(404).json({ error: "Course not found." });
    }

    const gpx = courseBundleToGpx(bundle);
    res.setHeader("Content-Type", "application/gpx+xml; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${bundle.course.slug}.gpx"`);
    return res.send(gpx);
  } catch (error) {
    return next(error);
  }
});

router.use(requireAuth, requireOrganizer);

router.get("/mine", async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `
        SELECT
          id,
          slug,
          name,
          region,
          description,
          status,
          updated_at AS "updatedAt"
        FROM courses
        WHERE owner_user_id = $1
        ORDER BY updated_at DESC
      `,
      [req.auth.user.id]
    );
    return res.json({ courses: rows });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  const errors = validateCoursePayload(req.body || {}, { partial: false });
  if (errors.length) {
    return res.status(400).json({ error: errors.join(" ") });
  }

  const name = normalizeText(req.body.name);
  const region = normalizeText(req.body.region);
  const description = normalizeText(req.body.description);
  const desiredSlug = normalizeText(req.body.slug) || slugify(name);

  if (!desiredSlug) {
    return res.status(400).json({ error: "A valid slug could not be generated. Please update the course name." });
  }

  try {
    const { rows: existingRows } = await db.query(
      "SELECT 1 FROM courses WHERE slug = $1 LIMIT 1",
      [desiredSlug]
    );
    if (existingRows.length) {
      return res.status(409).json({ error: "That slug already exists. Try a different course name." });
    }

    const { rows } = await db.query(
      `
        INSERT INTO courses (id, owner_user_id, slug, name, region, description, status, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'draft', NOW())
        RETURNING
          id,
          slug,
          name,
          region,
          description,
          status,
          updated_at AS "updatedAt"
      `,
      [generateId(), req.auth.user.id, desiredSlug, name, region, description]
    );
    return res.status(201).json({ course: rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.get("/:courseId", requireCourseOwnership, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `
        SELECT
          id,
          slug,
          name,
          region,
          description,
          status,
          updated_at AS "updatedAt"
        FROM courses
        WHERE id = $1
        LIMIT 1
      `,
      [req.params.courseId]
    );
    const course = rows[0];

    const legsResult = await db.query(
      `
        SELECT
          id,
          course_id AS "courseId",
          leg_index AS "legIndex",
          name,
          discipline,
          notes,
          target_minutes AS "targetMinutes"
        FROM course_legs
        WHERE course_id = $1
        ORDER BY leg_index ASC
      `,
      [req.params.courseId]
    );

    const checkpointsResult = await db.query(
      `
        SELECT
          id,
          course_id AS "courseId",
          leg_id AS "legId",
          sequence,
          code,
          name,
          latitude,
          longitude,
          radius_m AS "radiusM",
          notes
        FROM course_checkpoints
        WHERE course_id = $1
        ORDER BY leg_id ASC, sequence ASC
      `,
      [req.params.courseId]
    );

    const transitionsResult = await db.query(
      `
        SELECT
          id,
          course_id AS "courseId",
          from_leg_id AS "fromLegId",
          to_leg_id AS "toLegId",
          discipline,
          notes
        FROM course_transitions
        WHERE course_id = $1
        ORDER BY created_at ASC
      `,
      [req.params.courseId]
    );

    return res.json({
      course,
      legs: legsResult.rows,
      checkpoints: checkpointsResult.rows,
      transitions: transitionsResult.rows,
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:courseId", requireCourseOwnership, async (req, res, next) => {
  const errors = validateCoursePayload(req.body || {}, { partial: true });
  if (errors.length) {
    return res.status(400).json({ error: errors.join(" ") });
  }

  try {
    const currentResult = await db.query(
      "SELECT * FROM courses WHERE id = $1 LIMIT 1",
      [req.params.courseId]
    );
    if (!currentResult.rows.length) {
      return res.status(404).json({ error: "Course not found." });
    }
    const current = currentResult.rows[0];

    const nextName = typeof req.body.name === "undefined" ? current.name : normalizeText(req.body.name);
    const nextRegion = typeof req.body.region === "undefined" ? current.region : normalizeText(req.body.region);
    const nextDescription = typeof req.body.description === "undefined" ? current.description : normalizeText(req.body.description);
    const requestedSlug = typeof req.body.slug === "undefined" ? current.slug : slugify(req.body.slug);
    const nextStatus = typeof req.body.status === "undefined" ? current.status : req.body.status;

    if (!requestedSlug) {
      return res.status(400).json({ error: "Slug cannot be empty." });
    }

    if (requestedSlug !== current.slug) {
      const duplicateSlug = await db.query(
        "SELECT 1 FROM courses WHERE slug = $1 AND id <> $2 LIMIT 1",
        [requestedSlug, req.params.courseId]
      );
      if (duplicateSlug.rows.length) {
        return res.status(409).json({ error: "That slug is already in use." });
      }
    }

    const { rows } = await db.query(
      `
        UPDATE courses
        SET
          slug = $2,
          name = $3,
          region = $4,
          description = $5,
          status = $6,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          slug,
          name,
          region,
          description,
          status,
          updated_at AS "updatedAt"
      `,
      [req.params.courseId, requestedSlug, nextName, nextRegion, nextDescription, nextStatus]
    );
    return res.json({ course: rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.post("/:courseId/legs", requireCourseOwnership, async (req, res, next) => {
  const normalized = validateLegPayload(req.body || {});
  if (normalized.errors.length) {
    return res.status(400).json({ error: normalized.errors.join(" ") });
  }

  try {
    const { rows } = await db.query(
      `
        INSERT INTO course_legs (id, course_id, leg_index, name, discipline, notes, target_minutes, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (course_id, leg_index)
        DO UPDATE SET
          name = EXCLUDED.name,
          discipline = EXCLUDED.discipline,
          notes = EXCLUDED.notes,
          target_minutes = EXCLUDED.target_minutes,
          updated_at = NOW()
        RETURNING
          id,
          course_id AS "courseId",
          leg_index AS "legIndex",
          name,
          discipline,
          notes,
          target_minutes AS "targetMinutes"
      `,
      [
        generateId(),
        req.params.courseId,
        normalized.legIndex,
        normalized.name,
        normalized.discipline,
        normalized.notes,
        normalized.targetMinutes,
      ]
    );
    await db.query("UPDATE courses SET updated_at = NOW() WHERE id = $1", [req.params.courseId]);
    return res.status(201).json({ leg: rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:courseId/legs/:legId", requireCourseOwnership, async (req, res, next) => {
  const normalized = validateLegPayload(req.body || {});
  if (normalized.errors.length) {
    return res.status(400).json({ error: normalized.errors.join(" ") });
  }

  try {
    const result = await db.query(
      `
        UPDATE course_legs
        SET
          leg_index = $3,
          name = $4,
          discipline = $5,
          notes = $6,
          target_minutes = $7,
          updated_at = NOW()
        WHERE id = $1
          AND course_id = $2
        RETURNING
          id,
          course_id AS "courseId",
          leg_index AS "legIndex",
          name,
          discipline,
          notes,
          target_minutes AS "targetMinutes"
      `,
      [
        req.params.legId,
        req.params.courseId,
        normalized.legIndex,
        normalized.name,
        normalized.discipline,
        normalized.notes,
        normalized.targetMinutes,
      ]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Leg not found." });
    }
    await db.query("UPDATE courses SET updated_at = NOW() WHERE id = $1", [req.params.courseId]);
    return res.json({ leg: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.post("/:courseId/checkpoints", requireCourseOwnership, async (req, res, next) => {
  const normalized = validateCheckpointPayload(req.body || {});
  if (normalized.errors.length) {
    return res.status(400).json({ error: normalized.errors.join(" ") });
  }

  try {
    const legResult = await db.query(
      "SELECT 1 FROM course_legs WHERE id = $1 AND course_id = $2 LIMIT 1",
      [normalized.legId, req.params.courseId]
    );
    if (!legResult.rows.length) {
      return res.status(400).json({ error: "Checkpoint leg does not belong to this course." });
    }

    const result = await db.query(
      `
        INSERT INTO course_checkpoints (
          id, course_id, leg_id, sequence, code, name, latitude, longitude, radius_m, notes, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT (course_id, leg_id, sequence)
        DO UPDATE SET
          code = EXCLUDED.code,
          name = EXCLUDED.name,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          radius_m = EXCLUDED.radius_m,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING
          id,
          course_id AS "courseId",
          leg_id AS "legId",
          sequence,
          code,
          name,
          latitude,
          longitude,
          radius_m AS "radiusM",
          notes
      `,
      [
        generateId(),
        req.params.courseId,
        normalized.legId,
        normalized.sequence,
        normalized.code,
        normalized.name,
        normalized.latitude,
        normalized.longitude,
        normalized.radiusM,
        normalized.notes,
      ]
    );
    await db.query("UPDATE courses SET updated_at = NOW() WHERE id = $1", [req.params.courseId]);
    return res.status(201).json({ checkpoint: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:courseId/checkpoints/:checkpointId", requireCourseOwnership, async (req, res, next) => {
  const normalized = validateCheckpointPayload(req.body || {});
  if (normalized.errors.length) {
    return res.status(400).json({ error: normalized.errors.join(" ") });
  }

  try {
    const legResult = await db.query(
      "SELECT 1 FROM course_legs WHERE id = $1 AND course_id = $2 LIMIT 1",
      [normalized.legId, req.params.courseId]
    );
    if (!legResult.rows.length) {
      return res.status(400).json({ error: "Checkpoint leg does not belong to this course." });
    }

    const result = await db.query(
      `
        UPDATE course_checkpoints
        SET
          leg_id = $3,
          sequence = $4,
          code = $5,
          name = $6,
          latitude = $7,
          longitude = $8,
          radius_m = $9,
          notes = $10,
          updated_at = NOW()
        WHERE id = $1
          AND course_id = $2
        RETURNING
          id,
          course_id AS "courseId",
          leg_id AS "legId",
          sequence,
          code,
          name,
          latitude,
          longitude,
          radius_m AS "radiusM",
          notes
      `,
      [
        req.params.checkpointId,
        req.params.courseId,
        normalized.legId,
        normalized.sequence,
        normalized.code,
        normalized.name,
        normalized.latitude,
        normalized.longitude,
        normalized.radiusM,
        normalized.notes,
      ]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Checkpoint not found." });
    }
    await db.query("UPDATE courses SET updated_at = NOW() WHERE id = $1", [req.params.courseId]);
    return res.json({ checkpoint: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.post("/:courseId/transitions", requireCourseOwnership, async (req, res, next) => {
  const normalized = validateTransitionPayload(req.body || {});
  if (normalized.errors.length) {
    return res.status(400).json({ error: normalized.errors.join(" ") });
  }

  try {
    const legsResult = await db.query(
      "SELECT id FROM course_legs WHERE course_id = $1 AND id = ANY($2::uuid[])",
      [req.params.courseId, [normalized.fromLegId, normalized.toLegId]]
    );
    if (legsResult.rows.length !== 2) {
      return res.status(400).json({ error: "Transition legs must belong to this course." });
    }

    const result = await db.query(
      `
        INSERT INTO course_transitions (
          id, course_id, from_leg_id, to_leg_id, discipline, notes, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (course_id, from_leg_id, to_leg_id)
        DO UPDATE SET
          discipline = EXCLUDED.discipline,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING
          id,
          course_id AS "courseId",
          from_leg_id AS "fromLegId",
          to_leg_id AS "toLegId",
          discipline,
          notes
      `,
      [
        generateId(),
        req.params.courseId,
        normalized.fromLegId,
        normalized.toLegId,
        normalized.discipline,
        normalized.notes,
      ]
    );
    await db.query("UPDATE courses SET updated_at = NOW() WHERE id = $1", [req.params.courseId]);
    return res.status(201).json({ transition: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
