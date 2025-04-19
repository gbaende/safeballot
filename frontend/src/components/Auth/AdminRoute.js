import React, { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { CircularProgress, Box, Typography } from "@mui/material";

/**
 * AdminRoute - A protected route that only allows access to admin users
 * Checks for admin token and user in localStorage
 * Redirects to admin login if not authenticated
 */
const AdminRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check for admin authentication
    const adminToken = localStorage.getItem("adminToken");
    const adminUserJson = localStorage.getItem("adminUser");

    if (adminToken && adminUserJson) {
      try {
        const adminUser = JSON.parse(adminUserJson);
        if (adminUser.role === "admin") {
          setIsAdmin(true);
        } else {
          console.warn("User is not an admin:", adminUser.role);
        }
      } catch (error) {
        console.error("Error parsing admin user data:", error);
      }
    } else {
      console.warn("No admin token or user found");
    }

    // Clear loading state
    setLoading(false);
  }, []);

  // While checking authentication, show loading
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Checking admin access...
        </Typography>
      </Box>
    );
  }

  // If authenticated as admin, render the protected content
  if (isAdmin) {
    return children;
  }

  // If not admin, redirect to login
  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default AdminRoute;
