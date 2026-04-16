import db from "../config/db.js";
import logger from "../config/logger.js";
import * as appointmentService from "../services/appointmentService.js";
import * as doctorClient from "../services/doctorClient.js";

const EXPIRY_INTERVAL_MS = 60 * 1000; // 1 minute

const runExpiry = async () => {
  let expired;
  try {
    const { rows } = await db.query(
      `SELECT * FROM appointments
       WHERE payment_status = 'unpaid'
         AND appointment_status = 'pending'
         AND created_at < now() - interval '10 minutes'`,
    );
    expired = rows;
  } catch (err) {
    logger.error(err, "paymentExpiryJob: failed to query expired appointments");
    return;
  }

  if (expired.length === 0) return;

  logger.info(
    { count: expired.length },
    "paymentExpiryJob: processing expired appointments",
  );

  for (const appt of expired) {
    try {
      // Re-fetch current state: the doctor may have confirmed the appointment
      // between the batch query and now. This mirrors the webhook endpoint guard
      // which re-fetches the row before deciding whether to release the slot.
      const current = await appointmentService.getAppointmentById(
        db,
        appt.appointment_id,
      );

      await appointmentService.updatePaymentStatus(
        db,
        appt.appointment_id,
        "expired",
      );

      // Guard: if appointment was confirmed between the query and now,
      // keep the slot and appointment alive (same guard as the webhook endpoint).
      if (current.appointment_status !== "confirmed") {
        await doctorClient.updateSlotStatus(
          appt.doctor_id,
          appt.slot_id,
          "available",
        );
        await appointmentService.setStatus(
          db,
          appt.appointment_id,
          "cancelled",
        );
        await appointmentService.addEvent(db, appt.appointment_id, {
          event_type: "payment_expired",
          event_actor: null,
          notes: "Payment window elapsed — slot released",
        });
        logger.info(
          { appointmentId: appt.appointment_id },
          "paymentExpiryJob: appointment expired and slot released",
        );
      } else {
        await appointmentService.addEvent(db, appt.appointment_id, {
          event_type: "payment_expired_ignored",
          event_actor: null,
          notes:
            "Payment expired but appointment already confirmed — slot kept",
        });
        logger.info(
          { appointmentId: appt.appointment_id },
          "paymentExpiryJob: payment expired on confirmed appointment — slot kept",
        );
      }
    } catch (err) {
      logger.error(
        { err, appointmentId: appt.appointment_id },
        "paymentExpiryJob: failed to expire appointment",
      );
    }
  }
};

export const startPaymentExpiryJob = () => {
  logger.info("paymentExpiryJob: started (interval: 60s)");
  runExpiry();
  setInterval(runExpiry, EXPIRY_INTERVAL_MS);
};
