const admin = require("../lib/firebaseAdmin");
const { sendAppointmentPaidEmail } = require("../lib/sendAppointmentEmail");

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

function isActiveSlotHold(slot = {}, now = new Date()) {
  if (
    slot.paymentStatus === "paid" ||
    slot.slotStatus === "paid" ||
    slot.status === "confirmed"
  ) {
    return true;
  }

  if (
    slot.status === "available" ||
    slot.status === "expired" ||
    slot.status === "cancelled" ||
    slot.status === "canceled" ||
    slot.status === "payment_failed" ||
    slot.slotStatus === "available" ||
    slot.slotStatus === "released" ||
    slot.slotStatus === "expired"
  ) {
    return false;
  }

  const reservationExpiresAt = toDate(
    slot.reservationExpiresAt || slot.reservedUntil || slot.slotReservedUntil,
  );

  return Boolean(
    reservationExpiresAt &&
    reservationExpiresAt > now &&
    (slot.status === "reserved" || slot.slotStatus === "reserved"),
  );
}

function getEventDate(attributes = {}) {
  const timestamp =
    attributes.paid_at ||
    attributes.failed_at ||
    attributes.created_at ||
    attributes.updated_at;

  if (typeof timestamp === "number") {
    return new Date(timestamp * 1000);
  }

  return new Date();
}

function getSlotRef(appointment) {
  if (!appointment.date || !appointment.time) return;

  return db
    .collection("appointmentSlots")
    .doc(getSlotId(appointment.date, appointment.time));
}

async function updateSlotLockIfCurrent(appointment, appointmentId, updates) {
  const slotRef = getSlotRef(appointment);
  if (!slotRef) return;

  await db.runTransaction(async (transaction) => {
    const slotSnap = await transaction.get(slotRef);
    const slot = slotSnap.exists ? slotSnap.data() : null;

    if (slot && slot.appointmentId && slot.appointmentId !== appointmentId) {
      return;
    }

    transaction.set(
      slotRef,
      {
        appointmentId,
        date: appointment.date,
        time: appointment.time,
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }
  
  console.log("PAYMONGO WEBHOOK RECEIVED:");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const event = req.body.data;

    if (!event || !event.attributes) {
      return res.status(400).send("Invalid webhook payload");
    }

    const eventType = event.attributes.type;
    const eventData = event.attributes.data;

    if (!eventData || !eventData.attributes) {
      return res.status(400).send("Invalid event data");
    }

    let paymentIntentId = null;

    if (eventType === "payment.paid" || eventType === "payment.failed") {
      paymentIntentId = eventData.attributes.payment_intent_id;
    }

    if (eventType === "qrph.expired") {
      paymentIntentId = eventData.id;
    }

    if (!paymentIntentId) {
      return res.status(200).send("Ignored");
    }

    const snapshot = await db
      .collection("appointments")
      .where("paymongoPaymentIntentId", "==", paymentIntentId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(200).send("No matching appointment");
    }

    const appointmentDoc = snapshot.docs[0];
    const appointment = appointmentDoc.data();

    if (
      appointment.paymentStatus === "paid" ||
      appointment.paymentStatus === "paid_late"
    ) {
      return res.status(200).send("Payment already recorded");
    }

    if (eventType === "payment.paid") {
      const reservationExpiresAt = toDate(
        appointment.reservationExpiresAt ||
          appointment.reservedUntil ||
          appointment.slotReservedUntil,
      );
      const paymentEventDate = getEventDate(eventData.attributes);
      const paymentArrivedAfterRelease =
        reservationExpiresAt &&
        reservationExpiresAt.getTime() < paymentEventDate.getTime();
      const amountPaid =
        typeof eventData.attributes.amount === "number"
          ? eventData.attributes.amount / 100
          : appointment.amount || 150;

      if (paymentArrivedAfterRelease) {
        await appointmentDoc.ref.update({
          status: "payment_review",
          slotStatus: "released",
          paymentStatus: "paid_late",
          requiresAdminReview: true,
          adminReviewReason:
            "Payment completed after the slot reservation expired.",
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          latePaidAt: admin.firestore.FieldValue.serverTimestamp(),
          paymongoPaymentId: eventData.id,
          amountPaid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await updateSlotLockIfCurrent(appointment, appointmentDoc.id, {
          status: "available",
          slotStatus: "available",
          paymentStatus: "paid_late",
        });

        return res.status(200).send("Late payment flagged for admin handling");
      }

      const confirmationResult = await db.runTransaction(
        async (transaction) => {
          const freshAppointmentSnap = await transaction.get(
            appointmentDoc.ref,
          );
          const freshAppointment = freshAppointmentSnap.data();
          const slotRef = getSlotRef(freshAppointment);
          let slot = null;

          if (slotRef) {
            const slotSnap = await transaction.get(slotRef);
            slot = slotSnap.exists ? slotSnap.data() : null;
          }

          const slotIsOwnedByAnotherAppointment =
            slot &&
            slot.appointmentId &&
            slot.appointmentId !== appointmentDoc.id &&
            isActiveSlotHold(slot);

          if (slotIsOwnedByAnotherAppointment) {
            transaction.update(appointmentDoc.ref, {
              status: "payment_review",
              slotStatus: "released",
              paymentStatus: "paid_late",
              requiresAdminReview: true,
              adminReviewReason:
                "Payment was successful, but this slot is no longer available.",
              paidAt: admin.firestore.FieldValue.serverTimestamp(),
              latePaidAt: admin.firestore.FieldValue.serverTimestamp(),
              paymongoPaymentId: eventData.id,
              amountPaid,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return "review";
          }

          transaction.update(appointmentDoc.ref, {
            status: "confirmed",
            slotStatus: "paid",
            paymentStatus: "paid",
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            paymongoPaymentId: eventData.id,
            amountPaid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          if (slotRef) {
            transaction.set(
              slotRef,
              {
                appointmentId: appointmentDoc.id,
                date: freshAppointment.date,
                time: freshAppointment.time,
                status: "confirmed",
                slotStatus: "paid",
                paymentStatus: "paid",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
          }

          return "confirmed";
        },
      );

      if (confirmationResult === "confirmed") {
        try {
          await sendAppointmentPaidEmail({
            ...appointment,
            amountPaid,
          });

          await appointmentDoc.ref.update({
            confirmationEmailSentAt:
              admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (emailError) {
          console.error("Failed to send confirmation email:", emailError);
        }
      }

      return res
        .status(200)
        .send(
          confirmationResult === "review"
            ? "Payment flagged for admin handling"
            : "Appointment confirmed",
        );
    }

    if (eventType === "payment.failed") {
      await appointmentDoc.ref.update({
        status: "payment_failed",
        slotStatus: "released",
        paymentStatus: "failed",
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await updateSlotLockIfCurrent(appointment, appointmentDoc.id, {
        status: "available",
        slotStatus: "available",
        paymentStatus: "failed",
      });

      return res.status(200).send("Payment failed updated");
    }

    if (eventType === "qrph.expired") {
      await appointmentDoc.ref.update({
        status: "expired",
        slotStatus: "expired",
        paymentStatus: "expired",
        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await updateSlotLockIfCurrent(appointment, appointmentDoc.id, {
        status: "available",
        slotStatus: "available",
        paymentStatus: "expired",
      });

      return res.status(200).send("QR expired updated");
    }

    return res.status(200).send("Ignored");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Webhook error");
  }
};
