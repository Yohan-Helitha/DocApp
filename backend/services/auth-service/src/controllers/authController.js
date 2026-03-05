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

exports.me = async (req, res) => {
  // TODO: implement authenticated profile lookup (populate req.user in middleware)
  if (req.user) {
    return res.json({ user: req.user });
  }
  return res.status(401).json({ error: 'unauthenticated' });
};
