import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import LandingPage from "./pages/LandingPage";
import Home from "./pages/Home";
import Appointment from "./pages/Appointment";
import BookingPage from "./pages/BookingPage";
import { AuthProvider } from "./context/AuthContext";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import AppointmentManagement from "./pages/AppointmentManagement";
import HaircutManagement from "./pages/HaircutManagement";
import UserManagement from "./pages/UserManagement";
import RouteGuard from "./components/RouteGuard";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RouteGuard>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<Home />} />
            <Route path="/appointment" element={<Appointment />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/account" element={<Account />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/appointments" element={<AppointmentManagement />} />
            <Route path="/admin/haircuts" element={<HaircutManagement />} />
            <Route path="/admin/users" element={<UserManagement />} />
          </Routes>
        </RouteGuard>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
