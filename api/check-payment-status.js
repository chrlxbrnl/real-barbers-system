const axios = require("axios");
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

function getSlotRef(appointment) {
  if (!appointment.date || !appointment.time) return null;

  return db
    .collection("appointmentSlots")
    .doc(getSlotId(appointment.date, appointment.time));
}

function getLatestPayment(paymentIntent = {}) {
  const payments = paymentIntent.attributes?.payments || [];

  if (!Array.isArray(payments) || payments.length === 0) return null;

  return payments.find((payment) => payment?.attributes) || payments[0];
}

function getPaymentDate(payment) {
  const attributes = payment?.attributes || {};
  const timestamp =
    attributes.paid_at || attributes.created_at || attributes.updated_at;

  if (typeof timestamp === "number") {
    return new Date(timestamp * 1000);
  }

  return new Date();
}

function getAmountPaid(payment, paymentIntent, appointment) {
  const amount =
    payment?.attributes?.amount || paymentIntent?.attributes?.amount || null;

  if (typeof amount === "number") return amount / 100;

  return appointment.amount || 150;
}

async function confirmAppointmentPayment({
  appointmentDoc,
  appointment,
  paymentIntent,
  payment,
}) {
  if (
    appointment.paymentStatus === "paid" ||
    appointment.paymentStatus === "paid_late"
  ) {
    return appointment;
  }

  const reservationExpiresAt = toDate(
    appointment.reservationExpiresAt ||
      appointment.reservedUntil ||
      appointment.slotReservedUntil,
  );
  const paymentDate = getPaymentDate(payment);
  const paymentArrivedAfterRelease =
    reservationExpiresAt &&
    reservationExpiresAt.getTime() < paymentDate.getTime();
  const amountPaid = getAmountPaid(payment, paymentIntent, appointment);
  const paymongoPaymentId = payment?.id || null;

  if (paymentArrivedAfterRelease) {
    const updates = {
      status: "payment_review",
      slotStatus: "released",
      paymentStatus: "paid_late",
      requiresAdminReview: true,
      adminReviewReason:
        "Payment completed after the slot reservation expired.",
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      latePaidAt: admin.firestore.FieldValue.serverTimestamp(),
      paymongoPaymentId,
      amountPaid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await appointmentDoc.ref.update(updates);
    return { ...appointment, ...updates };
  }

  const confirmationResult = await db.runTransaction(async (transaction) => {
    const freshAppointmentSnap = await transaction.get(appointmentDoc.ref);
    const freshAppointment = freshAppointmentSnap.data();
    const slotRef = getSlotRef(freshAppointment);
    let slot = null;

    if (slotRef) {
      const slotSnap = await transaction.get(slotRef);
      slot = slotSnap.exists ? slotSnap.data() : null;
    }

    const slotIsOwnedByAnotherAppointment =
      slot && slot.appointmentId && slot.appointmentId !== appointmentDoc.id;

    if (slotIsOwnedByAnotherAppointment) {
      const reviewUpdates = {
        status: "payment_review",
        slotStatus: "released",
        paymentStatus: "paid_late",
        requiresAdminReview: true,
        adminReviewReason:
          "Payment was successful, but this slot is no longer available.",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        latePaidAt: admin.firestore.FieldValue.serverTimestamp(),
        paymongoPaymentId,
        amountPaid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      transaction.update(appointmentDoc.ref, reviewUpdates);
      return { status: "review", appointment: { ...freshAppointment, ...reviewUpdates } };
    }

    const confirmedUpdates = {
      status: "confirmed",
      slotStatus: "paid",
      paymentStatus: "paid",
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      paymongoPaymentId,
      amountPaid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    transaction.update(appointmentDoc.ref, confirmedUpdates);

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

    return {
      status: "confirmed",
      appointment: { ...freshAppointment, ...confirmedUpdates },
    };
  });

  if (confirmationResult.status === "confirmed") {
    try {
      await sendAppointmentPaidEmail({
        ...confirmationResult.appointment,
        amountPaid,
      });

      await appointmentDoc.ref.update({
        confirmationEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
    }
  }

  return confirmationResult.appointment;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { appointmentId } = req.query || {};

    if (!appointmentId) {
      return res.status(400).json({ error: "Missing appointmentId" });
    }

    const appointmentDoc = await db
      .collection("appointments")
      .doc(appointmentId)
      .get();

    if (!appointmentDoc.exists) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const appointment = appointmentDoc.data();
    const paymentIntentId = appointment.paymongoPaymentIntentId;

    if (!paymentIntentId) {
      return res.status(200).json({
        paid: false,
        status: appointment.paymentStatus || "pending",
        appointmentId,
      });
    }

    if (
      appointment.paymentStatus === "paid" ||
      appointment.paymentStatus === "paid_late"
    ) {
      return res.status(200).json({
        paid: true,
        status: appointment.paymentStatus,
        appointmentId,
        paymentIntentId,
        paymentId: appointment.paymongoPaymentId || null,
        appointment,
      });
    }

    const paymongo = axios.create({
      baseURL: "https://api.paymongo.com/v1",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64"),
        "Content-Type": "application/json",
      },
    });

    const paymentIntentResponse = await paymongo.get(
      `/payment_intents/${paymentIntentId}`,
    );
    const paymentIntent = paymentIntentResponse.data.data;
    const payment = getLatestPayment(paymentIntent);
    const paymentIntentStatus = paymentIntent.attributes?.status;
    const paymentStatus = payment?.attributes?.status;
    const isPaid =
      paymentIntentStatus === "succeeded" ||
      paymentStatus === "paid" ||
      paymentStatus === "succeeded";

    if (!isPaid) {
      return res.status(200).json({
        paid: false,
        status: paymentIntentStatus || paymentStatus || "pending",
        appointmentId,
        paymentIntentId,
      });
    }

    const confirmedAppointment = await confirmAppointmentPayment({
      appointmentDoc,
      appointment,
      paymentIntent,
      payment,
    });

    return res.status(200).json({
      paid: true,
      status: confirmedAppointment.paymentStatus,
      appointmentId,
      paymentIntentId,
      paymentId: payment?.id || confirmedAppointment.paymongoPaymentId || null,
      appointment: confirmedAppointment,
    });
  } catch (error) {
    console.error(error.response?.data || error.message);

    return res.status(500).json({
      error: "Failed to check payment status",
      details: error.response?.data || error.message,
    });
  }
};
