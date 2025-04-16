import React from "react";
import { Box, Typography, Button, Grid, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const ConfirmInfo = ({ idData, onConfirm, onBack }) => {
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
              backgroundImage: `url('/driver-license.jpg')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: "#1e293b",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Box
              component="img"
              src="/driver-license-placeholder.jpg"
              alt="Driver's License"
              onError={(e) => {
                e.target.src =
                  "https://via.placeholder.com/550x300?text=Your+ID";
              }}
              sx={{
                width: "80%",
                maxWidth: "500px",
                height: "auto",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
            />
          </Box>
        </Grid>

        {/* Right side - Verification data */}
        <Grid item xs={12} md={5} sx={{ py: 8, px: 5 }}>
          <Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box>
              <Typography
                variant="h5"
                component="h1"
                sx={{ fontWeight: 700, mb: 1 }}
              >
                Is this info correct?
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 5 }}>
                Verify that your information is filled in correctly.
              </Typography>
            </Box>

            <Box sx={{ mb: 4, flexGrow: 1 }}>
              <Grid container spacing={3}>
                {/* Document Number */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Document Number
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {idData?.documentNumber || "12888817"}
                  </Typography>
                </Grid>

                {/* Issuing State */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Issuing State Code
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {idData?.issuingState || "Texas"}
                  </Typography>
                </Grid>

                {/* Surname */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Surname
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {idData?.surname || "Nico"}
                  </Typography>
                </Grid>

                {/* Given Name */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Given Name
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {idData?.givenName || "Vanny"}
                  </Typography>
                </Grid>

                {/* Sex */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Sex
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {idData?.sex || "Male"}
                  </Typography>
                </Grid>

                {/* Nationality */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Nationality Code
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {idData?.nationality || "N/A"}
                  </Typography>
                </Grid>

                {/* Birth Date */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Birth Date
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {idData?.birthDate || "20 November 1999"}
                  </Typography>
                </Grid>

                {/* Expiry */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Expiry of Document
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {idData?.expiryDate || "20 December 2022"}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                onClick={onConfirm}
                sx={{
                  py: 1.5,
                  px: 4,
                  bgcolor: "#1f2937",
                  "&:hover": { bgcolor: "#0f172a" },
                }}
              >
                Next
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ConfirmInfo;
