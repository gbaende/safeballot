import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Link,
  IconButton,
  TextField,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../../store/authSlice";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

/**
 * OTP Entry component for 4-digit verification code
 */
const OtpEntry = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  // Get userId and email from location state or query params
  const queryParams = new URLSearchParams(location.search);
  const userId = location.state?.userId || queryParams.get("uid");
  const userEmail = location.state?.email || queryParams.get("email");
  const redirectUrl = location.state?.redirectUrl || "/voter/dashboard";
  const isVoterLogin = location.state?.isVoterLogin || false;

  const [otp, setOtp] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(5 * 60); // Default to 5 minutes
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const inputRefs = useRef([]);
  const timerRef = useRef(null);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Initialize countdown timer
  useEffect(() => {
    if (location.state?.ttlMinutes) {
      setTimeLeft(location.state.ttlMinutes * 60);
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [location.state?.ttlMinutes]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Handle OTP input change
  const handleOtpChange = (index, value) => {
    // Only allow single digit
    if (value.length > 1) return;

    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const digits = pastedData.replace(/\D/g, "").slice(0, 4);

    if (digits.length > 0) {
      const newOtp = ["", "", "", ""];
      for (let i = 0; i < digits.length; i++) {
        newOtp[i] = digits[i];
      }
      setOtp(newOtp);

      // Focus the next empty input or the last one
      const nextIndex = Math.min(digits.length, 3);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  // Handle OTP verification
  const handleVerify = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 4) {
      setError("Please enter a 4-digit verification code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/verify-otp", {
        userId,
        code: otpString,
      });

      if (response.data.success) {
        // Store user and token in Redux and localStorage
        const { token, user } = response.data;

        // For voter login, store as voter token
        if (isVoterLogin) {
          localStorage.setItem("voterToken", token);
          localStorage.setItem("voterUser", JSON.stringify(user));

          // Extract ballot info from redirect URL for voter login flow
          if (redirectUrl && redirectUrl.includes("/")) {
            const urlParts = redirectUrl.split("/");
            const ballotId = urlParts[2];
            const ballotSlug = urlParts[3];

            if (ballotId && ballotSlug) {
              // Navigate to voter ID verification step for voter login flow
              navigate("/verify-voter-id", {
                state: {
                  ballotId,
                  ballotSlug,
                  userEmail: user.email,
                  redirectUrl: `/scan-id/${ballotId}/${ballotSlug}`,
                },
              });
              return;
            }
          }

          // Fallback to redirect URL if ballot info not found
          navigate(redirectUrl);
        } else {
          // Regular admin login flow
          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify(user));

          dispatch(loginSuccess({ token, user }));

          // Redirect to appropriate page based on redirectUrl or user role
          if (redirectUrl) {
            navigate(redirectUrl);
          } else if (user.role === "admin") {
            navigate("/admin/dashboard");
          } else if (user.role === "voter") {
            navigate("/voter/dashboard");
          } else {
            navigate("/dashboard");
          }
        }
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      setError(
        err.response?.data?.error || "Verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOtp = async () => {
    setResendLoading(true);
    setError("");
    setResendSuccess(false);

    try {
      const response = await api.post("/auth/resend-otp", {
        userId,
      });

      if (response.data.success) {
        setResendSuccess(true);
        // Reset timer if ttlMinutes is provided
        if (response.data.ttlMinutes) {
          setTimeLeft(response.data.ttlMinutes * 60);

          // Restart the timer
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }

          timerRef.current = setInterval(() => {
            setTimeLeft((prevTime) => {
              if (prevTime <= 1) {
                clearInterval(timerRef.current);
                return 0;
              }
              return prevTime - 1;
            });
          }, 1000);
        }
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      setError(
        err.response?.data?.error || "Failed to resend verification code"
      );
    } finally {
      setResendLoading(false);
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
          onClick={() => navigate(-1)}
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            color: "#6b7280",
          }}
        >
          <ArrowBackIcon />
        </IconButton>

        {/* Title */}
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            mb: 3,
            color: "#1f2937",
          }}
        >
          Confirm OTP
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
          We sent 4-digit code to {userEmail || "email@email.com"}
        </Typography>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Success Alert */}
        {resendSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Verification code resent successfully!
          </Alert>
        )}

        {/* OTP Input Boxes */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 2,
            mb: 4,
          }}
        >
          {otp.map((digit, index) => (
            <TextField
              key={index}
              inputRef={(el) => (inputRefs.current[index] = el)}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              inputProps={{
                maxLength: 1,
                inputMode: "numeric",
                pattern: "[0-9]*",
                style: {
                  textAlign: "center",
                  fontSize: "1.5rem",
                  fontWeight: 500,
                },
              }}
              sx={{
                width: 60,
                height: 60,
                "& .MuiOutlinedInput-root": {
                  height: "100%",
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
              }}
              disabled={loading}
            />
          ))}
        </Box>

        {/* Didn't get code section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Didn't get code?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {timeLeft > 0 ? formatTime(timeLeft) : "0:00"}{" "}
            <Link
              component="button"
              variant="body2"
              onClick={handleResendOtp}
              disabled={resendLoading || timeLeft > 4 * 60}
              sx={{
                color: "#3b5998",
                textDecoration: "none",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              {resendLoading ? "Sending..." : "Resend"}
            </Link>
          </Typography>
        </Box>

        {/* Confirm Button */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleVerify}
          disabled={otp.join("").length !== 4 || loading || timeLeft === 0}
          sx={{
            py: 1.5,
            background: "linear-gradient(45deg, #080E1D 30%, #263C75 90%)",
            color: "white",
            borderRadius: 2,
            textTransform: "none",
            fontSize: "1rem",
            fontWeight: 500,
            "&:hover": {
              background: "linear-gradient(45deg, #060A15 30%, #1E2F5D 90%)",
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

export default OtpEntry;
