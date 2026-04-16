// Auth middleware for ai-symptom-checker-service.
// Verifies Bearer JWT from Authorization header and attaches req.user.
//
// Supports both:
// - RS256 verification via AUTH_PUBLIC_KEY_PATH (preferred)
// - HS256 verification via JWT_SECRET (fallback)

import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import env from "../config/environment.js";

export default (req, res, next) => {
  const auth = req.headers.authorization || "";
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }

  const token = auth.split(" ")[1];

  try {
    // Prefer RS256 public key verification if available
    try {
      const pubPath = path.resolve(
        process.cwd(),
        env.AUTH_PUBLIC_KEY_PATH || "./keys/public.pem",
      );
      if (fs.existsSync(pubPath)) {
        const publicKey = fs.readFileSync(pubPath, "utf8");
        const payload = jwt.verify(token, publicKey, {
          algorithms: ["RS256"],
        });
        if (!payload || !payload.sub) {
          return res.status(401).json({ error: "invalid_token" });
        }
        req.user = { id: payload.sub, email: payload.email, role: payload.role };
        return next();
      }
    } catch {
      // Fall back to HS256
    }

    const payload = jwt.verify(token, env.JWT_SECRET || "");
    if (!payload || !payload.sub) {
      return res.status(401).json({ error: "invalid_token" });
    }
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
};
