// Auth middleware for doctor-management-service.
// Verifies Bearer JWT from Authorization header and attaches req.user.

import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import env from "../config/environment.js";

let cachedPublicKey = null;

const getPublicKey = () => {
  if (cachedPublicKey) return cachedPublicKey;
  const configuredPath = env.AUTH_PUBLIC_KEY_PATH;
  if (!configuredPath) return null;

  const absPath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);

  if (!fs.existsSync(absPath)) return null;
  cachedPublicKey = fs.readFileSync(absPath, "utf8");
  return cachedPublicKey;
};

export default async (req, res, next) => {
  const auth = req.headers.authorization || "";
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }

  const token = auth.split(" ")[1];
  try {
    let payload;

    // Prefer RS256 verification with auth-service public key in k8s.
    const publicKey = getPublicKey();
    if (publicKey) {
      try {
        payload = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
      } catch {
        // Fall back to HS256 for local/dev environments without key files.
      }
    }

    if (!payload) {
      payload = jwt.verify(token, env.JWT_SECRET || "");
    }

    if (!payload || !payload.sub) {
      return res.status(401).json({ error: "invalid_token" });
    }
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: "invalid_token" });
  }
};
