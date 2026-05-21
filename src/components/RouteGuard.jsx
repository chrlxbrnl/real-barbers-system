import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RouteGuard({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const adminRoutes = [
    "/admin",
    "/admin/appointments",
    "/admin/haircuts",
    "/admin/users",
  ];
  const allowedForAdmins = [...adminRoutes, "/account"]; // Allow admins to access account page
  const isAdminRoute = adminRoutes.includes(location.pathname);
  const isAllowedForAdmin = allowedForAdmins.includes(location.pathname);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (user === undefined) {
      return;
    }

    if (isAdminRoute && (!user || !isAdmin)) {
      navigate("/home", { replace: true });
      return;
    }

    if (user && isAdmin && !isAllowedForAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [user, isAdmin, isAllowedForAdmin, navigate]);

  return children;
}
