import { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import {
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import NavBar from "../components/NavBar";
import AuthGate from "../components/auth/AuthGate";
import { cancelQrPayment, requestQrPayment } from "../services/payments";
import {
  cancelAppointment,
  deleteAppointment,
  formatReservationCountdown,
  getFallbackReservationExpiresAt,
  getAppointmentDateTime,
  getPaymentLabel,
  getPaymentReferenceId,
  getReservationSecondsRemaining,
  getResolvedAppointmentStatus,
  isReservationExpired,
  syncExpiredReservations,
  syncPassedAppointmentStatuses,
} from "../services/appointments";

const historyFilters = ["all", "completed", "cancelled", "no-show"];

const normalizeStatus = (status) =>
  status
    ?.toString()
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

function isHistoryAppointment(appointment) {
  const status = normalizeStatus(appointment.resolvedStatus);
  return (
    status === "completed" ||
    status === "cancelled" ||
    status === "no_show" ||
    hasPassed(appointment)
  );
}

function hasPassed(appointment) {
  const appointmentDateTime = getAppointmentDateTime(
    appointment.date,
    appointment.time,
  );
  return appointmentDateTime ? appointmentDateTime < new Date() : false;
}

function sortByDateTime(a, b) {
  const aDate = getAppointmentDateTime(a.date, a.time);
  const bDate = getAppointmentDateTime(b.date, b.time);

  if (!aDate && !bDate) return 0;
  if (!aDate) return 1;
  if (!bDate) return -1;

  return aDate - bDate;
}

function getStatusStyles(status) {
  switch (normalizeStatus(status)) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
    case "canceled":
      return "bg-red-100 text-red-800";
    case "no_show":
      return "bg-gray-200 text-gray-800";
    case "confirmed":
      return "bg-blue-100 text-blue-800";
    case "payment_review":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
}

function formatStatus(status) {
  switch (normalizeStatus(status)) {
    case "completed":
      return "Completed";
    case "cancelled":
    case "canceled":
      return "Cancelled";
    case "no_show":
      return "No-show";
    case "confirmed":
      return "Confirmed";
    case "pending_payment":
      return "Pending payment";
    case "payment_review":
      return "Payment review";
    default:
      return "Pending";
  }
}

function canPayAppointment(appointment) {
  const status = normalizeStatus(appointment.status);
  const paymentStatus = normalizeStatus(appointment.paymentStatus);

  return (
    !hasPassed(appointment) &&
    !isReservationExpired(appointment) &&
    paymentStatus !== "paid" &&
    (status === "pending_payment" ||
      paymentStatus === "pending" ||
      paymentStatus === "unpaid")
  );
}

function isSameBookingSlot(a, b) {
  if (!a || !b) return false;

  return (
    (a.userId || "") === (b.userId || "") &&
    a.date === b.date &&
    a.time === b.time
  );
}

export default function Appointment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentNotice, setPaymentNotice] = useState("");
  const paymentModalReservationExpiresAt = paymentModal?.reservationExpiresAt;
  const paymentModalSuccess = paymentModal?.success;
  const paymentModalWatchAppointmentId = paymentModal?.watchAppointmentId;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "appointments"),
      where("userId", "==", user.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((docSnapshot) => {
          const appointment = {
            id: docSnapshot.id,
            ...docSnapshot.data(),
          };

          return {
            ...appointment,
            resolvedStatus: getResolvedAppointmentStatus(appointment),
          };
        });

        syncPassedAppointmentStatuses(data).catch((error) => {
          console.error("Failed to sync passed appointment statuses:", error);
        });
        syncExpiredReservations(data).catch((error) => {
          console.error("Failed to sync expired reservations:", error);
        });

        setAppointments(data);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const appointmentId = paymentModalWatchAppointmentId;
    if (!appointmentId) return;

    const unsubscribe = onSnapshot(
      doc(db, "appointments", appointmentId),
      (snapshot) => {
        if (!snapshot.exists()) return;

        const data = snapshot.data();

        if (data.paymentStatus === "paid" || data.status === "confirmed") {
          setPaymentModal((current) => {
            if (!current) return current;

            return {
              ...current,
              success: true,
              loading: false,
              reservationSecondsRemaining: null,
              confirmedBooking: {
                date: data.date,
                time: data.time,
                amountPaid: data.amountPaid || data.amount || 150,
                paymentReferenceId:
                  getPaymentReferenceId(data) ||
                  current.paymentReferenceId ||
                  current.watchAppointmentId,
              },
            };
          });
        }
      },
    );

    return () => unsubscribe();
  }, [paymentModalWatchAppointmentId]);

  useEffect(() => {
    if (!paymentModalReservationExpiresAt || paymentModalSuccess) {
      return;
    }

    const reservationRecord = {
      reservationExpiresAt: paymentModalReservationExpiresAt,
    };
    const updateCountdown = () => {
      const seconds = getReservationSecondsRemaining(reservationRecord);

      setPaymentModal((current) =>
        current
          ? {
              ...current,
              reservationSecondsRemaining: seconds,
            }
          : current,
      );

      if (seconds === 0 && paymentModalWatchAppointmentId) {
        (async () => {
          try {
            await cancelQrPayment(paymentModalWatchAppointmentId, "expired");
            setPaymentModal(null);
            setPaymentNotice("Slot released due to inactivity");
          } catch (error) {
            console.error("Failed to expire appointment reservation:", error);
            if (error.message.includes("has not expired yet")) {
              setPaymentModal((current) =>
                current
                  ? {
                      ...current,
                      reservationSecondsRemaining: 1,
                    }
                  : current,
              );
              return;
            }

            setPaymentModal(null);
            setPaymentNotice("Slot released due to inactivity");
          }
        })();
      }
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(intervalId);
  }, [
    paymentModalReservationExpiresAt,
    paymentModalSuccess,
    paymentModalWatchAppointmentId,
  ]);

  const { upcomingAppointments, historyAppointments } = useMemo(() => {
    const history = appointments
      .filter(isHistoryAppointment)
      .filter((appointment) => {
        if (historyFilter === "all") return true;
        return (
          normalizeStatus(appointment.resolvedStatus) ===
          normalizeStatus(historyFilter)
        );
      })
      .sort((a, b) => sortByDateTime(b, a));

    const upcoming = appointments
      .filter((appointment) => !isHistoryAppointment(appointment))
      .sort(sortByDateTime);

    return {
      upcomingAppointments: upcoming,
      historyAppointments: history,
    };
  }, [appointments, historyFilter]);

  const handleCancel = async (id) => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this appointment?",
    );

    if (!confirmCancel) return;

    try {
      await cancelAppointment(id);
    } catch (err) {
      console.error(err);
      alert("Failed to cancel appointment");
    }
  };

  const handleReviewSubmit = async (appointmentId) => {
    try {
      await updateDoc(doc(db, "appointments", appointmentId), {
        reviewRating: Number(reviewForm.rating),
        reviewComment: reviewForm.comment.trim(),
        reviewedAt: new Date(),
      });
      setReviewForm({ rating: 5, comment: "" });
    } catch (error) {
      console.error(error);
      alert("Failed to save review");
    }
  };

  const handleDeleteHistory = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this appointment from your history?",
    );

    if (!confirmDelete) return;

    try {
      await deleteAppointment(id);
      if (selectedAppointment?.id === id) {
        setSelectedAppointment(null);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete appointment");
    }
  };

  const closePaymentModal = async () => {
    const appointmentId = paymentModal?.watchAppointmentId;

    if (!appointmentId || paymentModal?.success) {
      setPaymentModal(null);
      return;
    }

    try {
      await cancelQrPayment(appointmentId);
    } catch (error) {
      console.error("Failed to cancel appointment reservation:", error);
    } finally {
      setPaymentModal(null);
    }
  };

  const openDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setReviewForm({
      rating: appointment.reviewRating || 5,
      comment: appointment.reviewComment || "",
    });
  };

  const handlePayAppointment = async (appointment) => {
    setPaymentNotice("");
    setPaymentModal({
      appointment,
      qrImage: null,
      error: "",
      loading: true,
      success: false,
      watchAppointmentId: appointment.id,
      confirmedBooking: null,
      paymentReferenceId: getPaymentReferenceId(appointment),
      reservationExpiresAt: appointment.reservationExpiresAt || null,
      reservationSecondsRemaining: getReservationSecondsRemaining(appointment),
    });

    try {
      const paymentPayload = {
        appointmentId: appointment.id,
        userId: user.uid,
        fullName: appointment.fullName || user.displayName || "",
        email: appointment.email || user.email,
        date: appointment.date,
        time: appointment.time,
      };

      const data = await requestQrPayment(paymentPayload);

      setPaymentModal((current) => ({
        ...current,
        appointment: {
          ...appointment,
          id: data.appointmentId || appointment.id,
        },
        qrImage: data.qrImage,
        loading: false,
        watchAppointmentId: data.appointmentId || appointment.id,
        reservationExpiresAt:
          data.reservationExpiresAt ||
          current.reservationExpiresAt ||
          getFallbackReservationExpiresAt(),
        reservationSecondsRemaining: getReservationSecondsRemaining({
          reservationExpiresAt:
            data.reservationExpiresAt ||
            current.reservationExpiresAt ||
            getFallbackReservationExpiresAt(),
        }),
        paymentReferenceId:
          getPaymentReferenceId(data) ||
          getPaymentReferenceId(appointment) ||
          data.appointmentId ||
          appointment.id,
      }));
    } catch (error) {
      setPaymentModal((current) => ({
        ...current,
        error: error.message,
        loading: false,
      }));
    }
  };

  if (user === undefined) {
    return (
      <div className="bg-[#f9f9f9] min-h-screen">
        <nav className="bg-white shadow-sm border-b border-gray-200 animate-pulse">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="h-8 bg-gray-300 rounded w-32"></div>
              <div className="flex gap-4">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto p-6">
          <div className="mb-6 animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-[#f9f9f9] min-h-screen">
        <NavBar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <AuthGate />
        </main>
      </div>
    );
  }

  const visibleAppointments =
    activeTab === "upcoming" ? upcomingAppointments : historyAppointments;
  const stableVisibleAppointments =
    activeTab === "upcoming" &&
    paymentModal?.appointment &&
    !visibleAppointments.some(
      (appt) =>
        appt.id === paymentModal.appointment.id ||
        isSameBookingSlot(appt, paymentModal.appointment),
    )
      ? [paymentModal.appointment, ...visibleAppointments]
      : visibleAppointments;

  return (
    <div className="bg-[#f9f9f9] min-h-screen">
      <NavBar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              My Appointments
            </h1>
            <p className="text-sm text-gray-600">
              Track upcoming bookings, receipts, and past visits.
            </p>
          </div>
          <button
            onClick={() => navigate("/book")}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition"
          >
            <RotateCcw className="h-4 w-4" />
            Rebook
          </button>
        </div>

        {paymentNotice && (
          <p className="mb-5 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {paymentNotice}
          </p>
        )}

        <div className="mb-5 flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeTab === "upcoming"
                ? "bg-black text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Upcoming Appointments
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeTab === "history"
                ? "bg-black text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Appointment History
          </button>
        </div>

        {activeTab === "history" && (
          <div className="mb-5 flex flex-wrap gap-2">
            {historyFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setHistoryFilter(filter)}
                className={`rounded-full border px-3 py-1 text-sm capitalize transition ${
                  historyFilter === filter
                    ? "border-black bg-black text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                }`}
              >
                {filter === "all" ? "All" : formatStatus(filter)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-white" />
            ))}
          </div>
        ) : stableVisibleAppointments.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="font-medium text-gray-900">
              {activeTab === "upcoming"
                ? "No upcoming appointments"
                : "No appointment history yet"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === "upcoming"
                ? "Book your next visit whenever you are ready."
                : "Completed, cancelled, and no-show appointments will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {stableVisibleAppointments.map((appt) => (
              <div
                key={appt.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyles(
                          appt.resolvedStatus,
                        )}`}
                      >
                        {formatStatus(appt.resolvedStatus)}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          getPaymentLabel(appt.paymentStatus) === "Paid"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {getPaymentLabel(appt.paymentStatus)}
                      </span>
                    </div>

                    <div className="grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                      <span className="inline-flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {appt.date}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {appt.time}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {activeTab === "upcoming" ? (
                      <>
                        {canPayAppointment(appt) && (
                          <button
                            onClick={() => handlePayAppointment(appt)}
                            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                          >
                            <CreditCard className="h-4 w-4" />
                            Pay
                          </button>
                        )}
                        <button
                          onClick={() => handleCancel(appt.id)}
                          className="rounded-md border border-red-500 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-500 hover:text-white"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => navigate("/book")}
                          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-black hover:text-black"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Rebook
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => openDetails(appt)}
                      className="inline-flex items-center gap-2 rounded-md bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                    >
                      <FileText className="h-4 w-4" />
                      Details
                    </button>
                    <button
                      onClick={() => handleDeleteHistory(appt.id)}
                      className="inline-flex items-center gap-2 rounded-md border border-red-500 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Appointment Details
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedAppointment.date} at {selectedAppointment.time}
                </p>
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 rounded-lg bg-gray-50 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                <span className="font-medium">
                  {formatStatus(selectedAppointment.resolvedStatus)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Payment</span>
                <span className="inline-flex items-center gap-2 font-medium">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  {getPaymentLabel(selectedAppointment.paymentStatus)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-medium">
                  PHP{" "}
                  {selectedAppointment.amountPaid ||
                    selectedAppointment.amount ||
                    150}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-gray-500">Payment reference</span>
                <span className="break-all text-right font-medium">
                  {getPaymentReferenceId(selectedAppointment) ||
                    selectedAppointment.id}
                </span>
              </div>
            </div>

            {normalizeStatus(selectedAppointment.resolvedStatus) ===
              "completed" && (
              <div className="mt-5 border-t border-gray-200 pt-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  Rate your visit
                </h3>
                <div className="mb-3 flex gap-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() =>
                        setReviewForm((form) => ({ ...form, rating }))
                      }
                      className="p-1 text-gray-300 hover:text-black"
                      aria-label={`${rating} star rating`}
                    >
                      <Star
                        className={`h-5 w-5 ${
                          rating <= reviewForm.rating
                            ? "fill-black text-black"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewForm.comment}
                  onChange={(event) =>
                    setReviewForm((form) => ({
                      ...form,
                      comment: event.target.value,
                    }))
                  }
                  className="min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                  placeholder="Share a quick note about your appointment"
                />
                <button
                  onClick={() => handleReviewSubmit(selectedAppointment.id)}
                  className="mt-3 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Save review
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="relative w-full max-w-[92vw] rounded-lg bg-white p-5 text-center shadow-xl sm:max-w-md sm:p-7 md:max-w-lg md:p-8">
            {!paymentModal.success && (
              <button
                onClick={closePaymentModal}
                className="absolute right-4 top-3 text-xl text-gray-400 hover:text-black"
              >
                x
              </button>
            )}

            {paymentModal.success ? (
              <div>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-7 w-7 text-green-600" />
                </div>

                <h2 className="text-2xl font-semibold text-gray-900">
                  Payment Confirmed
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  Your appointment is now confirmed.
                </p>

                <div className="mt-5 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-left">
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-500">
                      Appointment
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {paymentModal.confirmedBooking?.date ||
                        paymentModal.appointment.date}{" "}
                      at{" "}
                      {paymentModal.confirmedBooking?.time ||
                        paymentModal.appointment.time}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-500">
                      Amount paid
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      PHP{" "}
                      {paymentModal.confirmedBooking?.amountPaid ||
                        paymentModal.appointment.amount ||
                        150}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-500">
                      Payment reference
                    </p>
                    <p className="break-all text-sm font-semibold text-gray-900">
                      {paymentModal.confirmedBooking?.paymentReferenceId ||
                        paymentModal.paymentReferenceId ||
                        paymentModal.watchAppointmentId}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPaymentModal(null)}
                  className="mt-5 w-full rounded-md bg-black py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h2 className="mb-2 text-lg font-semibold">Scan to Pay</h2>
                <p className="mb-4 text-sm text-gray-500">
                  Pay PHP 150 using QRPh to confirm your appointment.
                </p>

                {paymentModal.reservationSecondsRemaining !== null &&
                  paymentModal.reservationSecondsRemaining !== undefined && (
                    <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                      You have{" "}
                      {formatReservationCountdown(
                        paymentModal.reservationSecondsRemaining,
                      )}{" "}
                      to secure this slot.
                    </p>
                  )}

                <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  {paymentModal.appointment.date} at{" "}
                  {paymentModal.appointment.time}
                </div>

                {paymentModal.loading && (
                  <p className="text-sm text-gray-600">Generating QR...</p>
                )}

                {paymentModal.error && (
                  <p className="mb-3 text-sm text-red-600">
                    {paymentModal.error}
                  </p>
                )}

                {paymentModal.qrImage && (
                  <>
                    <img
                      src={paymentModal.qrImage}
                      alt="QRPh Payment"
                      className="mx-auto h-64 w-64 rounded-xl border"
                    />
                    <p className="mt-3 text-xs text-gray-500">
                      Waiting for payment confirmation...
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      QR expires in 30 minutes, but this slot is only held until
                      the countdown ends.
                    </p>
                  </>
                )}

                <button
                  onClick={closePaymentModal}
                  className="mt-5 w-full rounded-md border border-gray-300 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
