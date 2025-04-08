import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { ArrowBack, CameraAlt } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { verify } from "../../store/slices/authSlice";

function VoterID() {
  const [scanning, setScanning] = useState(true);
  const [idImage, setIdImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleVerify = async () => {
    setLoading(true);
    console.log("Verifying ID...");

    // Create a mock sample ID data for demo purposes
    const mockIdData = {
      documentNumber: "12888817",
      issuingState: "Texas",
      surname: "Nico",
      givenName: "Vanny",
      sex: "Male",
      nationality: "USA",
      birthDate: "11/19/1999",
      expiryDate: "12/20/2022",
    };

    // Store the extracted data in localStorage for the next screen
    localStorage.setItem("extractedIdData", JSON.stringify(mockIdData));

    try {
      // Try to call the API, but don't wait for it to complete
      dispatch(
        verify({
          type: "voter-id",
          idImage,
          extractedData: mockIdData,
        })
      );

      // Short delay to simulate processing
      setTimeout(() => {
        console.log("ID verification complete, navigating to confirmation");
        setLoading(false);
        // Navigate regardless of API success/failure
        navigate("/verify/confirm");
      }, 1000);
    } catch (err) {
      console.error("ID verification failed:", err);
      // Navigate anyway after a short delay
      setTimeout(() => {
        setLoading(false);
        navigate("/verify/confirm");
      }, 1000);
    }
  };

  const handleBack = () => {
    navigate("/verify");
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
      }}
    >
      {/* Left side - ID Camera/Scanner View */}
      <Box
        sx={{
          width: "60%",
          display: { xs: "none", md: "block" },
          position: "relative",
          bgcolor: "#121212",
        }}
      >
        {/* This would be the camera feed in a real implementation */}
        <Box
          component="img"
          src="https://cdn.glitch.global/0e4d1ff5-9f48-4427-9b26-46ecc7f45034/sample-id.jpg?v=1628626769847"
          alt="ID Scan"
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </Box>

      {/* Right side - Instructions */}
      <Box
        sx={{
          width: { xs: "100%", md: "40%" },
          p: 4,
          display: "flex",
          flexDirection: "column",
          bgcolor: "#ffffff",
        }}
      >
        <Box sx={{ mb: 2 }}>
          <IconButton onClick={handleBack} disabled={loading}>
            <ArrowBack />
          </IconButton>
        </Box>

        <Box sx={{ pt: 4, pb: 8 }}>
          <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
            trueID™
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Place the front of your ID into the camera.
          </Typography>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
              mt: 8,
            }}
          >
            <Box
              sx={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                border: "2px solid rgba(0,0,0,0.1)",
                mb: 2,
              }}
            >
              <CameraAlt sx={{ color: "rgba(0,0,0,0.6)" }} />
            </Box>

            <Typography variant="body2" color="text.secondary">
              Scanning...
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: "auto" }}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleVerify}
            disabled={loading}
            sx={{
              py: 1.5,
              textTransform: "none",
              borderRadius: 1,
              bgcolor: "#2B3A4E",
              "&:hover": {
                bgcolor: "#1B2838",
              },
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Verify"
            )}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default VoterID;
