import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Link,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../../store/authSlice";
import RefreshIcon from "@mui/icons-material/Refresh";

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

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(5 * 60); // Default to 5 minutes
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const inputRef = useRef(null);
  const timerRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
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
  const handleOtpChange = (e) => {
    const value = e.target.value;
    // Only allow digits and limit to 4 characters
    if (/^\d*$/.test(value) && value.length <= 4) {
      setOtp(value);
    }
  };

  // Handle OTP verification
  const handleVerify = async () => {
    if (otp.length !== 4) {
      setError("Please enter a 4-digit verification code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/verify-otp", {
        userId,
        code: otp,
      });

      if (response.data.success) {
        // Store user and token in Redux and localStorage
        const { token, user } = response.data;

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

  // Handle key press (Enter)
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && otp.length === 4) {
      handleVerify();
    }
  };

  return (
    <Grid container justifyContent="center" sx={{ mt: 8 }}>
      <Grid item xs={12} sm={8} md={6} lg={4}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" component="h1" align="center" gutterBottom>
            Verification Required
          </Typography>

          <Typography
            variant="body1"
            align="center"
            gutterBottom
            sx={{ mb: 3 }}
          >
            We've sent a 4-digit code to{" "}
            <strong>{userEmail || "your email"}</strong>
          </Typography>

          {timeLeft > 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Code expires in {formatTime(timeLeft)}
            </Alert>
          )}

          {timeLeft === 0 && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Your verification code has expired. Please request a new one.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {resendSuccess && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Verification code resent successfully!
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <TextField
              inputRef={inputRef}
              fullWidth
              label="4-Digit Code"
              value={otp}
              onChange={handleOtpChange}
              onKeyDown={handleKeyPress}
              inputProps={{
                maxLength: 4,
                inputMode: "numeric",
                pattern: "[0-9]*",
                style: {
                  fontSize: "1.5rem",
                  letterSpacing: "0.5rem",
                  textAlign: "center",
                },
              }}
              disabled={loading}
              placeholder="0000"
              variant="outlined"
              InputProps={{
                endAdornment: timeLeft === 0 && (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleResendOtp}
                      disabled={resendLoading}
                      edge="end"
                      color="primary"
                    >
                      <RefreshIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Button
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            onClick={handleVerify}
            disabled={otp.length !== 4 || loading || timeLeft === 0}
            sx={{ mb: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : "Verify"}
          </Button>

          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Didn't receive the code?{" "}
              <Link
                component="button"
                variant="body2"
                onClick={handleResendOtp}
                disabled={resendLoading || timeLeft > 4 * 60} // Allow resend after 1 minute
              >
                {resendLoading ? "Sending..." : "Resend"}
              </Link>
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate("/login")}
              >
                Back to Login
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default OtpEntry;
