import React, { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { CircularProgress, Box, Typography } from "@mui/material";

/**
 * VoterRoute - A protected route that only allows access to voter users
 * Checks for voter token and user in localStorage
 * Redirects to voter login if not authenticated
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The components to render if authenticated
 * @param {string} props.ballotId - Optional ballot ID to redirect to registration if not authenticated
 * @param {string} props.fallbackPath - Optional custom fallback path if not provided, defaults to /voter/login
 */
const VoterRoute = ({ children, ballotId, fallbackPath }) => {
  const [loading, setLoading] = useState(true);
  const [isVoter, setIsVoter] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check for voter authentication
    const voterToken = localStorage.getItem("voterToken");
    const voterUserJson = localStorage.getItem("voterUser");

    if (voterToken && voterUserJson) {
      try {
        const voterUser = JSON.parse(voterUserJson);
        if (voterUser.role === "voter") {
          setIsVoter(true);
        } else {
          console.warn("User is not a voter:", voterUser.role);
        }
      } catch (error) {
        console.error("Error parsing voter user data:", error);
      }
    } else {
      console.warn("No voter token or user found");
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
          Checking voter access...
        </Typography>
      </Box>
    );
  }

  // If authenticated as voter, render the protected content
  if (isVoter) {
    return children;
  }

  // Determine redirect path - if ballot ID is provided, go to registration
  // otherwise use fallback or default
  let redirectPath = "/voter/login";

  if (ballotId) {
    redirectPath = `/voter-registration/${ballotId}`;
  } else if (fallbackPath) {
    redirectPath = fallbackPath;
  }

  // If not voter, redirect to login
  return <Navigate to={redirectPath} state={{ from: location }} replace />;
};

export default VoterRoute;
