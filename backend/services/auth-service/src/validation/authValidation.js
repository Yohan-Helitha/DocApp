// TODO: implement request validation for auth endpoints
// - validate registration payloads for different roles
// - validate login payload
// Use a validation library (e.g., joi) or custom checks

exports.validateRegister = (req, res, next) => {
  const { email, password, role } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email_and_password_required' });
  const allowed = ['patient', 'doctor', 'admin'];
  if (role && !allowed.includes(role)) return res.status(400).json({ error: 'invalid_role' });
  next();
};

exports.validateLogin = (req, res, next) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email_and_password_required' });
  next();
};
