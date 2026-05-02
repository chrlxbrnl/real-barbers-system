import { db } from "../firebase/firebase";
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    getDocs,
    doc,
    deleteDoc,
    updateDoc,
} from "firebase/firestore";

export const RESERVATION_WINDOW_MINUTES = 5;
export const PAYMENT_QR_VALIDITY_MINUTES = 30;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseTimeString(timeStr = "") {
  const [timePart, period] = timeStr.split(" ");
  const [hours, minutes] = timePart.split(":").map(Number);
  const adjustedHours = period === "PM" && hours !== 12 ? hours + 12 : hours === 12 && period === "AM" ? 0 : hours;
  return { hours: adjustedHours, minutes };
}

export function getAppointmentDateTime(appointmentDate, appointmentTime) {
  if (!appointmentDate || !appointmentTime) return null;

  const [monthStr, dayStr, yearStr] = appointmentDate.split(" ");
  const monthIndex = MONTH_NAMES.indexOf(monthStr);
  const day = parseInt(dayStr.replace(",", ""));
  const year = parseInt(yearStr);
  const { hours, minutes } = parseTimeString(appointmentTime);

  if (monthIndex < 0 || Number.isNaN(day) || Number.isNaN(year)) return null;

  return new Date(year, monthIndex, day, hours, minutes);
}

export function hasAppointmentStarted(appointmentDate, appointmentTime) {
  const appointmentDateTime = getAppointmentDateTime(appointmentDate, appointmentTime);
  if (!appointmentDateTime) return false;

  return appointmentDateTime < new Date();
}

const normalizeStatus = (status) =>
  status?.toString().trim().toLowerCase().replace(/[\s-]+/g, "_");

export function normalizeAppointmentStatus(status) {
  return normalizeStatus(status);
}

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getReservationExpiresAt(record = {}) {
  const explicitReservationExpiresAt = toDate(
    record.reservationExpiresAt ||
      record.reservedUntil ||
      record.slotReservedUntil,
  );

  if (explicitReservationExpiresAt) return explicitReservationExpiresAt;

  const createdAt = toDate(record.createdAt);
  if (createdAt) return getFallbackReservationExpiresAt(createdAt);

  return null;
}

export function getFallbackReservationExpiresAt(now = new Date()) {
  return new Date(now.getTime() + RESERVATION_WINDOW_MINUTES * 60 * 1000);
}

export function getReservationSecondsRemaining(record = {}, now = new Date()) {
  const expiresAt = getReservationExpiresAt(record);
  if (!expiresAt) return null;

  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000));
}

export function formatReservationCountdown(seconds) {
  if (seconds === null || seconds === undefined) return "--:--";

  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function isReservationExpired(record = {}, now = new Date()) {
  const paymentStatus = normalizeStatus(record.paymentStatus);
  const status = normalizeStatus(record.status);
  const expiresAt = getReservationExpiresAt(record);

  if (!expiresAt) return false;
  if (
    paymentStatus === "paid" ||
    paymentStatus === "paid_late" ||
    paymentStatus === "expired" ||
    paymentStatus === "failed" ||
    paymentStatus === "cancelled" ||
    paymentStatus === "canceled" ||
    status === "confirmed" ||
    status === "completed" ||
    status === "expired" ||
    status === "payment_failed" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "payment_review" ||
    record.requiresAdminReview
  ) {
    return false;
  }

  return expiresAt.getTime() <= now.getTime();
}

export function isActiveSlotReservation(record = {}, now = new Date()) {
  const status = normalizeStatus(record.status);
  const slotStatus = normalizeStatus(record.slotStatus);
  const paymentStatus = normalizeStatus(record.paymentStatus);

  if (
    paymentStatus === "paid" ||
    slotStatus === "paid" ||
    status === "confirmed" ||
    status === "completed"
  ) {
    return true;
  }

  if (
    status === "expired" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "payment_failed" ||
    status === "available" ||
    slotStatus === "expired" ||
    slotStatus === "released" ||
    slotStatus === "available"
  ) {
    return false;
  }

  if (isReservationExpired(record, now)) return false;

  return (
    status === "reserved" ||
    status === "pending_payment" ||
    slotStatus === "reserved" ||
    paymentStatus === "pending"
  );
}

export function getResolvedAppointmentStatus(appointment) {
  const status = normalizeStatus(appointment.status);
  const paymentStatus = normalizeStatus(appointment.paymentStatus);

  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "payment_review" || paymentStatus === "paid_late") {
    return "payment_review";
  }
  if (status === "expired" || paymentStatus === "expired") return "expired";
  if (status === "completed") return "completed";
  if (status === "no_show") return "no-show";
  if (isReservationExpired(appointment)) return "expired";

  if (!hasAppointmentStarted(appointment.date, appointment.time)) {
    return appointment.status || "pending";
  }

  if (paymentStatus === "paid") return "completed";

  return "no-show";
}

export function getPaymentLabel(paymentStatus) {
  const normalizedStatus = normalizeStatus(paymentStatus);

  if (normalizedStatus === "paid") return "Paid";
  if (normalizedStatus === "paid_late") return "Paid - review";

  return "Unpaid";
}

export function getPaymentReferenceId(record = {}) {
  const candidates = [
    record.paymentId,
    record.payment_id,
    record.paymongoPaymentId,
    record.paymongoPaymentID,
    record.referenceId,
    record.reference_id,
    record.referenceNumber,
    record.reference_number,
    record.sourceId,
    record.source_id,
    record.paymongoSourceId,
    record.paymentIntentId,
    record.payment_intent_id,
    record.checkoutSessionId,
    record.checkout_session_id,
    record.paymongoId,
    record.payment?.id,
    record.source?.id,
    record.paymentIntent?.id,
    record.checkoutSession?.id,
    record.data?.id,
  ];

  return candidates.find((candidate) => candidate)?.toString() || "";
}

export async function syncPassedAppointmentStatuses(appointments) {
  const updates = appointments
    .map((appointment) => ({
      ...appointment,
      resolvedStatus: getResolvedAppointmentStatus(appointment),
    }))
    .filter((appointment) => {
      const currentStatus = normalizeStatus(appointment.status);
      return (
        (appointment.resolvedStatus === "completed" ||
          appointment.resolvedStatus === "no-show") &&
        currentStatus !== normalizeStatus(appointment.resolvedStatus)
      );
    })
    .map((appointment) =>
      updateDoc(doc(db, "appointments", appointment.id), {
        status: appointment.resolvedStatus,
        updatedAt: new Date(),
      }),
    );

  await Promise.all(updates);
}

export async function syncExpiredReservations(appointments) {
  const updates = appointments
    .filter((appointment) => {
      const status = normalizeStatus(appointment.status);
      const paymentStatus = normalizeStatus(appointment.paymentStatus);

      return (
        isReservationExpired(appointment) &&
        status !== "expired" &&
        paymentStatus !== "expired"
      );
    })
    .map((appointment) =>
      updateDoc(doc(db, "appointments", appointment.id), {
        status: "expired",
        paymentStatus: "expired",
        slotStatus: "expired",
        expiredAt: new Date(),
        updatedAt: new Date(),
      }),
    );

  await Promise.all(updates);
}

export async function expireAppointmentReservation(id) {
  await updateDoc(doc(db, "appointments", id), {
    status: "expired",
    paymentStatus: "expired",
    slotStatus: "expired",
    expiredAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function createAppointment({ user, date, time }) {
    // Check for time slot conflict with other users
    const q = query(
        collection(db, "appointments"),
        where("date", "==", date),
        where("time", "==", time)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        throw new Error("Time slot already booked");
    }

    // Check if user has existing appointment
    const userAppointmentsQuery = query(
        collection(db, "appointments"),
        where("userId", "==", user.uid)
    );
    
    const userAppointmentsSnapshot = await getDocs(userAppointmentsQuery);
    
    // Delete existing appointment if it hasn't started
    if (!userAppointmentsSnapshot.empty) {
        for (const doc of userAppointmentsSnapshot.docs) {
            const existingAppt = doc.data();
            if (!hasAppointmentStarted(existingAppt.date, existingAppt.time)) {
                await deleteDoc(doc.ref);
            }
        }
    }

    await addDoc(collection(db, "appointments"), {
        userId: user.uid,
        fullName: user.displayName || "",
        email: user.email,
        date,
        time,
        status: "pending",
        createdAt: serverTimestamp(),
    });
}

export async function deleteAppointment(id) {
    await deleteDoc(doc(db, "appointments", id));
}

export async function cancelAppointment(id) {
    await updateDoc(doc(db, "appointments", id), {
        status: "cancelled",
        updatedAt: new Date(),
    });
}
