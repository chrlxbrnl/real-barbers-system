import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import { isAdmin } from "../utils/isAdmin";
import NavBar from "../components/NavBar";
import AuthGate from "../components/auth/AuthGate";
import { Calendar, Clock, Users, CheckCircle } from "lucide-react";
import { getAppointmentDateTime } from "../services/appointments";

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
  "payment_canceled",
  "payment_cancelled",
]);

const shouldHideAppointment = (appointment) =>
  hiddenAppointmentStatuses.has(normalizeStatus(appointment.status)) ||
  hiddenPaymentStatuses.has(normalizeStatus(appointment.paymentStatus));

function sortByAppointmentDateTime(a, b) {
  const aDateTime = getAppointmentDateTime(a.date, a.time);
  const bDateTime = getAppointmentDateTime(b.date, b.time);

  if (!aDateTime && !bDateTime) return 0;
  if (!aDateTime) return 1;
  if (!bDateTime) return -1;

  return aDateTime - bDateTime;
}

export default function Admin() {
  const { user } = useAuth();
  const [allAppointments, setAllAppointments] = useState([]);
  const [todaysAppointments, setTodaysAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAdmin(user)) {
      return;
    }

    const unsubscribe = onSnapshot(collection(db, "appointments"), (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((appointment) => !shouldHideAppointment(appointment))
        .sort((a, b) => {
          const aCreatedAt = a.createdAt?.toMillis?.() || 0;
          const bCreatedAt = b.createdAt?.toMillis?.() || 0;

          return bCreatedAt - aCreatedAt;
        });

      setAllAppointments(data);

      // Get today's date in the same format as stored
      const today = new Date();
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const todayStr = `${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

      // Filter today's appointments
      const todays = data.filter(appt => appt.date === todayStr);
      setTodaysAppointments(todays);

      // Get next 5 upcoming appointments
      const now = new Date();
      const futureAppointments = data
        .filter(appt => {
          const appointmentDateTime = getAppointmentDateTime(appt.date, appt.time);
          return appointmentDateTime ? appointmentDateTime >= now : false;
        })
        .sort(sortByAppointmentDateTime)
        .slice(0, 5);

      setUpcomingAppointments(futureAppointments);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                  <div className="ml-4 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-8 bg-gray-300 rounded w-12"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // not logged in
  if (user === null) {
    return <AuthGate />;
  }

  // not admin
  if (!isAdmin(user)) {
    return <div className="text-center mt-20">Access denied</div>;
  }

  return (
    <div className="bg-[#f9f9f9] min-h-screen">
      <NavBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        {loading ? (
          <div className="mb-8 animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-96 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-72"></div>
          </div>
        ) : (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Manage appointments and oversee operations</p>
          </div>
        )}

        {/* Dashboard Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loading ? (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                  <div className="ml-4 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-8 bg-gray-300 rounded w-12"></div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                  <div className="ml-4 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-8 bg-gray-300 rounded w-12"></div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                  <div className="ml-4 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-8 bg-gray-300 rounded w-12"></div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                  <div className="ml-4 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-8 bg-gray-300 rounded w-12"></div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Today's Appointments Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
                    <p className="text-2xl font-bold text-gray-900">{todaysAppointments.length}</p>
                  </div>
                </div>
              </div>

              {/* Total Appointments Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                    <p className="text-2xl font-bold text-gray-900">{allAppointments.length}</p>
                  </div>
                </div>
              </div>

              {/* Confirmed Appointments Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Confirmed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {allAppointments.filter(appt => normalizeStatus(appt.status) === "confirmed").length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pending Appointments Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {allAppointments.filter(appt => !appt.status || appt.status === "pending").length}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Appointments</h2>
          {loading ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg animate-pulse">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="h-5 w-5 bg-gray-200 rounded shrink-0"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-40 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg animate-pulse">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="h-5 w-5 bg-gray-200 rounded shrink-0"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-40 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg animate-pulse">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="h-5 w-5 bg-gray-200 rounded shrink-0"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-40 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
              </div>
            </div>
          ) : upcomingAppointments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No upcoming appointments</p>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((appt) => (
                <div key={appt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="shrink-0">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {appt.fullName || appt.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        {appt.date} at {appt.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appt.status || "pending")}`}>
                      {appt.status || "pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>


      </main>
    </div>
  );
}
