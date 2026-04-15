import * as authService from "../services/authService.js";

export const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    return res.status(201).json(result);
  } catch (err) {
    req.log && req.log.error && req.log.error(err, "register error");
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: "internal_error" });
  }
};

export const registerRole = async (req, res, role) => {
  try {
    const payload = Object.assign({}, req.body, { role });
    const result = await authService.register(payload);
    return res.status(201).json(result);
  } catch (err) {
    req.log && req.log.error && req.log.error(err, "registerRole error");
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: "internal_error" });
  }
};

export const registerDoctor = async (req, res) => {
  try {
    const payload = Object.assign({}, req.body, { role: "doctor" });
    const result = await authService.registerDoctor(payload, req.file);
    return res.status(201).json(result);
  } catch (err) {
    req.log && req.log.error && req.log.error(err, "registerDoctor error");
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: "internal_error" });
  }
};

export const login = async (req, res) => {
  try {
    const tokens = await authService.login(req.body);
    return res.json(tokens);
  } catch (err) {
    req.log && req.log.error && req.log.error(err, "login error");
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: "internal_error" });
  }
};

export const listPendingDoctorVerifications = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }
    const result = await authService.listPendingDoctorVerifications();
    return res.json(result);
  } catch (err) {
    req.log &&
      req.log.error &&
      req.log.error(err, "listPendingDoctorVerifications error");
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: "internal_error" });
  }
};

export const downloadDoctorLicense = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }
    const { filename, mimeType, data } = await authService.getDoctorLicense(
      req.params.userId,
    );
    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${String(filename).replace(/\"/g, "")}"`,
    );
    return res.send(data);
  } catch (err) {
    req.log &&
      req.log.error &&
      req.log.error(err, "downloadDoctorLicense error");
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: "internal_error" });
  }
};

export const verifyDoctor = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }
    const { status, reason } = req.body || {};
    const result = await authService.verifyDoctor({
      userId: req.params.userId,
      status,
      reason,
      adminUserId: req.user.id,
    });
    return res.json(result);
  } catch (err) {
    req.log && req.log.error && req.log.error(err, "verifyDoctor error");
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: "internal_error" });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken)
      return res.status(400).json({ error: "missing_refresh_token" });
    const tokens = await authService.refreshToken(refreshToken);
    return res.json(tokens);
  } catch (err) {
    req.log && req.log.error && req.log.error(err, "refresh error");
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: "internal_error" });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken)
      return res.status(400).json({ error: "missing_refresh_token" });
    await authService.logout(refreshToken);
    return res.json({ ok: true });
  } catch (err) {
    req.log && req.log.error && req.log.error(err, "logout error");
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: "internal_error" });
  }
};

export const verifyToken = async (req, res) => {
  try {
    const token = (req.headers.authorization || "").startsWith("Bearer ")
      ? (req.headers.authorization || "").split(" ")[1]
      : req.query.token;
    if (!token) return res.status(400).json({ error: "missing_token" });
    const payload = await authService.verifyToken(token);
    return res.json({ valid: true, payload });
  } catch (err) {
    return res.status(401).json({ valid: false, error: "invalid_token" });
  }
};

export const me = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "unauthenticated" });
  }
  if (req.user.role === "doctor") {
    try {
      const registrationData = await authService.getRegistrationData(
        req.user.id,
      );
      return res.json({ user: req.user, registrationData });
    } catch (err) {
      req.log &&
        req.log.error &&
        req.log.error(err, "me registrationData error");
      return res.json({ user: req.user, registrationData: null });
    }
  }
  return res.json({ user: req.user });
};
