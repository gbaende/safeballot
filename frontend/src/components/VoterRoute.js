import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Component for protected routes that only voters can access
const VoterRoute = ({ children }) => {
  const { isVoterAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading state while authentication status is being determined
  if (loading) {
    return <div>Loading...</div>; // You can replace this with a proper loading component
  }

  // If voter is not authenticated, redirect to voter login
  // Keep the current URL as state so we can redirect back after login
  if (!isVoterAuthenticated) {
    return <Navigate to="/voter/login" state={{ from: location }} replace />;
  }

  // If voter is authenticated, render the protected component
  return children;
};

export default VoterRoute;
