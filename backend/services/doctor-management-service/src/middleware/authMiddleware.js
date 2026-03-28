// Auth middleware for doctor-management-service
// Verifies Bearer JWT from Authorization header and attaches req.user.
//
// KEY DIFFERENCE from auth-service middleware:
// This service has its own database (doctorsdb) which has no users table.
// In a microservices architecture, every service verifies the JWT signature
// locally using the shared JWT_SECRET — no cross-service HTTP call needed.
// The JWT payload already carries the identity claims (sub, email, role).

import jwt from "jsonwebtoken";
import env from "../config/environment.js";

export default async (req, res, next) => {
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
  } catch (err) {
    return res.status(401).json({ error: "invalid_token" });
  }
};
