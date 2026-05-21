import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RouteGuard({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const adminRoutes = ["/admin", "/admin/appointments", "/admin/haircuts", "/admin/users"];
  const allowedForAdmins = [...adminRoutes, "/account"]; // Allow admins to access account page
  const isAdminRoute = adminRoutes.includes(location.pathname);
  const isAllowedForAdmin = allowedForAdmins.includes(location.pathname);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    // Wait for auth state to resolve before redirecting protected routes.
    if (user === undefined) {
      return;
    }

    // If on admin route but user is not admin (null or non-admin), redirect to home
    if (isAdminRoute && (!user || !isAdmin)) {
      navigate("/home", { replace: true });
      return;
    }
    
    // If user is admin but not on an allowed route, redirect to admin dashboard
    if (user && isAdmin && !isAllowedForAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [user, isAdmin, isAllowedForAdmin, navigate]);

  return children;
}
