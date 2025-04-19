import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Component for protected routes that only admin users can access
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  // Show loading state while authentication status is being determined
  if (loading) {
    return <div>Loading...</div>; // You can replace this with a proper loading component
  }

  // If user is not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated but not an admin, redirect to unauthorized page or dashboard
  if (user?.role !== "admin") {
    return <Navigate to="/unauthorized" replace />;
  }

  // If user is authenticated and is an admin, render the protected component
  return children;
};

export default AdminRoute;
