import env from "../config/environment.js";

export default function internalAuthMiddleware(req, res, next) {
  const expected = env.INTERNAL_API_KEY;
  if (!expected) {
    return res.status(503).json({ error: "internal_auth_not_configured" });
  }

  const provided = req.get("x-internal-api-key");
  if (!provided || provided !== expected) {
    return res.status(403).json({ error: "forbidden" });
  }
  return next();
}