import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Snackbar,
  Alert,
  keyframes,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

// Define animations
const fadeIn = keyframes`
  0% { opacity: 0; transform: scale(0.5); }
  70% { opacity: 1; transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
`;

const checkmarkAppear = keyframes`
  0% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1.2); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); }
`;

const DigitalKeyScreen = ({ digitalKey, ballotInfo, onComplete, onBack }) => {
  const [copied, setCopied] = useState(false);
  const [showAnimation, setShowAnimation] = useState(true);
  const [keyGenerated, setKeyGenerated] = useState(false);

  // Play animation and then proceed to ballot after a delay
  useEffect(() => {
    // Save verification status when component loads
    if (ballotInfo && ballotInfo.id && digitalKey) {
      localStorage.setItem(`verified_${ballotInfo.id}`, "true");
      localStorage.setItem(`digital_key_${ballotInfo.id}`, digitalKey);
      setKeyGenerated(true);
    }

    // Set a timer to navigate to the ballot page after animation
    const timer = setTimeout(() => {
      if (onComplete && keyGenerated) {
        onComplete();
      }
    }, 4000); // 4 seconds gives time for animation to complete

    return () => clearTimeout(timer);
  }, [ballotInfo, digitalKey, onComplete, keyGenerated]);

  // Copy digital key to clipboard
  const handleCopyKey = () => {
    navigator.clipboard.writeText(digitalKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(to right, #1e293b, #3b5998)",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: "450px",
          borderRadius: 2,
          p: 4,
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Back button */}
        <IconButton
          onClick={onBack}
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            color: "text.secondary",
          }}
        >
          <ArrowBackIcon />
        </IconButton>

        {/* Checkmark icon with animation */}
        <Box
          sx={{
            width: "60px",
            height: "60px",
            bgcolor: "#10b981",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "40px auto 30px",
            animation: showAnimation ? `${fadeIn} 0.6s ease-out` : "none",
          }}
        >
          <CheckIcon
            sx={{
              color: "white",
              fontSize: 36,
              animation: showAnimation
                ? `${checkmarkAppear} 0.5s ease-out 0.3s both`
                : "none",
            }}
          />
        </Box>

        {/* Heading */}
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            mb: 2,
            opacity: 0,
            animation: `${fadeIn} 0.5s ease-out 0.7s forwards`,
          }}
        >
          Verified
        </Typography>

        {/* Description */}
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            mb: 6,
            opacity: 0,
            animation: `${fadeIn} 0.5s ease-out 0.9s forwards`,
          }}
        >
          Below is your digital key you will need in order to submit your
          ballot.
        </Typography>

        {/* Display the digital key */}
        <Paper
          elevation={1}
          sx={{
            p: 3,
            mb: 3,
            bgcolor: "#f8fafc",
            borderRadius: 1,
            border: "1px dashed #cbd5e1",
            opacity: 0,
            animation: `${fadeIn} 0.5s ease-out 1.0s forwards`,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontFamily: "monospace",
              letterSpacing: "0.1em",
              fontWeight: 600,
              color: "#334155",
              wordBreak: "break-all",
            }}
          >
            {digitalKey || "KEY-NOT-AVAILABLE"}
          </Typography>
        </Paper>

        {/* Copy button */}
        <Button
          variant="contained"
          startIcon={<ContentCopyIcon />}
          onClick={handleCopyKey}
          fullWidth
          sx={{
            py: 1.5,
            bgcolor: "#1f2937",
            "&:hover": { bgcolor: "#0f172a" },
            mb: 2,
            opacity: 0,
            animation: `${fadeIn} 0.5s ease-out 1.1s forwards`,
          }}
        >
          Copy Digital Key
        </Button>

        {/* Success message when copied */}
        <Snackbar
          open={copied}
          autoHideDuration={3000}
          onClose={() => setCopied(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity="success" variant="filled">
            Digital key copied to clipboard
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
};

export default DigitalKeyScreen;
