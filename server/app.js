const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const config = require("./config");
const { attachSession } = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const plannerRoutes = require("./routes/planner");

const app = express();

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (!config.frontendOrigins.length || config.frontendOrigins.includes(origin)) {
    return true;
  }

  if (config.nodeEnv !== "production") {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  }

  return false;
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS."));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(attachSession);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/planner", plannerRoutes);

const staticRoot = process.cwd();
app.use(express.static(staticRoot, {
  extensions: ["html"],
}));

app.get("/", (_req, res) => {
  res.sendFile(path.join(staticRoot, "index.html"));
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  const message = status >= 500 ? "Internal server error." : error.message;
  if (status >= 500) {
    console.error(error);
  }
  res.status(status).json({ error: message });
});

module.exports = app;
