import React from "react";
import { Box, Typography, Button, Grid, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const ConfirmInfo = ({ idData, onConfirm, onBack }) => {
  // Determine the image source - use the scanned document image if available
  const getImageSrc = () => {
    // If we have a scanned document image, use it
    if (idData?.documentImage) {
      return `data:image/jpeg;base64,${idData.documentImage}`;
    }

    // If we have a face image, use it as fallback
    if (idData?.faceImage) {
      return `data:image/jpeg;base64,${idData.faceImage}`;
    }

    // Use placeholder image
    return "/static/images/id-placeholder.svg";
  };

  const fallbackImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='550' height='300' viewBox='0 0 550 300'%3E%3Crect width='550' height='300' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%23666666'%3EDriver's License%3C/text%3E%3C/svg%3E";

  // Helper function to format field values
  const formatValue = (value) => {
    if (!value || value === "") return "N/A";
    return value;
  };

  // Helper function to format dates
  const formatDate = (dateValue) => {
    if (!dateValue || dateValue === "") return "N/A";

    // If it's a BlinkID date object with a latin property, use that
    if (dateValue && typeof dateValue === "object" && dateValue.latin) {
      return dateValue.latin;
    }

    // If it's already a formatted string, return it
    if (typeof dateValue === "string") {
      return dateValue;
    }

    // If it's an object with originalDateString, use that
    if (dateValue.originalDateString) {
      return dateValue.originalDateString;
    }

    return "N/A";
  };

  console.log("ConfirmInfo received idData:", idData);

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
              backgroundColor: "#f5f5f5",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: 3,
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Typography variant="h6" sx={{ color: "#666", mb: 2 }}>
                Scanned Document
              </Typography>
              <Box
                component="img"
                src={getImageSrc()}
                alt="Scanned ID Document"
                onError={(e) => {
                  e.target.src = fallbackImage;
                }}
                sx={{
                  maxWidth: "90%",
                  maxHeight: "70vh",
                  width: "auto",
                  height: "auto",
                  borderRadius: "12px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  border: "1px solid #e0e0e0",
                }}
              />
              {!idData?.documentImage && !idData?.faceImage && (
                <Typography variant="body2" sx={{ color: "#999", mt: 1 }}>
                  No document image captured
                </Typography>
              )}
            </Box>
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
                {formatValue(idData?.documentType) !== "N/A"
                  ? idData.documentType
                  : "Driver's License"}
              </Typography>
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
                    {formatValue(idData?.documentNumber)}
                  </Typography>
                </Grid>

                {/* Issuing State */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Issuing State Code
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatValue(idData?.issuingState)}
                  </Typography>
                </Grid>

                {/* Surname */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Surname
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatValue(idData?.surname || idData?.lastName)}
                  </Typography>
                </Grid>

                {/* Given Name */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Given Name
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatValue(idData?.givenName || idData?.firstName)}
                  </Typography>
                </Grid>

                {/* Sex */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Sex
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatValue(idData?.sex)}
                  </Typography>
                </Grid>

                {/* Nationality */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Nationality Code
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatValue(idData?.nationality)}
                  </Typography>
                </Grid>

                {/* Birth Date */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Birth Date
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatDate(idData?.dateOfBirth)}
                  </Typography>
                </Grid>

                {/* Expiry */}
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Expiry of Document
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatDate(idData?.dateOfExpiry || idData?.expiryDate)}
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
