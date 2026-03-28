// Auth middleware for appointment-service.
// Verifies Bearer JWT from Authorization header and attaches req.user.
// Same pattern as doctor-management-service — no DB lookup needed.
// JWT payload carries all required identity claims (sub, email, role).

import jwt from "jsonwebtoken";
import env from "../config/environment.js";

export default (req, res, next) => {
  const auth = req.headers.authorization || "";
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }

  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET || "");
    if (!payload || !payload.sub) {
      return res.status(401).json({ error: "invalid_token" });
    }
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
};
