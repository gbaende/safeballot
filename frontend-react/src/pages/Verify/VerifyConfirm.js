import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  IconButton,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

function VerifyConfirm() {
  const navigate = useNavigate();
  const [idData, setIdData] = useState({
    documentNumber: "",
    issuingState: "",
    surname: "",
    givenName: "",
    sex: "",
    nationalityCode: "N/A",
    birthDate: "",
    expiryDate: "",
  });

  // Load extracted ID data from localStorage on component mount
  useEffect(() => {
    try {
      const storedData = localStorage.getItem("extractedIdData");
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        console.log("Loaded ID data from localStorage:", parsedData);
        setIdData({
          documentNumber: parsedData.documentNumber || "",
          issuingState: parsedData.issuingState || "",
          surname: parsedData.surname || "",
          givenName: parsedData.givenName || "",
          sex: parsedData.sex || "",
          nationalityCode: parsedData.nationality || "N/A",
          birthDate: parsedData.birthDate || "",
          expiryDate: parsedData.expiryDate || "",
        });
      } else {
        console.log("No ID data found in localStorage, using default values");
      }
    } catch (error) {
      console.error("Error loading ID data from localStorage:", error);
    }
  }, []);

  const handleConfirm = () => {
    navigate("/verify/success");
  };

  const handleBack = () => {
    navigate("/voter-id");
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      {/* Left side - ID image */}
      <Box
        sx={{
          width: "50%",
          bgcolor: "#1B2838",
          display: { xs: "none", md: "flex" },
          justifyContent: "center",
          alignItems: "center",
          p: 4,
        }}
      >
        {/* This would typically be the scanned ID image */}
        <Box
          component="img"
          src="https://cdn.glitch.global/0e4d1ff5-9f48-4427-9b26-46ecc7f45034/sample-id.jpg?v=1628626769847"
          alt="ID Preview"
          sx={{
            maxWidth: "100%",
            maxHeight: "80vh",
            objectFit: "contain",
            border: "2px solid rgba(255,255,255,0.1)",
            borderRadius: 1,
          }}
        />
      </Box>

      {/* Right side - Extracted information */}
      <Box
        sx={{
          width: { xs: "100%", md: "50%" },
          p: 4,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ mb: 4 }}>
          <IconButton onClick={handleBack} sx={{ mb: 2 }}>
            <ArrowBack />
          </IconButton>

          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 600, mb: 1 }}
          >
            Is this info correct?
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Verify that your information is filled in correctly.
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Document Number
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {idData.documentNumber}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Issuing State Code
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {idData.issuingState}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Surname
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {idData.surname}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Given Name
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {idData.givenName}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Sex
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {idData.sex}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Nationality Code
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {idData.nationalityCode}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Birth Date
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {idData.birthDate}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Expiry of Document
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {idData.expiryDate}
            </Typography>
          </Grid>
        </Grid>

        <Box sx={{ mt: "auto" }}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleConfirm}
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
            }}
          >
            Next
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default VerifyConfirm;
