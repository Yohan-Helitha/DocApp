// TODO: implement request validation for auth endpoints
// - validate registration payloads for different roles
// - validate login payload
// Use a validation library (e.g., joi) or custom checks

exports.validateRegister = (req, res, next) => {
  // TODO: add real validation
  next();
};

exports.validateLogin = (req, res, next) => {
  // TODO: check presence of email/username and password
  next();
};
