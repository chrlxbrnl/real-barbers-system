const axios = require("axios");
const admin = require("../lib/firebaseAdmin");

const db = admin.firestore();
const RESERVATION_WINDOW_MINUTES = Number(
  process.env.RESERVATION_WINDOW_MINUTES || 5,
);
const PAYMENT_QR_VALIDITY_MINUTES = 30;
const APPOINTMENT_AMOUNT_PHP = Number(process.env.APPOINTMENT_AMOUNT_PHP || 1);
const APPOINTMENT_AMOUNT_CENTAVOS = Math.round(APPOINTMENT_AMOUNT_PHP * 100);
const ACTIVE_FINAL_PAYMENT_STATUSES = new Set(["paid"]);
const INACTIVE_STATUSES = new Set([
  "available",
  "expired",
  "cancelled",
  "canceled",
  "payment_failed",
  "failed",
  "released",
]);

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

function isActiveSlotHold(appointment, now) {
  const status = appointment.status;
  const slotStatus = appointment.slotStatus;
  const paymentStatus = appointment.paymentStatus;

  if (
    ACTIVE_FINAL_PAYMENT_STATUSES.has(paymentStatus) ||
    slotStatus === "paid" ||
    status === "confirmed" ||
    status === "completed"
  ) {
    return true;
  }

  if (INACTIVE_STATUSES.has(status) || INACTIVE_STATUSES.has(slotStatus)) {
    return false;
  }

  const reservationExpiresAt = toDate(
    appointment.reservationExpiresAt ||
      appointment.reservedUntil ||
      appointment.slotReservedUntil,
  );

  if (
    (status === "reserved" ||
      status === "pending_payment" ||
      slotStatus === "reserved" ||
      paymentStatus === "pending" ||
      paymentStatus === "unpaid") &&
    reservationExpiresAt &&
    reservationExpiresAt > now
  ) {
    return true;
  }

  return false;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let appointmentRef = null;
  let slotRefForCleanup = null;

  try {
    const { appointmentId, userId, fullName, email, date, time } = req.body;

    if (!userId || !email || !date || !time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const now = new Date();
    const reservationExpiresAt = new Date(
      now.getTime() + RESERVATION_WINDOW_MINUTES * 60 * 1000,
    );
    const paymentExpiresAt = new Date(
      now.getTime() + PAYMENT_QR_VALIDITY_MINUTES * 60 * 1000,
    );

    appointmentRef = await db.runTransaction(async (transaction) => {
      const slotRef = db.collection("appointmentSlots").doc(getSlotId(date, time));
      slotRefForCleanup = slotRef;
      const requestedAppointmentRef = appointmentId
        ? db.collection("appointments").doc(appointmentId)
        : null;
      const requestedAppointmentSnapshot = requestedAppointmentRef
        ? await transaction.get(requestedAppointmentRef)
        : null;
      const slotLockSnapshot = await transaction.get(slotRef);
      let reusableAppointmentRef = null;

      if (requestedAppointmentRef) {
        if (!requestedAppointmentSnapshot.exists) {
          throw Object.assign(new Error("Appointment not found."), {
            statusCode: 404,
          });
        }

        const requestedAppointment = requestedAppointmentSnapshot.data();

        if (
          requestedAppointment.userId !== userId ||
          requestedAppointment.date !== date ||
          requestedAppointment.time !== time
        ) {
          throw Object.assign(
            new Error("Appointment does not match this payment request."),
            { statusCode: 400 },
          );
        }

        if (
          requestedAppointment.paymentStatus === "paid" ||
          requestedAppointment.status === "confirmed" ||
          requestedAppointment.status === "completed"
        ) {
          throw Object.assign(new Error("Appointment is already paid."), {
            statusCode: 400,
          });
        }

        reusableAppointmentRef = requestedAppointmentRef;
      }

      if (
        slotLockSnapshot.exists &&
        isActiveSlotHold(slotLockSnapshot.data(), now) &&
        slotLockSnapshot.data().appointmentId !== reusableAppointmentRef?.id
      ) {
        throw Object.assign(
          new Error("This time slot is already reserved or booked."),
          { statusCode: 409 },
        );
      }

      const slotQuery = db
        .collection("appointments")
        .where("date", "==", date)
        .where("time", "==", time);
      const slotSnapshot = await transaction.get(slotQuery);

      const staleReservationRefs = [];
      const hasActiveConflict = slotSnapshot.docs.some((docSnapshot) => {
        if (docSnapshot.id === reusableAppointmentRef?.id) {
          return false;
        }

        const appointment = docSnapshot.data();

        if (isActiveSlotHold(appointment, now)) {
          return true;
        }

        if (
          appointment.status === "pending_payment" ||
          appointment.status === "reserved"
        ) {
          staleReservationRefs.push(docSnapshot.ref);
        }

        return false;
      });

      if (hasActiveConflict) {
        throw Object.assign(
          new Error("This time slot is already reserved or booked."),
          { statusCode: 409 },
        );
      }

      staleReservationRefs.forEach((staleRef) => {
        transaction.update(staleRef, {
          status: "expired",
          paymentStatus: "expired",
          slotStatus: "expired",
          expiredAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      const newAppointmentRef = reusableAppointmentRef || db.collection("appointments").doc();
      transaction.set(newAppointmentRef, {
        userId,
        fullName: fullName || "",
        email,
        date,
        time,
        status: "reserved",
        slotStatus: "reserved",
        paymentStatus: "pending",
        paymentMethod: "qrph",
        amount: APPOINTMENT_AMOUNT_PHP,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        reservationExpiresAt:
          admin.firestore.Timestamp.fromDate(reservationExpiresAt),
        paymentExpiresAt: admin.firestore.Timestamp.fromDate(paymentExpiresAt),
      }, { merge: Boolean(reusableAppointmentRef) });
      transaction.set(slotRef, {
        appointmentId: newAppointmentRef.id,
        date,
        time,
        status: "reserved",
        slotStatus: "reserved",
        paymentStatus: "pending",
        reservationExpiresAt:
          admin.firestore.Timestamp.fromDate(reservationExpiresAt),
        paymentExpiresAt: admin.firestore.Timestamp.fromDate(paymentExpiresAt),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return newAppointmentRef;
    });

    const paymongo = axios.create({
      baseURL: "https://api.paymongo.com/v1",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64"),
        "Content-Type": "application/json",
      },
    });

    const paymentIntent = await paymongo.post("/payment_intents", {
      data: {
        attributes: {
          amount: APPOINTMENT_AMOUNT_CENTAVOS,
          currency: "PHP",
          payment_method_allowed: ["qrph"],
          description: `Real Barbers appointment - ${date} ${time}`,
          metadata: {
            appointmentId: appointmentRef.id,
            userId,
          },
        },
      },
    });

    const paymentMethod = await paymongo.post("/payment_methods", {
      data: {
        attributes: {
          type: "qrph",
          billing: {
            name: fullName || "Real Barbers Customer",
            email,
          },
        },
      },
    });

    const attachedIntent = await paymongo.post(
      `/payment_intents/${paymentIntent.data.data.id}/attach`,
      {
        data: {
          attributes: {
            payment_method: paymentMethod.data.data.id,
          },
        },
      }
    );

    const qrImage =
      attachedIntent.data.data.attributes.next_action?.code?.image_url;

    await appointmentRef.update({
      paymongoPaymentIntentId: attachedIntent.data.data.id,
      qrImage,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      appointmentId: appointmentRef.id,
      paymentIntentId: attachedIntent.data.data.id,
      amount: APPOINTMENT_AMOUNT_PHP,
      qrImage,
      reservationExpiresAt,
      paymentExpiresAt,
      expiresAt: paymentExpiresAt,
      reservationWindowMinutes: RESERVATION_WINDOW_MINUTES,
      paymentQrValidityMinutes: PAYMENT_QR_VALIDITY_MINUTES,
    });
  } catch (error) {
    console.error(error.response?.data || error.message);

    if (appointmentRef && !error.statusCode) {
      try {
        await appointmentRef.update({
          status: "payment_failed",
          slotStatus: "released",
          paymentStatus: "failed",
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        if (slotRefForCleanup) {
          await slotRefForCleanup.set(
            {
              appointmentId: appointmentRef.id,
              status: "available",
              slotStatus: "available",
              paymentStatus: "failed",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        }
      } catch (cleanupError) {
        console.error("Failed to release payment reservation", cleanupError);
      }
    }

    return res.status(error.statusCode || 500).json({
      error: error.statusCode
        ? error.message
        : "Failed to create QRPh payment",
      details: error.response?.data || error.message,
    });
  }
};
