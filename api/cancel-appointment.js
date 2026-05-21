const admin = require("../lib/firebaseAdmin");

const db = admin.firestore();

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getSlotId(date, time) {
  return `${date}_${time}`.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { appointmentId, reason } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ error: "Missing appointmentId" });
    }

    const isExpired = reason === "expired";
    const appointmentRef = db.collection("appointments").doc(appointmentId);

    await db.runTransaction(async (transaction) => {
      const appointmentSnap = await transaction.get(appointmentRef);

      if (!appointmentSnap.exists) {
        throw Object.assign(new Error("Appointment not found"), { statusCode: 404 });
      }

      const appointment = appointmentSnap.data();

      if (
        appointment.paymentStatus === "paid" ||
        appointment.paymentStatus === "paid_late" ||
        appointment.status === "confirmed"
      ) {
        throw Object.assign(
          new Error("Cannot cancel because payment is already completed."),
          { statusCode: 400 },
        );
      }

      if (isExpired) {
        const reservationExpiresAt = toDate(
          appointment.reservationExpiresAt ||
            appointment.reservedUntil ||
            appointment.slotReservedUntil,
        );

        if (reservationExpiresAt && reservationExpiresAt > new Date()) {
          throw Object.assign(
            new Error("Reservation has not expired yet."),
            { statusCode: 409 },
          );
        }
      }

      let slotRef = null;
      let shouldReleaseSlot = false;
      if (appointment.date && appointment.time) {
        slotRef = db
          .collection("appointmentSlots")
          .doc(getSlotId(appointment.date, appointment.time));
        const slotSnap = await transaction.get(slotRef);
        const slot = slotSnap.exists ? slotSnap.data() : null;
        shouldReleaseSlot = !slot || slot.appointmentId === appointmentId;
      }

      transaction.update(appointmentRef, {
        status: isExpired ? "expired" : "cancelled",
        slotStatus: isExpired ? "expired" : "released",
        paymentStatus: isExpired ? "expired" : "cancelled",
        [isExpired ? "expiredAt" : "cancelledAt"]:
          admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (slotRef && shouldReleaseSlot) {
        transaction.set(
          slotRef,
          {
            appointmentId,
            date: appointment.date,
            time: appointment.time,
            status: "available",
            slotStatus: "available",
            paymentStatus: isExpired ? "expired" : "cancelled",
            [isExpired ? "expiredAt" : "cancelledAt"]:
              admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.statusCode ? error.message : "Failed to cancel appointment" });
  }
};
