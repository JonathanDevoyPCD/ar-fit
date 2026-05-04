function requireOrganizer(req, res, next) {
  if (!req.auth || !req.auth.user) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (!req.auth.user.isOrganizer) {
    return res.status(403).json({ error: "Organizer access required." });
  }

  return next();
}

module.exports = {
  requireOrganizer,
};
