const authService = require('../services/authService');

exports.register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    return res.status(201).json(result);
  } catch (err) {
    req.log && req.log.error && req.log.error(err, 'register error');
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'internal_error' });
  }
};

exports.registerRole = async (req, res, role) => {
  try {
    const payload = Object.assign({}, req.body, { role });
    const result = await authService.register(payload);
    return res.status(201).json(result);
  } catch (err) {
    req.log && req.log.error && req.log.error(err, 'registerRole error');
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'internal_error' });
  }
};

exports.login = async (req, res) => {
  try {
    const tokens = await authService.login(req.body);
    return res.json(tokens);
  } catch (err) {
    req.log && req.log.error && req.log.error(err, 'login error');
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'internal_error' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'missing_refresh_token' });
    const tokens = await authService.refreshToken(refreshToken);
    return res.json(tokens);
  } catch (err) {
    req.log && req.log.error && req.log.error(err, 'refresh error');
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'internal_error' });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'missing_refresh_token' });
    await authService.logout(refreshToken);
    return res.json({ ok: true });
  } catch (err) {
    req.log && req.log.error && req.log.error(err, 'logout error');
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'internal_error' });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    const token = (req.headers.authorization || '').startsWith('Bearer ') ? (req.headers.authorization || '').split(' ')[1] : req.query.token;
    if (!token) return res.status(400).json({ error: 'missing_token' });
    const payload = await authService.verifyToken(token);
    return res.json({ valid: true, payload });
  } catch (err) {
    return res.status(401).json({ valid: false, error: 'invalid_token' });
  }
};

exports.me = async (req, res) => {
  // TODO: implement authenticated profile lookup (populate req.user in middleware)
  if (req.user) {
    return res.json({ user: req.user });
  }
  return res.status(401).json({ error: 'unauthenticated' });
};
