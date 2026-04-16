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
         AND appointment_status = 'confirmed'
         AND payment_deadline IS NOT NULL
         AND payment_deadline < now()`,
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
      // Re-fetch to guard against concurrent cron ticks processing the same row.
      const current = await appointmentService.getAppointmentById(
        db,
        appt.appointment_id,
      );

      await appointmentService.updatePaymentStatus(
        db,
        appt.appointment_id,
        "expired",
      );

      // All rows from the query are confirmed+unpaid with an elapsed deadline —
      // always release the slot and cancel the appointment.
      // The re-fetch guards against the rare race where two cron ticks overlap.
      if (current.payment_status !== "paid") {
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
        // Race: payment landed between our query and now — don't cancel
        await appointmentService.addEvent(db, appt.appointment_id, {
          event_type: "payment_expired_ignored",
          event_actor: null,
          notes:
            "Payment already received before expiry could be processed — row kept",
        });
        logger.info(
          { appointmentId: appt.appointment_id },
          "paymentExpiryJob: payment already received — expiry skipped",
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
