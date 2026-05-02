import { useCallback, useEffect, useState } from "react";
import AuthGate from "../components/auth/AuthGate";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import NavBar from "../components/NavBar";
import ShopDetailsCard from "../components/home/ShopDetailsCard";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import {
  formatReservationCountdown,
  getFallbackReservationExpiresAt,
  getPaymentReferenceId,
  getReservationSecondsRemaining,
  isActiveSlotReservation,
} from "../services/appointments";
import { cancelQrPayment, requestQrPayment } from "../services/payments";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const TIME_SLOTS = [
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
  "5:30 PM",
  "6:00 PM",
  "6:30 PM",
  "7:00 PM",
  "7:30 PM",
  "8:00 PM",
  "8:30 PM",
  "9:00 PM",
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getFirstName(name) {
  return name?.trim().split(/\s+/)[0] || "there";
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  // 0=Sun,1=Mon,...6=Sat — convert to Mon-first (0=Mon)
  const day = new Date(year, month, 1).getDay();
  return (day + 6) % 7;
}

export default function BookingPage() {
  const today = new Date();
  const { user } = useAuth();

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);

  const [qrImage, setQrImage] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [appointmentId, setAppointmentId] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [paymentReferenceId, setPaymentReferenceId] = useState("");
  const [reservationExpiresAt, setReservationExpiresAt] = useState(null);
  const [reservationSecondsRemaining, setReservationSecondsRemaining] =
    useState(null);
  const [slotReleaseNotice, setSlotReleaseNotice] = useState("");

  useEffect(() => {
    if (!selectedDate) return;

    const selectedFullDate = `${MONTH_NAMES[viewMonth]} ${selectedDate}, ${viewYear}`;

    const q = query(
      collection(db, "appointments"),
      where("date", "==", selectedFullDate),
    );

    // Real-time listener for booked slots
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const times = snapshot.docs
        .map((doc) => doc.data())
        .filter((appt) => isActiveSlotReservation(appt))
        .map((appt) => appt.time);
      setBookedSlots(times);
    });

    return () => unsubscribe();
  }, [selectedDate, viewMonth, viewYear]);

  useEffect(() => {
    if (!appointmentId) return;

    const appointmentRef = doc(db, "appointments", appointmentId);

    const unsubscribe = onSnapshot(appointmentRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.data();

      if (data.paymentStatus === "paid" || data.status === "confirmed") {
        const displayName = data.fullName || user?.displayName || user?.email;

        setConfirmedBooking({
          firstName: getFirstName(displayName),
          date: data.date,
          time: data.time,
          amountPaid: data.amountPaid || data.amount || 150,
          paymentReferenceId:
            getPaymentReferenceId(data) || paymentReferenceId || appointmentId,
        });
        setPaymentSuccess(true);
        setReservationSecondsRemaining(null);
      }
    });

    return () => unsubscribe();
  }, [appointmentId, user, paymentReferenceId]);

  const expirePendingReservation = useCallback(async () => {
    if (!appointmentId) return;

    try {
      await cancelQrPayment(appointmentId, "expired");
      setShowPaymentModal(false);
      setQrImage(null);
      setAppointmentId(null);
      setPaymentSuccess(false);
      setConfirmedBooking(null);
      setPaymentReferenceId("");
      setReservationExpiresAt(null);
      setReservationSecondsRemaining(null);
      setSlotReleaseNotice("Slot released due to inactivity");
    } catch (error) {
      console.error("Failed to expire appointment reservation:", error);
      if (error.message.includes("has not expired yet")) {
        setReservationSecondsRemaining(1);
      }
    }
  }, [appointmentId]);

  useEffect(() => {
    if (!showPaymentModal || paymentSuccess || !reservationExpiresAt) return;

    const reservationRecord = { reservationExpiresAt };
    const updateCountdown = () => {
      const seconds = getReservationSecondsRemaining(reservationRecord);
      setReservationSecondsRemaining(seconds);

      if (seconds === 0) {
        expirePendingReservation();
      }
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(intervalId);
  }, [
    expirePendingReservation,
    showPaymentModal,
    paymentSuccess,
    reservationExpiresAt,
  ]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
    setSelectedDate(null);
  };

  const isToday = (day) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  const isPast = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d < t;
  };

  // Build calendar grid cells
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - firstDay + 1;
    return dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null;
  });

  const cancelPendingAppointment = async () => {
    if (!appointmentId) {
      setShowPaymentModal(false);
      setQrImage(null);
      setPaymentError("");
      return;
    }

    try {
      await cancelQrPayment(appointmentId);
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
    } finally {
      setShowPaymentModal(false);
      setQrImage(null);
      setPaymentError("");
      setAppointmentId(null);
      setPaymentSuccess(false);
      setConfirmedBooking(null);
      setPaymentReferenceId("");
      setReservationExpiresAt(null);
      setReservationSecondsRemaining(null);
    }
  };

  const handleBookAnotherAppointment = () => {
    setShowPaymentModal(false);
    setQrImage(null);
    setAppointmentId(null);
    setPaymentSuccess(false);
    setPaymentError("");
    setConfirmedBooking(null);
    setPaymentReferenceId("");
    setReservationExpiresAt(null);
    setReservationSecondsRemaining(null);
    setSlotReleaseNotice("");
    setSelectedTime(null);
  };

  if (user === undefined) {
    return (
      <div className="bg-[#f9f9f9] min-h-screen">
        {/* Skeleton NavBar */}
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-48 mb-6"></div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="lg:sticky lg:top-8 self-start">
              <div className="bg-white rounded-xl shadow p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
                <div className="h-4 bg-gray-100 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-full"></div>
              </div>
            </div>
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

  return (
    <div className="bg-[#f9f9f9] min-h-screen">
      <NavBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* LEFT — Calendar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-md p-6">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-sm">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={prevMonth}
                    className="p-1 rounded hover:bg-gray-100 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-1 rounded hover:bg-gray-100 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map((d, i) => (
                  <div
                    key={i}
                    className="text-center text-xs text-gray-500 py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-y-1">
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const past = isPast(day);
                  const today_ = isToday(day);
                  const selected = selectedDate === day;

                  return (
                    <button
                      key={i}
                      disabled={past}
                      onClick={() => !past && setSelectedDate(day)}
                      className={`
                        w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm transition cursor-pointer
                        ${past ? "text-gray-300 cursor-not-allowed" : "hover:bg-gray-100"}
                        ${selected ? "bg-black text-white hover:bg-black" : ""}
                        ${today_ && !selected ? "font-bold underline" : ""}
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Time zone */}
              <div className="mt-6">
                <p className="text-xs text-gray-500 mb-1">Time zone</p>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-black cursor-pointer">
                  <option>Philippines – Manila</option>
                </select>
              </div>
            </div>
          </div>

          {/* MIDDLE — Time Slots */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-md p-6 max-h-150 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {TIME_SLOTS.map((time) => {
                  const isBooked = bookedSlots.includes(time);

                  // Check if time has already passed today
                  const isPastTime =
                    isToday(selectedDate) &&
                    (() => {
                      const [timePart, period] = time.split(" ");
                      const [hours, minutes] = timePart.split(":").map(Number);
                      const adjustedHours =
                        period === "PM" && hours !== 12
                          ? hours + 12
                          : hours === 12 && period === "AM"
                            ? 0
                            : hours;
                      const slotTime = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        today.getDate(),
                        adjustedHours,
                        minutes,
                      );
                      return slotTime < today;
                    })();

                  return (
                    <button
                      key={time}
                      disabled={isBooked || isPastTime}
                      onClick={() => setSelectedTime(time)}
                      className={`
                      border rounded-lg py-2 px-3 text-xs sm:text-sm font-medium transition cursor-pointer
                      ${
                        isBooked || isPastTime
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : selectedTime === time
                            ? "bg-black text-white border-black"
                            : "border-gray-200 text-gray-700 hover:border-black hover:bg-gray-50"
                      }
                    `}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT — Shop Details */}
          <div className="lg:col-span-1 space-y-4">
            <ShopDetailsCard showBookButton={false} />

            {/* Confirm button */}
            {selectedDate && selectedTime && (
              <div className="bg-white rounded-3xl shadow-md p-6 text-center border border-gray-200">
                <h2 className="text-lg font-semibold mb-4">
                  Appointment summary
                </h2>

                <p className="text-sm text-gray-600 mb-2">
                  Your selected schedule:{" "}
                  <span className="font-medium text-black">
                    [{MONTH_NAMES[viewMonth].slice(0, 3)} {selectedDate}] at [
                    {selectedTime}]
                  </span>
                </p>

                <p className="text-sm text-gray-600 mb-6">
                  Total fee —{" "}
                  <span className="font-semibold text-black">₱150</span>
                </p>

                <button
                  disabled={loadingPayment}
                  onClick={async () => {
                    try {
                      setLoadingPayment(true);
                      setPaymentError("");
                      setQrImage(null);
                      setShowPaymentModal(true);
                      setPaymentSuccess(false);
                      setConfirmedBooking(null);
                      setPaymentReferenceId("");
                      setReservationExpiresAt(null);
                      setReservationSecondsRemaining(null);
                      setSlotReleaseNotice("");

                      const date = `${MONTH_NAMES[viewMonth]} ${selectedDate}, ${viewYear}`;

                      const data = await requestQrPayment({
                        userId: user.uid,
                        fullName: user.displayName || "",
                        email: user.email,
                        date,
                        time: selectedTime,
                      });

                      setQrImage(data.qrImage);
                      setAppointmentId(data.appointmentId);
                      setPaymentReferenceId(getPaymentReferenceId(data));
                      setReservationExpiresAt(
                        data.reservationExpiresAt ||
                          getFallbackReservationExpiresAt(),
                      );
                      setShowPaymentModal(true);
                    } catch (err) {
                      setPaymentError(err.message);
                    } finally {
                      setLoadingPayment(false);
                    }
                  }}
                  className="bg-black text-white px-6 py-2 rounded-full font-medium hover:bg-gray-800 transition cursor-pointer"
                >
                  {loadingPayment ? "Generating QR..." : "Confirm & Pay"}
                </button>

                {slotReleaseNotice && (
                  <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {slotReleaseNotice}
                  </p>
                )}

                {showPaymentModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-[92vw] sm:max-w-md md:max-w-lg p-5 sm:p-7 md:p-8 text-center relative max-h-[90vh] overflow-y-auto">
                      <button
                        type="button"
                        onClick={
                          paymentSuccess
                            ? handleBookAnotherAppointment
                            : cancelPendingAppointment
                        }
                        aria-label="Close payment modal"
                        className="absolute top-3 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-black cursor-pointer"
                      >
                        <X size={18} />
                      </button>

                      {paymentSuccess ? (
                        <div>
                          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-green-600 text-2xl">✓</span>
                          </div>

                          <h2 className="text-2xl font-semibold text-gray-900">
                            Booking Confirmed!
                          </h2>

                          <p className="text-sm text-gray-600 mt-2">
                            Thanks, {confirmedBooking?.firstName}! Your
                            appointment is all set.
                          </p>

                          <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left space-y-3">
                            <div>
                              <p className="text-xs font-medium uppercase text-gray-500">
                                Appointment
                              </p>
                              <p className="text-sm font-semibold text-gray-900">
                                {confirmedBooking?.date} at{" "}
                                {confirmedBooking?.time}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-medium uppercase text-gray-500">
                                Amount paid
                              </p>
                              <p className="text-sm font-semibold text-gray-900">
                                ₱{confirmedBooking?.amountPaid}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-medium uppercase text-gray-500">
                                Payment reference
                              </p>
                              <p className="break-all text-sm font-semibold text-gray-900">
                                {confirmedBooking?.paymentReferenceId ||
                                  paymentReferenceId ||
                                  appointmentId}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={handleBookAnotherAppointment}
                            className="mt-5 w-full bg-black text-white py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition cursor-pointer"
                          >
                            Book another appointment
                          </button>
                        </div>
                      ) : (
                        <>
                          <h2 className="text-lg font-semibold mb-2">
                            Scan to Pay
                          </h2>

                          <p className="text-sm text-gray-500 mb-4">
                            Pay ₱150 using QRPh. Your appointment will be
                            confirmed automatically.
                          </p>

                          {reservationSecondsRemaining !== null && (
                            <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                              You have{" "}
                              {formatReservationCountdown(
                                reservationSecondsRemaining,
                              )}{" "}
                              to secure this slot.
                            </p>
                          )}

                          {loadingPayment && (
                            <p className="text-sm text-gray-600">
                              Generating QR...
                            </p>
                          )}

                          {paymentError && (
                            <p className="text-red-600 text-sm mb-3">
                              {paymentError}
                            </p>
                          )}

                          {qrImage && (
                            <>
                              <img
                                src={qrImage}
                                alt="QRPh Payment"
                                className="mx-auto w-64 h-64 border rounded-xl"
                              />

                              <p className="text-xs text-gray-500 mt-3">
                                Waiting for payment confirmation...
                              </p>

                              <p className="text-xs text-gray-400 mt-1">
                                QR expires in 30 minutes, but this slot is only
                                held until the countdown ends.
                              </p>
                            </>
                          )}

                          <button
                            onClick={cancelPendingAppointment}
                            className="mt-5 w-full border border-gray-300 py-2 rounded-full text-sm font-medium hover:bg-black hover:text-white transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
