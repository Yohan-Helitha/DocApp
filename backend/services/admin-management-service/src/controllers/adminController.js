import * as adminService from '../services/adminService.js';

const handleError = (req, res, err, context) => {
  if (req.log && req.log.error) {
    req.log.error(err, context);
  }
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  return res.status(500).json({ error: 'internal_error' });
};

export const createAuditLog = async (req, res) => {
  try {
    const { actionType, targetEntity, targetEntityId, actionNote, adminUserId } = req.body || {};
    if (!actionType || !targetEntity || !targetEntityId) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    const created = await adminService.createAuditLog({
      actionType,
      targetEntity,
      targetEntityId,
      actionNote: actionNote || null,
      adminUserId: adminUserId || null
    });

    return res.status(201).json({ log: created });
  } catch (err) {
    return handleError(req, res, err, 'createAuditLog error');
  }
};

export const listUsers = async (req, res) => {
  try {
    const users = await adminService.listUsers();
    return res.json({ users });
  } catch (err) {
    return handleError(req, res, err, 'listUsers error');
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, adminUserId } = req.body || {};

    if (!status) {
      return res.status(400).json({ error: 'missing_status' });
    }

    const updated = await adminService.updateUserStatus({ userId, status, adminUserId: adminUserId || null });
    return res.json({ user: updated });
  } catch (err) {
    return handleError(req, res, err, 'updateUserStatus error');
  }
};

export const listPendingDoctors = async (req, res) => {
  try {
    const doctors = await adminService.listPendingDoctors();
    return res.json({ doctors });
  } catch (err) {
    return handleError(req, res, err, 'listPendingDoctors error');
  }
};

export const viewDoctorLicense = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { filename, mimeType, data } = await adminService.getDoctorLicense({ doctorId });

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${String(filename).replace(/\"/g, '')}"`,
    );
    return res.send(data);
  } catch (err) {
    return handleError(req, res, err, 'viewDoctorLicense error');
  }
};

export const verifyDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { approved, reason, adminUserId, step } = req.body || {};

    if (approved === undefined) {
      return res.status(400).json({ error: 'missing_approved_flag' });
    }

    const result = await adminService.verifyDoctor({
      doctorId,
      approved: Boolean(approved),
      reason,
      adminUserId: adminUserId || null,
      step: step || 'all'
    });
    return res.json(result);
  } catch (err) {
    return handleError(req, res, err, 'verifyDoctor error');
  }
};

export const listTransactions = async (req, res) => {
  try {
    const transactions = await adminService.listTransactions();
    return res.json({ transactions });
  } catch (err) {
    return handleError(req, res, err, 'listTransactions error');
  }
};

export const upsertTransaction = async (req, res) => {
  try {
    const {
      transaction_id,
      appointment_id,
      amount,
      currency,
      status,
      provider,
      patient_email,
      doctor_email,
    } = req.body || {};

    if (!transaction_id || amount == null || !currency || !status) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    const record = await adminService.upsertTransactionRecord({
      transactionId: transaction_id,
      appointmentId: appointment_id || null,
      amount,
      currency,
      status,
      provider: provider || null,
      patientEmail: patient_email || null,
      doctorEmail: doctor_email || null,
    });

    return res.status(200).json({ record });
  } catch (err) {
    return handleError(req, res, err, 'upsertTransaction error');
  }
};

export const listAuditLogs = async (req, res) => {
  try {
    const { limit } = req.query || {};
    const logs = await adminService.listAuditLogs({ limit });
    return res.json({ logs });
  } catch (err) {
    return handleError(req, res, err, 'listAuditLogs error');
  }
};

export const getDashboardMetrics = async (req, res) => {
  try {
    const metrics = await adminService.getDashboardMetrics();
    return res.json(metrics);
  } catch (err) {
    return handleError(req, res, err, 'getDashboardMetrics error');
  }
};
