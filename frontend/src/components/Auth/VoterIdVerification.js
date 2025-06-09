import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
  TextField,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LogoComponent from "../Common/LogoComponent";

/**
 * Voter ID Verification component
 */
const VoterIdVerification = ({ onComplete, onBack, userEmail }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [voterId, setVoterId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get ballot info from location state (passed from OTP verification)
  const { ballotId, ballotSlug, redirectUrl } = location.state || {};

  // Handle voter ID input change
  const handleVoterIdChange = (e) => {
    setVoterId(e.target.value);
  };

  // Handle voter ID verification
  const handleVerify = async () => {
    if (!voterId.trim()) {
      setError("Please enter your voter ID number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Simulate API call for voter ID verification
      // In a real implementation, this would call an API to verify the voter ID
      console.log("Verifying voter ID:", voterId);
      console.log("Ballot info:", { ballotId, ballotSlug });

      // Simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // For now, accept any non-empty voter ID
      // In production, this would validate against a database
      if (voterId.trim().length >= 3) {
        console.log("Voter ID verified successfully");

        // Store the verified voter ID for later use
        localStorage.setItem("verifiedVoterId", voterId);

        // If we have an onComplete callback, use it
        if (onComplete) {
          onComplete(voterId);
        } else {
          // Continue the voter login flow by navigating to ID scanning
          if (ballotId && ballotSlug) {
            console.log(
              "Navigating to ID scanning step:",
              `/scan-id/${ballotId}/${ballotSlug}`
            );
            navigate(`/scan-id/${ballotId}/${ballotSlug}`, {
              state: {
                fromVoterLogin: true,
                verifiedVoterId: voterId,
              },
            });
          } else if (redirectUrl) {
            // Fallback to redirect URL if ballot info not available
            navigate(redirectUrl);
          } else {
            // Last resort - go back to voter login
            navigate("/voter/login");
          }
        }
      } else {
        setError("Invalid voter ID. Please check and try again.");
      }
    } catch (err) {
      console.error("Voter ID verification error:", err);
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle key press (Enter)
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && voterId.trim()) {
      handleVerify();
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(to right, #1e293b, #3b5998)",
        padding: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: "480px",
          minHeight: "500px",
          borderRadius: 3,
          p: 4,
          textAlign: "center",
          position: "relative",
          backgroundColor: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {/* Back button */}
        <IconButton
          onClick={() => onBack?.() || navigate(-1)}
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            color: "#6b7280",
          }}
        >
          <ArrowBackIcon />
        </IconButton>

        {/* SafeBallot Logo */}
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <LogoComponent width={60} height={60} />
        </Box>

        {/* Title */}
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            mb: 2,
            color: "#1f2937",
          }}
        >
          Verify your Voter ID
        </Typography>

        {/* Subtitle */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 4,
            lineHeight: 1.5,
          }}
        >
          Enter your known voter ID number below
        </Typography>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Voter ID Input */}
        <TextField
          fullWidth
          placeholder="Enter voter ID number"
          value={voterId}
          onChange={handleVoterIdChange}
          onKeyDown={handleKeyPress}
          disabled={loading}
          sx={{
            mb: 4,
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              backgroundColor: "#f8fafc",
              "& fieldset": {
                borderColor: "#e2e8f0",
              },
              "&:hover fieldset": {
                borderColor: "#cbd5e1",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#3b5998",
                borderWidth: 2,
              },
            },
            "& .MuiInputBase-input": {
              py: 1.5,
              fontSize: "1rem",
            },
          }}
        />

        {/* Confirm Button */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleVerify}
          disabled={!voterId.trim() || loading}
          sx={{
            py: 1.5,
            backgroundColor: "#9ca3af",
            color: "white",
            borderRadius: 2,
            textTransform: "none",
            fontSize: "1rem",
            fontWeight: 500,
            "&:hover": {
              backgroundColor: "#6b7280",
            },
            "&:disabled": {
              backgroundColor: "#d1d5db",
              color: "#9ca3af",
            },
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Confirm"}
        </Button>
      </Paper>
    </Box>
  );
};

export default VoterIdVerification;
