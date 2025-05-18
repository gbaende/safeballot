import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Grid,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";

const ScanID = ({ onComplete, onBack }) => {
  const [scanning, setScanning] = useState(true);
  const [idData, setIdData] = useState(null);

  // Simulate a successful scan after 3 seconds
  const simulateScan = () => {
    setTimeout(() => {
      setScanning(false);
      setIdData({
        documentNumber: "12888817",
        issuingState: "Texas",
        surname: "Nico",
        givenName: "Vanny",
        sex: "Male",
        nationality: "N/A",
        birthDate: "20 November 1999",
        expiryDate: "20 December 2022",
      });
    }, 3000);
  };

  // Call the simulateScan function when component mounts
  React.useEffect(() => {
    simulateScan();
  }, []);

  const handleVerify = () => {
    if (idData && !scanning) {
      onComplete(idData);
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: "white",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Back button */}
      <IconButton
        onClick={onBack}
        sx={{ position: "absolute", top: 16, left: 16, color: "#000" }}
      >
        <ArrowBackIcon />
      </IconButton>

      <Grid container sx={{ flexGrow: 1 }}>
        {/* Left side - ID preview */}
        <Grid item xs={12} md={7} sx={{ position: "relative" }}>
          <Box
            sx={{
              width: "100%",
              height: "100%",
              backgroundImage: "url('/images/safeBallot_ID_Card.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {!idData && (
              <Box
                component="img"
                src="/driver-license-placeholder.jpg"
                alt="Driver's License"
                onError={(e) => {
                  e.target.src =
                    "https://via.placeholder.com/550x300?text=Your+ID+will+appear+here";
                }}
                sx={{
                  width: "80%",
                  maxWidth: "500px",
                  height: "auto",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              />
            )}
          </Box>
        </Grid>

        {/* Right side - Instructions & controls */}
        <Grid item xs={12} md={5} sx={{ py: 8, px: 5 }}>
          <Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography
                variant="h5"
                component="h1"
                sx={{ fontWeight: 700, mb: 1 }}
              >
                trueID™
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 5 }}>
                Place the front of your ID into the camera.
              </Typography>
            </Box>

            <Box sx={{ textAlign: "center", my: 10 }}>
              <Box
                sx={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  border: "2px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  margin: "0 auto",
                  mb: 2,
                }}
              >
                <CameraAltOutlinedIcon
                  sx={{ fontSize: 30, color: scanning ? "#4f46e5" : "#94a3b8" }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {scanning ? "Scanning..." : "Scan complete"}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 10 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleVerify}
                disabled={scanning}
                sx={{
                  py: 1.5,
                  px: 4,
                  bgcolor: scanning ? "#94a3b8" : "#1f2937",
                  "&:hover": { bgcolor: scanning ? "#94a3b8" : "#0f172a" },
                }}
              >
                Verify
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ScanID;
