import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  TextField,
  Grid,
} from "@mui/material";
import { verify } from "../../store/slices/authSlice";
import LogoComponent from "../../components/Common/LogoComponent";

const OTP = () => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(105); // 1:45 in seconds
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, otp: storedOtp } = useSelector((state) => state.auth);

  // Get ballot ID from URL if it exists
  const urlParams = new URLSearchParams(location.search);
  const ballotId = urlParams.get("ballot");

  // Set up timer
  useEffect(() => {
    const countdown = setInterval(() => {
      setTimer((prevTimer) => {
        if (prevTimer <= 1) {
          clearInterval(countdown);
          setIsResendDisabled(false);
          return 0;
        }
        return prevTimer - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, []);

  // Format timer display
  const formatTime = () => {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Auto-focus the first input on component mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (e, index) => {
    const { value } = e.target;

    // Only allow numbers
    if (value && !/^[0-9]$/.test(value)) {
      return;
    }

    // Update the OTP array
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input if current input is filled
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // Move to previous input on backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();

    // Check if pasted data consists of 6 digits
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);

      // Focus the last input
      inputRefs.current[5].focus();
    }
  };

  // Handle OTP resend
  const handleResend = () => {
    // In real app, would call API to resend OTP
    console.log("Resending OTP...");

    // Generate a new fake OTP for demo purposes
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Reset timer
    setTimer(105);
    setIsResendDisabled(true);

    // Show success message
    setSuccess("New OTP has been sent");
    setError("");

    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess("");
    }, 3000);

    // Log the new OTP for demonstration purposes
    console.log("New OTP code for verification:", newOtp);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join("");

    if (otpString.length !== 6) {
      setError("Please enter a valid 6-digit OTP code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await dispatch(
        verify({
          type: "otp",
          code: otpString,
        })
      ).unwrap();
      navigate("/voter-id");
    } catch (err) {
      setError(err.message || "Invalid OTP code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #2B3A4E 0%, #1B2838 100%)",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 450,
          display: "flex",
          flexDirection: "column",
          borderRadius: 2,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Box sx={{ mb: 3, textAlign: "center" }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <LogoComponent width={80} height={80} />
          </Box>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 700, color: "#333" }}
          >
            Verification Code
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            We've sent a verification code to{" "}
            <strong>{user?.email || "your email"}</strong>
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 4 }}>
            <Grid container spacing={1} justifyContent="center">
              {otp.map((digit, index) => (
                <Grid item key={index}>
                  <TextField
                    inputRef={(el) => (inputRefs.current[index] = el)}
                    value={digit}
                    onChange={(e) => handleChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    variant="outlined"
                    inputProps={{
                      maxLength: 1,
                      style: {
                        textAlign: "center",
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                        padding: "12px 0",
                        width: "40px",
                      },
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 1.5,
                        backgroundColor: "#f9f9f9",
                        "&:hover": {
                          backgroundColor: "#f5f5f5",
                        },
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "transparent",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "primary.main",
                        },
                      },
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              py: 1.5,
              borderRadius: 1.5,
              textTransform: "none",
              fontSize: "1rem",
              fontWeight: 600,
              backgroundColor: "#2B3A4E",
              "&:hover": {
                backgroundColor: "#1B2838",
              },
              mb: 3,
            }}
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify Code"}
          </Button>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {isResendDisabled ? (
              <Typography variant="body2" color="text.secondary">
                Resend code in {formatTime()}
              </Typography>
            ) : (
              <Button
                onClick={handleResend}
                sx={{
                  color: "primary.main",
                  textTransform: "none",
                  fontWeight: 600,
                  "&:hover": {
                    backgroundColor: "transparent",
                    textDecoration: "underline",
                  },
                }}
              >
                Resend Code
              </Button>
            )}
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default OTP;
