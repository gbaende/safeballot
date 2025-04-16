import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Link,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { styled } from "@mui/material/styles";

// Styled OTP input field
const OTPInput = styled(TextField)(({ theme }) => ({
  width: 60,
  height: 60,
  margin: theme.spacing(0, 0.5),
  "& input": {
    textAlign: "center",
    fontSize: "1.5rem",
    padding: theme.spacing(1),
  },
  "& .MuiOutlinedInput-root": {
    borderRadius: theme.shape.borderRadius,
  },
}));

const OTPVerification = ({
  email,
  otpCode,
  onChange,
  onVerify,
  onResend,
  onBack,
}) => {
  const [remainingTime, setRemainingTime] = useState(120); // 2 minutes countdown
  const [activeInput, setActiveInput] = useState(0);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Set up countdown timer
  useEffect(() => {
    if (remainingTime > 0) {
      const timer = setTimeout(() => {
        setRemainingTime(remainingTime - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [remainingTime]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Handle single digit input
  const handleDigitChange = (index, e) => {
    const value = e.target.value;

    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    // Update the specific digit
    const newValue = value.slice(-1); // Take only the last digit
    onChange(index, newValue);

    // Auto-focus next input if value entered
    if (newValue && index < 3) {
      inputRefs[index + 1].current.focus();
      setActiveInput(index + 1);
    }

    // Check if all digits filled
    const isComplete = otpCode.every((digit) => digit) && otpCode.length === 4;
    if (isComplete) {
      setTimeout(onVerify, 300);
    }
  };

  // Handle key navigation between inputs
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs[index - 1].current.focus();
      setActiveInput(index - 1);
    } else if (e.key === "ArrowLeft" && index > 0) {
      // Move to previous input on left arrow
      inputRefs[index - 1].current.focus();
      setActiveInput(index - 1);
    } else if (e.key === "ArrowRight" && index < 3) {
      // Move to next input on right arrow
      inputRefs[index + 1].current.focus();
      setActiveInput(index + 1);
    }
  };

  // Handle OTP resend
  const handleResend = () => {
    onResend();
    setRemainingTime(120); // Reset timer
  };

  return (
    <Box sx={{ textAlign: "center", py: 2, position: "relative" }}>
      {onBack && (
        <IconButton
          sx={{ position: "absolute", top: 0, left: 0 }}
          onClick={onBack}
        >
          <ArrowBackIcon />
        </IconButton>
      )}

      <Typography variant="h5" component="h2" gutterBottom>
        Confirm OTP
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        We sent a 4-digit code to {email}
      </Typography>

      <Box sx={{ mb: 4 }}>
        {otpCode.map((digit, index) => (
          <OTPInput
            key={index}
            inputRef={inputRefs[index]}
            value={digit}
            onChange={(e) => handleDigitChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            autoFocus={index === activeInput}
            variant="outlined"
            autoComplete="off"
            inputProps={{
              maxLength: 1,
              inputMode: "numeric",
            }}
          />
        ))}
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="body2" color="text.secondary" display="inline">
          Didn't get code?
        </Typography>{" "}
        {remainingTime > 0 ? (
          <Typography variant="body2" color="text.secondary" component="span">
            {formatTime(remainingTime)}
          </Typography>
        ) : (
          <Link
            component="button"
            variant="body2"
            color="primary"
            onClick={handleResend}
          >
            Resend
          </Link>
        )}
      </Box>

      <Button
        variant="contained"
        size="large"
        onClick={onVerify}
        disabled={!otpCode.every((digit) => digit) || otpCode.length !== 4}
        sx={{
          px: 4,
          py: 1.5,
          bgcolor: "#1F2937",
          "&:hover": { bgcolor: "#111827" },
          minWidth: 180,
        }}
      >
        Confirm
      </Button>
    </Box>
  );
};

export default OTPVerification;
