import { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import { isAdmin } from "../utils/isAdmin";
import NavBar from "../components/NavBar";
import AuthGate from "../components/auth/AuthGate";
import {
  deleteAppointment,
  getPaymentReferenceId,
  isReservationExpired,
  syncExpiredReservations,
} from "../services/appointments";
import { X, Edit, Trash2, Calendar } from "lucide-react";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const quickDateFilters = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_week", label: "Last week" },
];

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const getDateLabel = (date) => dateFormatter.format(date);

const getDateInputLabel = (dateInput) => {
  const [year, month, day] = dateInput.split("-").map(Number);
  return getDateLabel(new Date(year, month - 1, day));
};

const normalizeStatus = (status) =>
  status?.toString().trim().toLowerCase().replace(/[\s-]+/g, "_");

const hiddenAppointmentStatuses = new Set([
  "expired",
  "payment_failed",
]);

const hiddenPaymentStatuses = new Set([
  "canceled",
  "cancelled",
  "canceled_payment",
  "cancelled_payment",
  "expired",
  "payment_canceled",
  "payment_cancelled",
]);

const shouldHideAppointment = (appointment) =>
  hiddenAppointmentStatuses.has(normalizeStatus(appointment.status)) ||
  hiddenPaymentStatuses.has(normalizeStatus(appointment.paymentStatus)) ||
  isReservationExpired(appointment);

export default function AppointmentManagement() {
  const { user } = useAuth();
  const [allAppointments, setAllAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [quickDateFilter, setQuickDateFilter] = useState("");
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [editForm, setEditForm] = useState({ date: "", time: "" });
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (!user || !isAdmin(user)) return;

    const q = query(
      collection(db, "appointments"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appointments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const data = appointments
        .filter((appointment) => !shouldHideAppointment(appointment));

      syncExpiredReservations(appointments).catch((error) => {
        console.error("Failed to sync expired reservations:", error);
      });

      setAllAppointments(data);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredAppointments = useMemo(() => {
    if (quickDateFilter) {
      const today = new Date();

      if (quickDateFilter === "today") {
        const todayLabel = getDateLabel(today);
        return allAppointments.filter(
          (appointment) => appointment.date === todayLabel,
        );
      }

      if (quickDateFilter === "yesterday") {
        const yesterdayLabel = getDateLabel(addDays(today, -1));
        return allAppointments.filter(
          (appointment) => appointment.date === yesterdayLabel,
        );
      }

      if (quickDateFilter === "last_week") {
        const lastWeekLabels = new Set(
          Array.from({ length: 7 }, (_, index) =>
            getDateLabel(addDays(today, -(index + 1))),
          ),
        );

        return allAppointments.filter((appointment) =>
          lastWeekLabels.has(appointment.date),
        );
      }
    }

    if (!selectedDate) return allAppointments;

    const selectedDateLabel = getDateInputLabel(selectedDate);
    return allAppointments.filter(
      (appointment) => appointment.date === selectedDateLabel,
    );
  }, [allAppointments, selectedDate, quickDateFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, quickDateFilter]);

  const totalPages = Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAppointments = filteredAppointments.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      const appointmentRef = doc(db, "appointments", appointmentId);
      await updateDoc(appointmentRef, {
        status: newStatus,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error updating appointment status:", error);
      alert("Failed to update appointment status");
    }
  };

  const handleEdit = (appointment) => {
    setEditingAppointment(appointment);
    setEditForm({
      date: appointment.date,
      time: appointment.time,
    });
  };

  const handleSaveEdit = async () => {
    try {
      const appointmentRef = doc(db, "appointments", editingAppointment.id);
      await updateDoc(appointmentRef, {
        date: editForm.date,
        time: editForm.time,
        updatedAt: new Date(),
      });
      setEditingAppointment(null);
      setEditForm({ date: "", time: "" });
    } catch (error) {
      console.error("Error updating appointment:", error);
      alert("Failed to update appointment");
    }
  };

  const handleCancelEdit = () => {
    setEditingAppointment(null);
    setEditForm({ date: "", time: "" });
  };

  const handleDelete = async (appointmentId) => {
    if (window.confirm("Are you sure you want to delete this appointment?")) {
      try {
        await deleteAppointment(appointmentId);
      } catch (error) {
        console.error("Error deleting appointment:", error);
        alert("Failed to delete appointment");
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "canceled":
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "no-show":
      case "no_show":
        return "bg-gray-200 text-gray-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  // still checking auth
  if (user === undefined) {
    return (
      <div className="bg-[#f9f9f9] min-h-screen">
        {/* Skeleton NavBar */}
        <nav className="bg-white shadow-sm border-b border-gray-200 animate-pulse">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="h-8 bg-gray-300 rounded w-32"></div>
              <div className="hidden md:flex items-center gap-4">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-44"></div>
                <div className="h-8 bg-gray-200 rounded w-40"></div>
                <div className="h-8 bg-gray-200 rounded w-28"></div>
              </div>
              <div className="h-8 w-8 bg-gray-200 rounded md:hidden"></div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-8 animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-96 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-72"></div>
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-white p-4 rounded-lg shadow animate-pulse"
              >
                <div className="h-5 bg-gray-200 rounded w-48 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-32"></div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // not logged in
  if (user === null) {
    return null;
  }

  // not admin
  if (!isAdmin(user)) {
    return <div className="text-center mt-20">Access denied</div>;
  }

  return (
    <div className="bg-[#f9f9f9] min-h-screen">
      <NavBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Appointment Management
          </h1>
          <p className="text-gray-600">
            Manage all appointments and their status
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <label
              htmlFor="appointment-date-filter"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Filter by date
            </label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="appointment-date-filter"
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setQuickDateFilter("");
                }}
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickDateFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setQuickDateFilter(filter.value);
                  setSelectedDate("");
                }}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition cursor-pointer ${
                  quickDateFilter === filter.value
                    ? "border-black bg-black text-white"
                    : "border-gray-300 text-gray-700 hover:border-black hover:text-black"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {(selectedDate || quickDateFilter) && (
            <button
              type="button"
              onClick={() => {
                setSelectedDate("");
                setQuickDateFilter("");
              }}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-black hover:text-black"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Edit Modal */}
        {editingAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Edit Appointment
                </h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="text"
                    value={editForm.date}
                    onChange={(e) =>
                      setEditForm({ ...editForm, date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., January 15, 2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="text"
                    value={editForm.time}
                    onChange={(e) =>
                      setEditForm({ ...editForm, time: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 10:00 AM"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Appointments Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              All Appointments
            </h2>
          </div>

          <div className="overflow-x-auto">
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {selectedDate || quickDateFilter
                    ? "No appointments found for this date filter"
                    : "No appointments found"}
                </p>
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Barber
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction ID
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedAppointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {appt.fullName || appt.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {appt.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Haircut & Styling
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Real Barbers
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {appt.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {appt.time}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={appt.status || "pending"}
                            onChange={(e) =>
                              handleStatusChange(appt.id, e.target.value)
                            }
                            className={`text-xs font-medium px-2 py-1 rounded-full border-0 ${getStatusColor(appt.status || "pending")}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no-show">No-show</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              appt.paymentStatus === "paid"
                                ? "bg-green-100 text-green-700"
                                : appt.paymentStatus === "expired"
                                  ? "bg-gray-100 text-gray-700"
                                  : appt.paymentStatus === "failed"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {appt.paymentStatus || "unpaid"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs">
                            {getPaymentReferenceId(appt) || "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(appt)}
                              className="text-indigo-600 hover:text-indigo-900 p-1"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(appt.id)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredAppointments.length)} of {filteredAppointments.length} appointments
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:border-black hover:text-black transition cursor-pointer"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                              currentPage === page
                                ? "bg-black text-white"
                                : "border border-gray-300 text-gray-700 hover:border-black hover:text-black cursor-pointer"
                            }`}
                          >
                            {page}
                          </button>
                        )
                      )}
                    </div>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:border-black hover:text-black transition cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
