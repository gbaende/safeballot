import React from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Container,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const ConfirmInfo = ({ idData, onConfirm, onBack }) => {
  // Use local SVG image with a data URI fallback
  const idImageSrc = "/static/images/id-placeholder.svg";
  const fallbackImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='550' height='300' viewBox='0 0 550 300'%3E%3Crect width='550' height='300' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%23666666'%3EYour ID%3C/text%3E%3C/svg%3E";

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

      <Container maxWidth="md" sx={{ py: 8 }}>
        <Typography
          variant="h4"
          component="h1"
          align="center"
          sx={{ fontWeight: 700, mb: 6 }}
        >
          Confirm Your Information
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                ID Document
              </Typography>
              <Box
                component="img"
                src={idImageSrc}
                alt="Your ID"
                onError={(e) => {
                  e.target.src = fallbackImage;
                }}
                sx={{
                  width: "100%",
                  height: "auto",
                  borderRadius: 1,
                  mb: 2,
                }}
              />
              <Typography variant="body2" color="text.secondary">
                Your ID has been scanned and verified.
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Extracted Information
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Name
                    </Typography>
                    <Typography variant="body1">
                      {idData?.givenName} {idData?.surname}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Document Number
                    </Typography>
                    <Typography variant="body1">
                      {idData?.documentNumber || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Issuing State
                    </Typography>
                    <Typography variant="body1">
                      {idData?.issuingState || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Birth Date
                    </Typography>
                    <Typography variant="body1">
                      {idData?.birthDate || "N/A"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Expiry Date
                    </Typography>
                    <Typography variant="body1">
                      {idData?.expiryDate || "N/A"}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Paper>

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
              <Button variant="outlined" onClick={onBack} sx={{ mr: 2 }}>
                Back
              </Button>
              <Button
                variant="contained"
                onClick={onConfirm}
                sx={{
                  bgcolor: "#1f2937",
                  "&:hover": { bgcolor: "#0f172a" },
                }}
              >
                Confirm & Continue
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ConfirmInfo;
