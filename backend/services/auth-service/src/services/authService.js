// Auth service: implements registration and login per schema
import db from "../config/db.js";
import env from "../config/environment.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const SALT_ROUNDS = Number(env.BCRYPT_SALT_ROUNDS) || 10;

const tryCreateAdminAuditLog = async ({ actionType, targetEntity, targetEntityId, actionNote }) => {
  if (!env.INTERNAL_API_KEY) return;
  if (!env.ADMIN_SERVICE_URL) return;

  try {
    const url = String(env.ADMIN_SERVICE_URL).replace(/\/$/, '') + '/api/v1/internal/admin/audit-logs';
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': env.INTERNAL_API_KEY
      },
      body: JSON.stringify({
        actionType,
        targetEntity,
        targetEntityId,
        actionNote: actionNote || null,
        adminUserId: null
      })
    });
  } catch {
    // Best-effort; do not fail registration.
  }
};

const trySendWelcomeNotification = async ({ userId, email, role, name }) => {
  if (!env.NOTIFICATION_SERVICE_URL) return;

  const base = String(env.NOTIFICATION_SERVICE_URL || '').replace(/\/$/, '');
  if (!base) return;

  try {
    const displayName =
      (name && String(name).trim()) ||
      (email && String(email).split('@')[0]) ||
      'User';

    await fetch(`${base}/api/v1/notifications/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': String(userId),
        'x-user-role': String(role || 'user'),
      },
      body: JSON.stringify({
        recipient_user_id: userId,
        recipient_email: email,
        channel: 'email',
        template_code: 'WELCOME_USER',
        message: 'Welcome to DocApp!',
        payload_json: {
          name: displayName,
          role: String(role || 'user'),
        },
        priority: 'high',
      }),
    });
  } catch {
    // Best-effort; do not fail registration.
  }
};

export const register = async (userData) => {
  const { email, password, role } = userData || {};
  if (!email || !password || !role) {
    const err = new Error("invalid_input");
    err.status = 400;
    throw err;
  }

  if (!["patient", "doctor", "admin"].includes(role)) {
    const err = new Error("invalid_role");
    err.status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const insertText = `
      INSERT INTO users (email, password_hash, role, account_status)
      VALUES ($1, $2, $3, $4)
      RETURNING user_id, email, role, account_status, created_at, updated_at
    `;
    const accountStatus = role === "doctor" ? "pending_verification" : "active";
    const values = [email.toLowerCase(), passwordHash, role, accountStatus];
    const result = await client.query(insertText, values);
    await client.query("COMMIT");
    const user = result.rows[0];

    await tryCreateAdminAuditLog({
      actionType: 'user_registered',
      targetEntity: 'user',
      targetEntityId: user.user_id,
      actionNote: `User registered: ${user.email} (${user.role})`
    });

    // Patient welcome notification (best-effort)
    if (user.role === 'patient') {
      await trySendWelcomeNotification({
        userId: user.user_id,
        email: user.email,
        role: user.role,
        name: userData?.name || userData?.full_name || userData?.fullName,
      });
    }

    return { user };
  } catch (err) {
    await client.query("ROLLBACK");
    // handle unique violation (email exists)
    if (err && err.code === "23505") {
      const e = new Error("email_exists");
      e.status = 409;
      throw e;
    }
    throw err;
  } finally {
    client.release();
  }
};

export const registerDoctor = async (doctorPayload, licenseFile) => {
  const { email, password } = doctorPayload || {};
  if (!email || !password) {
    const err = new Error("invalid_input");
    err.status = 400;
    throw err;
  }

  if (!licenseFile) {
    const err = new Error("license_required");
    err.status = 400;
    throw err;
  }

  const allowedMime = new Set(["application/pdf", "image/png", "image/jpeg"]);
  if (!allowedMime.has(licenseFile.mimetype)) {
    const err = new Error("invalid_license_type");
    err.status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    const insertUserText = `
      INSERT INTO users (email, password_hash, role, account_status)
      VALUES ($1, $2, $3, $4)
      RETURNING user_id, email, role, account_status, created_at, updated_at
    `;
    const userRes = await client.query(insertUserText, [
      email.toLowerCase(),
      passwordHash,
      "doctor",
      "pending_verification",
    ]);
    const user = userRes.rows[0];

    const profileData = {
      full_name: doctorPayload.full_name || doctorPayload.fullName || null,
      specialization: doctorPayload.specialization || null,
      notes: doctorPayload.notes || null,
    };

    await client.query(
      `INSERT INTO doctor_verification_requests
        (user_id, status, profile_data, license_original_name, license_mime_type, license_size_bytes, license_data)
       VALUES ($1, 'pending', $2, $3, $4, $5, $6)`,
      [
        user.user_id,
        profileData,
        licenseFile.originalname || null,
        licenseFile.mimetype || null,
        Number(licenseFile.size || 0) || null,
        licenseFile.buffer,
      ],
    );

    await client.query("COMMIT");

    await tryCreateAdminAuditLog({
      actionType: 'doctor_verification_requested',
      targetEntity: 'doctor',
      targetEntityId: user.user_id,
      actionNote: `Doctor registration pending verification: ${user.email}`
    });

    return { user, verification: { status: "pending" } };
  } catch (err) {
    await client.query("ROLLBACK");
    if (err && err.code === "23505") {
      const e = new Error("email_exists");
      e.status = 409;
      throw e;
    }
    throw err;
  } finally {
    client.release();
  }
};

export const login = async (credentials) => {
  const { email, password } = credentials || {};
  if (!email || !password) {
    const err = new Error("invalid_input");
    err.status = 400;
    throw err;
  }

  const text = `SELECT user_id, email, password_hash, role, account_status FROM users WHERE email = $1`;
  const res = await db.query(text, [email.toLowerCase()]);
  const user = res.rows && res.rows[0];
  if (!user) {
    const e = new Error("invalid_credentials");
    e.status = 401;
    throw e;
  }

  if (user.account_status !== "active") {
    const e = new Error(
      user.account_status === "pending_verification"
        ? "pending_verification"
        : "account_inactive",
    );
    e.status = 403;
    throw e;
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    const e = new Error("invalid_credentials");
    e.status = 401;
    throw e;
  }

  const payload = { sub: user.user_id, email: user.email, role: user.role };
  // Sign with RS256 if private key is available, otherwise fallback to HS256
  let accessToken;
  try {
    const pkPath = path.resolve(
      process.cwd(),
      env.AUTH_PRIVATE_KEY_PATH || "./keys/private.pem",
    );
    if (fs.existsSync(pkPath)) {
      const privateKey = fs.readFileSync(pkPath, "utf8");
      accessToken = jwt.sign(payload, privateKey, {
        algorithm: "RS256",
        expiresIn: "15m",
        keyid: "auth-key-1",
      });
    } else {
      accessToken = jwt.sign(payload, env.JWT_SECRET || "change-me", {
        expiresIn: "15m",
      });
    }
  } catch (e) {
    accessToken = jwt.sign(payload, env.JWT_SECRET || "change-me", {
      expiresIn: "15m",
    });
  }

  // create refresh token (raw returned to client) and store hashed form
  const refreshToken = crypto.randomBytes(64).toString("hex");
  const refreshHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [user.user_id, refreshHash, expiresAt],
  );

  return { accessToken, refreshToken, expiresAt };
};

export const listPendingDoctorVerifications = async () => {
  const { rows } = await db.query(
    `SELECT u.user_id, u.email, u.account_status, u.created_at,
            r.status AS verification_status,
            r.profile_data,
            r.license_original_name,
            r.license_mime_type,
            r.license_size_bytes,
            r.submitted_at
     FROM users u
     LEFT JOIN doctor_verification_requests r ON r.user_id = u.user_id
     WHERE u.role = 'doctor' AND u.account_status = 'pending_verification'
     ORDER BY u.created_at DESC`,
  );
  return { doctors: rows };
};

export const listDoctorVerifications = async () => {
  const { rows } = await db.query(
    `SELECT u.user_id, u.email, u.account_status, u.created_at,
            r.status AS verification_status,
            r.profile_data,
            r.license_original_name,
            r.license_mime_type,
            r.license_size_bytes,
            r.submitted_at
     FROM users u
     LEFT JOIN doctor_verification_requests r ON r.user_id = u.user_id
     WHERE u.role = 'doctor'
     ORDER BY u.created_at DESC`,
  );
  return { doctors: rows };
};

export const getDoctorLicense = async (userId) => {
  const { rows } = await db.query(
    `SELECT license_original_name, license_mime_type, license_data
     FROM doctor_verification_requests
     WHERE user_id = $1`,
    [userId],
  );
  const row = rows && rows[0];
  if (!row || !row.license_data) {
    const e = new Error("license_not_found");
    e.status = 404;
    throw e;
  }
  return {
    filename: row.license_original_name || "license",
    mimeType: row.license_mime_type || "application/octet-stream",
    data: row.license_data,
  };
};

export const verifyDoctor = async ({ userId, status, reason, adminUserId }) => {
  const allowed = ["approved", "rejected"];
  if (!allowed.includes(status)) {
    const e = new Error("invalid_verification_status");
    e.status = 400;
    throw e;
  }

  const newAccountStatus = status === "approved" ? "active" : "rejected";

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    const uRes = await client.query(
      `UPDATE users
       SET account_status = $1, updated_at = now()
       WHERE user_id = $2 AND role = 'doctor'
       RETURNING user_id, email, role, account_status, created_at, updated_at`,
      [newAccountStatus, userId],
    );
    const user = uRes.rows && uRes.rows[0];
    if (!user) {
      const e = new Error("doctor_user_not_found");
      e.status = 404;
      throw e;
    }

    await client.query(
      `UPDATE doctor_verification_requests
       SET status = $1,
           reviewed_at = now(),
           reviewed_by_admin_id = $2,
           review_reason = $3
       WHERE user_id = $4`,
      [status, adminUserId || null, reason || null, userId],
    );

    await client.query("COMMIT");
    return { user, verification: { status } };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const refreshToken = async (rawToken) => {
  // find non-expired tokens
  const res = await db.query(
    "SELECT token_id, user_id, token_hash, expires_at, revoked_at FROM refresh_tokens WHERE expires_at > now()",
  );
  const rows = res.rows || [];
  let found = null;
  for (const row of rows) {
    if (row.revoked_at) continue;
    const match = await bcrypt.compare(rawToken, row.token_hash);
    if (match) {
      found = row;
      break;
    }
  }
  if (!found) {
    const e = new Error("invalid_refresh_token");
    e.status = 401;
    throw e;
  }

  // Issue a new access token.
  // Keep claims consistent with `login()` so downstream services that enforce
  // role-based access (e.g. AI symptom checker) don't break.
  const uRes = await db.query(
    "SELECT user_id, email, role, account_status FROM users WHERE user_id = $1",
    [found.user_id],
  );
  const user = uRes.rows && uRes.rows[0];
  if (!user) {
    const e = new Error("invalid_refresh_token");
    e.status = 401;
    throw e;
  }

  if (user.account_status !== "active") {
    const e = new Error(
      user.account_status === "pending_verification"
        ? "pending_verification"
        : "account_inactive",
    );
    e.status = 403;
    throw e;
  }

  const payload = { sub: user.user_id, email: user.email, role: user.role };
  let accessToken;
  try {
    const pkPath = path.resolve(
      process.cwd(),
      env.AUTH_PRIVATE_KEY_PATH || "./keys/private.pem",
    );
    if (fs.existsSync(pkPath)) {
      const privateKey = fs.readFileSync(pkPath, "utf8");
      accessToken = jwt.sign(payload, privateKey, {
        algorithm: "RS256",
        expiresIn: "15m",
        keyid: "auth-key-1",
      });
    } else {
      accessToken = jwt.sign(payload, env.JWT_SECRET || "change-me", {
        expiresIn: "15m",
      });
    }
  } catch (e) {
    accessToken = jwt.sign(payload, env.JWT_SECRET || "change-me", {
      expiresIn: "15m",
    });
  }

  // rotate: revoke old token and insert a new one
  await db.query(
    "UPDATE refresh_tokens SET revoked_at = now() WHERE token_id = $1",
    [found.token_id],
  );
  const newRaw = crypto.randomBytes(64).toString("hex");
  const newHash = await bcrypt.hash(newRaw, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [found.user_id, newHash, expiresAt],
  );

  return { accessToken, refreshToken: newRaw, expiresAt };
};

export const logout = async (rawToken) => {
  // mark matching refresh token as revoked
  const res = await db.query(
    "SELECT token_id, token_hash FROM refresh_tokens WHERE revoked_at IS NULL",
  );
  const rows = res.rows || [];
  for (const row of rows) {
    const match = await bcrypt.compare(rawToken, row.token_hash);
    if (match) {
      await db.query(
        "UPDATE refresh_tokens SET revoked_at = now() WHERE token_id = $1",
        [row.token_id],
      );
      return;
    }
  }
  const e = new Error("invalid_refresh_token");
  e.status = 401;
  throw e;
};

export const getRegistrationData = async (userId) => {
  const { rows } = await db.query(
    `SELECT profile_data FROM doctor_verification_requests WHERE user_id = $1`,
    [userId],
  );
  const row = rows && rows[0];
  if (!row || !row.profile_data) return null;
  const { full_name, specialization } = row.profile_data;
  return {
    full_name: full_name || null,
    specialization: specialization || null,
  };
};

export const verifyToken = async (token) => {
  // Verify using public key if available; fallback to shared secret
  try {
    const pubPath = path.resolve(
      process.cwd(),
      env.AUTH_PUBLIC_KEY_PATH || "./keys/public.pem",
    );
    if (fs.existsSync(pubPath)) {
      const publicKey = fs.readFileSync(pubPath, "utf8");
      return jwt.verify(token, publicKey, { algorithms: ["RS256"] });
    }
  } catch (e) {
    // fallthrough to HS256
  }
  return jwt.verify(token, env.JWT_SECRET || "");
};
