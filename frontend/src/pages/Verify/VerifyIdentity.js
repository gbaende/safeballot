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

          {/* Face scan area */}
          <Box
            sx={{
              width: "180px",
              height: "180px",
              mx: "auto",
              mb: 5,
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Facial recognition markers */}
            <Box
              component="img"
              src="/facial-mesh.png"
              alt="Facial recognition"
              sx={{
                width: "150px",
                height: "150px",
              }}
              onError={(e) => {
                // Fallback to SVG wireframe if image not found
                e.target.onerror = null;
                e.target.src =
                  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTc1IDMwQzUwIDMwIDQwIDYwIDQwIDc1QzQwIDkwIDUwIDEyMCA3NSAxMjBDMTAwIDEyMCAxMTAgOTAgMTEwIDc1QzExMCA2MCAxMDAgMzAgNzUgMzBaIiBzdHJva2U9IiM2NTc4RkYiIHN0cm9rZS13aWR0aD0iMSIvPjxwYXRoIGQ9Ik01MCA3NUg0MEw0NSA2MEw1MCA3NVoiIHN0cm9rZT0iIzY1NzhGRiIgc3Ryb2tlLXdpZHRoPSIxIi8+PHBhdGggZD0iTTEwMCA3NUgxMTBMMTA1IDYwTDEwMCA3NVoiIHN0cm9rZT0iIzY1NzhGRiIgc3Ryb2tlLXdpZHRoPSIxIi8+PHBhdGggZD0iTTY1IDQwTDc1IDUwTDg1IDQwIiBzdHJva2U9IiM2NTc4RkYiIHN0cm9rZS13aWR0aD0iMSIvPjxwYXRoIGQ9Ik02NSAxMTBMNzUgMTAwTDg1IDExMCIgc3Ryb2tlPSIjNjU3OEZGIiBzdHJva2Utd2lkdGg9IjEiLz48cGF0aCBkPSJNNjAgNjBDNjUgNjAgNjggNjUgNjggNzBDNjggNzUgNjUgODAgNjAgODAiIHN0cm9rZT0iIzY1NzhGRiIgc3Ryb2tlLXdpZHRoPSIxIi8+PHBhdGggZD0iTTkwIDYwQzg1IDYwIDgyIDY1IDgyIDcwQzgyIDc1IDg1IDgwIDkwIDgwIiBzdHJva2U9IiM2NTc4RkYiIHN0cm9rZS13aWR0aD0iMSIvPjxwYXRoIGQ9Ik03NSA4MEM3MiA4MCA3MCA3OCA3MCA3NUM3MCA3MiA3MiA3MCA3NSA3MEM3OCA3MCA4MCA3MiA4MCA3NUM4MCA3OCA3OCA4MCA3NSA4MFoiIHN0cm9rZT0iIzY1NzhGRiIgc3Ryb2tlLXdpZHRoPSIxIi8+PHBhdGggZD0iTTY1IDkwTDc1IDk1TDg1IDkwIiBzdHJva2U9IiM2NTc4RkYiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==";
              }}
            />

            {/* Corner markers */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "30px",
                height: "30px",
                borderTop: "3px solid #4f46e5",
                borderLeft: "3px solid #4f46e5",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "30px",
                height: "30px",
                borderTop: "3px solid #4f46e5",
                borderRight: "3px solid #4f46e5",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "30px",
                height: "30px",
                borderBottom: "3px solid #4f46e5",
                borderLeft: "3px solid #4f46e5",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "30px",
                height: "30px",
                borderBottom: "3px solid #4f46e5",
                borderRight: "3px solid #4f46e5",
              }}
            />
          </Box>

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
