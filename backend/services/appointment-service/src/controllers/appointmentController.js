import * as appointmentService from "../services/appointmentService.js";
import * as doctorClient from "../services/doctorClient.js";
import * as notificationClient from "../services/notificationClient.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const handleError = (err, res, req, context) => {
  req.log.error(err, context);
  if (err.status) return res.status(err.status).json({ error: err.message });
  return res.status(500).json({ error: "internal_error" });
};

// ─── Doctor Search (proxy to doctor-management-service) ───────────────────────

export const searchDoctors = async (req, res) => {
  try {
    const doctors = await doctorClient.searchDoctors(
      req.headers.authorization,
      req.query,
    );
    return res.json({ doctors });
  } catch (err) {
    return handleError(err, res, req, "searchDoctors");
  }
};

// ─── Book Appointment ─────────────────────────────────────────────────────────

export const bookAppointment = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({ error: "forbidden" });
    }

    const { doctor_id, slot_id, reason_for_visit } = req.body;

    // 1. Get doctor details — verifies doctor exists and retrieves their email
    const doctor = await doctorClient.getDoctor(
      req.headers.authorization,
      doctor_id,
    );

    // 2. Mark the slot as booked in doctor-management-service (uses service JWT)
    await doctorClient.updateSlotStatus(doctor_id, slot_id, "booked");

    // 3. Persist appointment
    const appointment = await appointmentService.createAppointment(req.db, {
      patient_id: req.user.id,
      doctor_id,
      slot_id,
      patient_email: req.user.email,
      reason_for_visit,
    });

    // 4. Log event
    await appointmentService.addEvent(req.db, appointment.appointment_id, {
      event_type: "appointment_booked",
      event_actor: req.user.id,
      notes: `Booked by patient ${req.user.email}`,
    });

    // 5. Notify patient (best-effort — don't fail booking on notification error)
    notificationClient
      .sendEmail({
        callerId: req.user.id,
        callerRole: req.user.role,
        recipient_user_id: req.user.id,
        recipient_email: req.user.email,
        message: `Your appointment with Dr. ${doctor.full_name} has been booked successfully. Status: pending confirmation.`,
      })
      .catch((err) => req.log.warn(err, "patient booking notification failed"));

    // 6. Notify doctor (best-effort)
    notificationClient
      .sendEmail({
        callerId: req.user.id,
        callerRole: req.user.role,
        recipient_user_id: doctor.user_id,
        recipient_email: doctor.email,
        message: `A new appointment request has been made by ${req.user.email}. Please confirm or reject it.`,
      })
      .catch((err) => req.log.warn(err, "doctor booking notification failed"));

    return res.status(201).json({ appointment });
  } catch (err) {
    return handleError(err, res, req, "bookAppointment");
  }
};

// ─── Get Single Appointment ───────────────────────────────────────────────────

export const getAppointment = async (req, res) => {
  try {
    const appointment = await appointmentService.getAppointmentById(
      req.db,
      req.params.appointmentId,
    );

    if (req.user.role === "admin") {
      return res.json({ appointment });
    }
    if (req.user.role === "patient") {
      if (appointment.patient_id !== req.user.id) {
        return res.status(403).json({ error: "forbidden" });
      }
      return res.json({ appointment });
    }
    if (req.user.role === "doctor") {
      const doctor = await doctorClient.getDoctor(
        req.headers.authorization,
        appointment.doctor_id,
      );
      if (doctor.user_id !== req.user.id) {
        return res.status(403).json({ error: "forbidden" });
      }
      return res.json({ appointment });
    }

    return res.status(403).json({ error: "forbidden" });
  } catch (err) {
    return handleError(err, res, req, "getAppointment");
  }
};
// ─── Get Appointment Events ────────────────────────────────────────────────────────────

export const getAppointmentEvents = async (req, res) => {
  try {
    const appointment = await appointmentService.getAppointmentById(
      req.db,
      req.params.appointmentId,
    );

    if (req.user.role === "admin") {
      const events = await appointmentService.getEvents(
        req.db,
        req.params.appointmentId,
      );
      return res.json({ events });
    }
    if (req.user.role === "patient") {
      if (appointment.patient_id !== req.user.id) {
        return res.status(403).json({ error: "forbidden" });
      }
      const events = await appointmentService.getEvents(
        req.db,
        req.params.appointmentId,
      );
      return res.json({ events });
    }
    if (req.user.role === "doctor") {
      const doctor = await doctorClient.getDoctor(
        req.headers.authorization,
        appointment.doctor_id,
      );
      if (doctor.user_id !== req.user.id) {
        return res.status(403).json({ error: "forbidden" });
      }
      const events = await appointmentService.getEvents(
        req.db,
        req.params.appointmentId,
      );
      return res.json({ events });
    }

    return res.status(403).json({ error: "forbidden" });
  } catch (err) {
    return handleError(err, res, req, "getAppointmentEvents");
  }
};
// ─── Reschedule Appointment ───────────────────────────────────────────────────

export const updateAppointment = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({ error: "forbidden" });
    }

    const appointment = await appointmentService.getAppointmentById(
      req.db,
      req.params.appointmentId,
    );
    if (appointment.patient_id !== req.user.id) {
      return res.status(403).json({ error: "forbidden" });
    }
    if (appointment.appointment_status !== "pending") {
      const e = new Error("appointment_not_pending");
      e.status = 400;
      throw e;
    }

    const { slot_id, reason_for_visit } = req.body || {};

    // If rescheduling to a different slot: release old, book new
    if (slot_id && slot_id !== appointment.slot_id) {
      await doctorClient.updateSlotStatus(
        appointment.doctor_id,
        appointment.slot_id,
        "available",
      );
      await doctorClient.updateSlotStatus(
        appointment.doctor_id,
        slot_id,
        "booked",
      );
    }

    const updates = {};
    if (slot_id) updates.slot_id = slot_id;
    if (reason_for_visit) updates.reason_for_visit = reason_for_visit;

    const updated = await appointmentService.updateAppointment(
      req.db,
      req.params.appointmentId,
      updates,
    );
    return res.json({ appointment: updated });
  } catch (err) {
    return handleError(err, res, req, "updateAppointment");
  }
};

// ─── Cancel Appointment ───────────────────────────────────────────────────────

export const cancelAppointment = async (req, res) => {
  try {
    const appointment = await appointmentService.getAppointmentById(
      req.db,
      req.params.appointmentId,
    );

    // Patients cancel own; admins can cancel any
    if (req.user.role !== "admin" && appointment.patient_id !== req.user.id) {
      return res.status(403).json({ error: "forbidden" });
    }
    if (appointment.appointment_status === "cancelled") {
      const e = new Error("appointment_already_cancelled");
      e.status = 400;
      throw e;
    }

    // Release the slot back to available
    await doctorClient.updateSlotStatus(
      appointment.doctor_id,
      appointment.slot_id,
      "available",
    );

    const cancelled = await appointmentService.setStatus(
      req.db,
      req.params.appointmentId,
      "cancelled",
    );

    await appointmentService.addEvent(req.db, req.params.appointmentId, {
      event_type: "appointment_cancelled",
      event_actor: req.user.id,
      notes: `Cancelled by ${req.user.role}`,
    });

    return res.json({ appointment: cancelled });
  } catch (err) {
    return handleError(err, res, req, "cancelAppointment");
  }
};

// ─── List by Patient ──────────────────────────────────────────────────────────

export const listByPatient = async (req, res) => {
  try {
    // Patient can only see their own; admin can see any patient's
    if (req.user.role !== "admin" && req.user.id !== req.params.patientId) {
      return res.status(403).json({ error: "forbidden" });
    }
    const appointments = await appointmentService.listByPatient(
      req.db,
      req.params.patientId,
    );
    return res.json({ appointments });
  } catch (err) {
    return handleError(err, res, req, "listByPatient");
  }
};

// ─── List by Doctor ───────────────────────────────────────────────────────────

export const listByDoctor = async (req, res) => {
  try {
    if (req.user.role !== "doctor" && req.user.role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }

    // Doctor must own the profile they're querying against
    if (req.user.role === "doctor") {
      const doctor = await doctorClient.getDoctor(
        req.headers.authorization,
        req.params.doctorId,
      );
      if (doctor.user_id !== req.user.id) {
        return res.status(403).json({ error: "forbidden" });
      }
    }

    const appointments = await appointmentService.listByDoctor(
      req.db,
      req.params.doctorId,
    );
    return res.json({ appointments });
  } catch (err) {
    return handleError(err, res, req, "listByDoctor");
  }
};

// ─── Force-set Status (admin) or Mark Complete (doctor) ──────────────────────

export const setStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ error: "status_required" });

    if (req.user.role === "doctor") {
      // Doctors may only mark their own confirmed appointments as completed.
      if (status !== "completed") {
        return res.status(403).json({ error: "forbidden" });
      }

      const appointment = await appointmentService.getAppointmentById(
        req.db,
        req.params.appointmentId,
      );

      const doctor = await doctorClient.getDoctor(
        req.headers.authorization,
        appointment.doctor_id,
      );
      if (doctor.user_id !== req.user.id) {
        return res.status(403).json({ error: "forbidden" });
      }

      if (appointment.appointment_status !== "confirmed") {
        return res.status(400).json({ error: "appointment_not_confirmed" });
      }

      const updated = await appointmentService.setStatus(
        req.db,
        req.params.appointmentId,
        "completed",
      );

      await appointmentService.addEvent(req.db, req.params.appointmentId, {
        event_type: "status_override",
        event_actor: req.user.id,
        notes: "Doctor marked appointment as completed",
      });

      return res.json({ appointment: updated });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }

    const appointment = await appointmentService.setStatus(
      req.db,
      req.params.appointmentId,
      status,
    );

    await appointmentService.addEvent(req.db, req.params.appointmentId, {
      event_type: "status_override",
      event_actor: req.user.id,
      notes: `Admin set status to ${status}`,
    });

    return res.json({ appointment });
  } catch (err) {
    return handleError(err, res, req, "setStatus");
  }
};

// ─── Doctor Decision (accept / reject) ───────────────────────────────────────

export const doctorDecision = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ error: "forbidden" });
    }

    const { decision } = req.body || {};
    if (!["accept", "reject"].includes(decision)) {
      return res.status(400).json({ error: "invalid_decision" });
    }

    const appointment = await appointmentService.getAppointmentById(
      req.db,
      req.params.appointmentId,
    );

    // Verify this doctor owns the appointment
    const doctor = await doctorClient.getDoctor(
      req.headers.authorization,
      appointment.doctor_id,
    );
    if (doctor.user_id !== req.user.id) {
      return res.status(403).json({ error: "forbidden" });
    }

    if (appointment.appointment_status !== "pending") {
      const e = new Error("appointment_not_pending");
      e.status = 400;
      throw e;
    }

    const newStatus = decision === "accept" ? "confirmed" : "rejected";

    // When rejecting, release the slot so other patients can book it again.
    if (decision === "reject") {
      await doctorClient.updateSlotStatus(
        appointment.doctor_id,
        appointment.slot_id,
        "available",
      );
    }

    const updated = await appointmentService.setStatus(
      req.db,
      req.params.appointmentId,
      newStatus,
    );

    await appointmentService.addEvent(req.db, req.params.appointmentId, {
      event_type: `appointment_${newStatus}`,
      event_actor: req.user.id,
      notes: `Doctor decision: ${decision}`,
    });

    // Notify patient of the decision (best-effort)
    notificationClient
      .sendEmail({
        callerId: req.user.id,
        callerRole: req.user.role,
        recipient_user_id: appointment.patient_id,
        recipient_email: appointment.patient_email,
        message: `Your appointment has been ${newStatus} by Dr. ${doctor.full_name}.`,
      })
      .catch((err) => req.log.warn(err, "doctor decision notification failed"));

    return res.json({ appointment: updated });
  } catch (err) {
    return handleError(err, res, req, "doctorDecision");
  }
};
