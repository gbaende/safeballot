import React from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Container,
  IconButton,
  Chip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VerifiedIcon from "@mui/icons-material/Verified";
import MockDataIcon from "@mui/icons-material/BugReport";

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
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='550' height='300' viewBox='0 0 550 300'%3E%3Crect width='550' height='300' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%23666666'%3EYour ID%3C/text%3E%3C/svg%3E";

  // Helper function to format field values
  const formatValue = (value) => {
    if (!value || value === "") return "N/A";
    return value;
  };

  // Helper function to format dates
  const formatDate = (dateValue) => {
    if (!dateValue || dateValue === "") return "N/A";

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

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h4"
          component="h1"
          align="center"
          sx={{ fontWeight: 700, mb: 2 }}
        >
          Is this information correct?
        </Typography>

        {/* Status indicators */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 4, gap: 1 }}>
          {idData?.isMockData ? (
            <Chip
              icon={<MockDataIcon />}
              label="Mock Data (Testing)"
              color="warning"
              variant="outlined"
            />
          ) : (
            <Chip
              icon={<VerifiedIcon />}
              label="Document Scanned"
              color="success"
              variant="outlined"
            />
          )}

          {idData?.documentDataMatch !== null && (
            <Chip
              label={
                idData.documentDataMatch
                  ? "Data Verified"
                  : "Data Mismatch Detected"
              }
              color={idData.documentDataMatch ? "success" : "warning"}
              variant="outlined"
            />
          )}
        </Box>

        <Grid container spacing={4}>
          {/* Left side - Document image */}
          <Grid item xs={12} md={5}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                ID Document
                {idData?.isMockData && (
                  <MockDataIcon color="warning" fontSize="small" />
                )}
              </Typography>

              <Box
                component="img"
                src={getImageSrc()}
                alt="Scanned ID Document"
                onError={(e) => {
                  e.target.src = fallbackImage;
                }}
                sx={{
                  width: "100%",
                  height: "auto",
                  borderRadius: 1,
                  mb: 2,
                  maxHeight: "300px",
                  objectFit: "contain",
                  border: "1px solid #e0e0e0",
                }}
              />

              <Typography variant="body2" color="text.secondary">
                {idData?.documentImage
                  ? "Your ID document has been scanned and processed."
                  : idData?.isMockData
                  ? "This is mock test data for demonstration."
                  : "Document image not available - using placeholder."}
              </Typography>

              {/* Face image if available and different from document image */}
              {idData?.faceImage && idData?.documentImage && (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Extracted Face Image:
                  </Typography>
                  <Box
                    component="img"
                    src={`data:image/jpeg;base64,${idData.faceImage}`}
                    alt="Extracted Face"
                    sx={{
                      width: "100px",
                      height: "100px",
                      borderRadius: 1,
                      objectFit: "cover",
                      border: "1px solid #e0e0e0",
                    }}
                  />
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Right side - Extracted information */}
          <Grid item xs={12} md={7}>
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Personal Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    First Name
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatValue(idData?.givenName || idData?.firstName)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Last Name
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatValue(idData?.surname || idData?.lastName)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Full Name
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatValue(
                      idData?.fullName ||
                        `${idData?.givenName || idData?.firstName || ""} ${
                          idData?.surname || idData?.lastName || ""
                        }`.trim()
                    )}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Date of Birth
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatDate(idData?.dateOfBirth)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Sex/Gender
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatValue(idData?.sex)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Nationality
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatValue(idData?.nationality)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Document Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Document Number
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatValue(idData?.documentNumber)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Document Type
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatValue(idData?.documentType)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Issuing Country
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatValue(idData?.issuingCountry)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Issuing State
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatValue(idData?.issuingState)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Issue Date
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatDate(idData?.dateOfIssue)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Expiry Date
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formatDate(idData?.dateOfExpiry || idData?.expiryDate)}
                  </Typography>
                </Grid>
                {idData?.personalIdNumber && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Personal ID Number
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {formatValue(idData.personalIdNumber)}
                    </Typography>
                  </Grid>
                )}
                {idData?.address && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Address
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {formatValue(idData.address)}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* Action buttons */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button variant="outlined" onClick={onBack}>
                Back to Scan
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
