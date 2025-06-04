import React, { useState } from "react";
import { Box, Typography, Button, IconButton, Paper } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const VerifyIdentity = ({ onComplete, onBack }) => {
  const [scanning, setScanning] = useState(false);

  const handleStartScan = () => {
    setScanning(true);

    // Immediately proceed to ID scanning
    if (onComplete) {
      onComplete();
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
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: "550px",
          borderRadius: 2,
          p: 0,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Back button */}
        <IconButton
          sx={{ position: "absolute", top: 16, left: 16 }}
          onClick={onBack}
        >
          <ArrowBackIcon />
        </IconButton>

        <Box sx={{ p: 6, textAlign: "center" }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            Verify your identity
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 5 }}>
            To ensure fair and safe voting practices, we must verify your
            identification before you can vote.
          </Typography>

          {/* Identity verification illustration */}
          <div className="mb-8 flex justify-center">
            <img
              className="h-48 w-auto"
              src="/images/id-document.png"
              alt="ID Document Verification"
            />
          </div>

          <Button
            variant="contained"
            fullWidth
            onClick={handleStartScan}
            disabled={scanning}
            sx={{
              py: 1.5,
              bgcolor: "#1f2937",
              "&:hover": { bgcolor: "#0f172a" },
              "&.Mui-disabled": { bgcolor: "#475569", color: "white" },
            }}
          >
            {scanning ? "Processing..." : "Next"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default VerifyIdentity;
