import React, { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

/**
 * ProtectedRoute component that enforces role-based access control
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to render if authentication passes
 * @param {Array<string>} props.allowedRoles - The roles allowed to access this route
 * @param {string} props.redirectPath - Where to redirect if authentication fails
 */
const ProtectedRoute = ({
  children,
  allowedRoles = ["admin"], // default to admin only
  redirectPath = "/login",
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // Check if there's a voter token but we're trying to access admin routes
  useEffect(() => {
    const voterToken = localStorage.getItem("voterToken");
    const adminToken = localStorage.getItem("token");

    // If we have a voter token but no admin token, and we're trying to access an admin route
    if (
      voterToken &&
      !adminToken &&
      allowedRoles.includes("admin") &&
      !allowedRoles.includes("voter")
    ) {
      console.log("Voter attempting to access admin route - redirecting");
      localStorage.setItem(
        "accessDeniedReason",
        "Voter accounts cannot access the admin portal"
      );
      navigate("/login", { state: { accessDenied: true } });
    }
  }, [allowedRoles, navigate]);

  // Check if user is authenticated and has the right role
  if (!isAuthenticated) {
    console.log("User not authenticated - redirecting to login");
    return <Navigate to={redirectPath} replace />;
  }

  // If user is authenticated but doesn't have an allowed role
  if (user && user.role && !allowedRoles.includes(user.role)) {
    console.log(`User role ${user.role} not allowed - redirecting`);
    localStorage.setItem(
      "accessDeniedReason",
      `Your account type (${user.role}) does not have permission to access this area`
    );
    return (
      <Navigate to={redirectPath} replace state={{ accessDenied: true }} />
    );
  }

  // If we specifically require admin role, check for admin token
  if (allowedRoles.includes("admin") && !allowedRoles.includes("voter")) {
    const adminToken = localStorage.getItem("token");
    if (!adminToken) {
      console.log("Admin token missing - redirecting");
      localStorage.setItem(
        "accessDeniedReason",
        "Administrator authentication required"
      );
      return (
        <Navigate to={redirectPath} replace state={{ accessDenied: true }} />
      );
    }
  }

  return children;
};

export default ProtectedRoute;
