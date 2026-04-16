import * as service from '../services/telemedicineService.js';

export const createSession = async (req, res) => {
  try {
    const payload = req.body || {};
    const result = await service.createSession(payload, req.user, { authorization: req.headers.authorization });
    return res.status(201).json(result);
  } catch (err) {
    req.log && req.log.error && req.log.error(err, 'createSession error');
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'internal_error' });
  }
};

export const listSessions = async (req, res) => {
  try {
    const { status } = req.query || {};
    const result = await service.listSessions({ status });
    return res.json(result);
  } catch (err) {
    req.log && req.log.error && req.log.error(err, 'listSessions error');
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'internal_error' });
  }
};

export const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await service.getSession(sessionId);
    if (!result) return res.status(404).json({ error: 'not_found' });
    return res.json(result);
  } catch (err) {
    req.log && req.log.error && req.log.error(err, 'getSession error');
    return res.status(500).json({ error: 'internal_error' });
  }
};

export const createJoinToken = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { role } = req.body || {};
    const details = await service.createJoinToken(sessionId, req.user, role, { authorization: req.headers.authorization });
    return res.json(details);
  } catch (err) {
    req.log && req.log.error && req.log.error(err, 'createJoinToken error');
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'internal_error' });
  }
};

export const startSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    await service.startSession(sessionId, req.user, { authorization: req.headers.authorization });
    return res.json({ ok: true });
  } catch (err) {
    req.log && req.log.error && req.log.error(err, 'startSession error');
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'internal_error' });
  }
};

export const endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    await service.endSession(sessionId, req.user);
    return res.json({ ok: true });
  } catch (err) {
    req.log && req.log.error && req.log.error(err, 'endSession error');
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'internal_error' });
  }
};

export const deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    await service.deleteSession(sessionId, req.user);
    return res.json({ ok: true });
  } catch (err) {
    req.log && req.log.error && req.log.error(err, 'deleteSession error');
    if (err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'internal_error' });
  }
};
