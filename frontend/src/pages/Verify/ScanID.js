import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  Paper,
  Grid,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BlinkIDStep from "../../components/Verification/BlinkIDStep";

const ScanID = ({ onComplete, onBack }) => {
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // BlinkID license key - you'll need to replace this with your actual license key
  const BLINKID_LICENSE_KEY =
    process.env.REACT_APP_BLINKID_LICENSE_KEY || "YOUR_LICENSE_KEY_HERE";

  // Helper function to safely extract string values from BlinkID complex objects
  const extractStringValue = (value) => {
    if (!value) return "";

    // If it's already a string, return it
    if (typeof value === "string") return value;

    // If it's an object with different script properties, try to extract a string value
    if (typeof value === "object") {
      // Try common BlinkID properties in order of preference
      return (
        value.latin ||
        value.originalString ||
        value.originalDateString ||
        value.value ||
        value.toString?.() ||
        ""
      );
    }

    // Convert other types to string
    return String(value || "");
  };

  const handleScanComplete = (results) => {
    console.log("BlinkID scan complete:", results);
    setIsScanning(false);

    // Transform BlinkID results to match the expected format - ensure all values are strings
    const transformedData = {
      // Personal information - use extractStringValue to handle complex objects
      givenName: extractStringValue(
        results.documentData?.firstName || results.documentData?.givenName
      ),
      surname: extractStringValue(
        results.documentData?.lastName || results.documentData?.surname
      ),
      fullName:
        extractStringValue(results.documentData?.fullName) ||
        `${extractStringValue(
          results.documentData?.firstName || results.documentData?.givenName
        )} ${extractStringValue(
          results.documentData?.lastName || results.documentData?.surname
        )}`.trim(),
      dateOfBirth: extractStringValue(results.documentData?.dateOfBirth),
      sex: extractStringValue(results.documentData?.sex),
      nationality: extractStringValue(results.documentData?.nationality),

      // Document information
      documentNumber: extractStringValue(results.documentData?.documentNumber),
      documentType: extractStringValue(results.documentData?.documentType),
      issuingCountry: extractStringValue(results.documentData?.issuingCountry),
      issuingState: extractStringValue(results.documentData?.issuingState),
      dateOfExpiry: extractStringValue(
        results.documentData?.expiryDate || results.documentData?.dateOfExpiry
      ),
      dateOfIssue: extractStringValue(results.documentData?.dateOfIssue),

      // Additional information
      address: extractStringValue(results.documentData?.address),
      personalIdNumber: extractStringValue(
        results.documentData?.personalIdNumber
      ),

      // Images (base64 encoded) - these should already be strings
      faceImage: results.documentData?.faceImage || null,
      documentImage:
        results.documentData?.documentImage ||
        results.documentData?.fullDocumentImage ||
        null,
      signatureImage: results.documentData?.signatureImage || null,

      // Verification status
      documentDataMatch: results.documentData?.documentDataMatch,

      // Additional metadata
      isMockData: results.documentData?.isMockData || false,

      // Don't include raw BlinkID data to prevent complex objects from being passed through
      // rawBlinkIDData: results,
    };

    console.log("Transformed data for ConfirmInfo:", transformedData);
    console.log("Image data available:", {
      faceImage: !!transformedData.faceImage,
      documentImage: !!transformedData.documentImage,
      signatureImage: !!transformedData.signatureImage,
    });

    setScanResult(transformedData);

    // Call the onComplete callback if provided
    if (onComplete) {
      onComplete(transformedData);
    }
  };

  const handleScanError = (error) => {
    console.error("BlinkID scan error:", error);
    setError(error.message || "Failed to scan ID document");
    setIsScanning(false);
  };

  const handleProgress = (progress) => {
    console.log("BlinkID progress:", progress);
    if (progress?.step === "scanning" || progress?.step === "processing") {
      setIsScanning(true);
    }
  };

  const handleRetry = () => {
    setError(null);
    setScanResult(null);
    setIsScanning(false);
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
        {/* Left side - Scanner interface */}
        <Grid item xs={12} md={6} sx={{ position: "relative" }}>
          <Box
            sx={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(to right, #1e293b, #3b5998)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: 4,
            }}
          >
            {/* Error Display */}
            {error && (
              <Alert
                severity="error"
                sx={{ mb: 3, width: "100%", maxWidth: 600 }}
              >
                {error}
                <Button size="small" onClick={handleRetry} sx={{ ml: 2 }}>
                  Try Again
                </Button>
              </Alert>
            )}

            {/* License Key Warning */}
            {BLINKID_LICENSE_KEY === "YOUR_LICENSE_KEY_HERE" && (
              <Alert
                severity="warning"
                sx={{ mb: 3, width: "100%", maxWidth: 600 }}
              >
                BlinkID license key is not configured. Please set
                REACT_APP_BLINKID_LICENSE_KEY environment variable.
              </Alert>
            )}

            {/* Instructions */}
            <Paper sx={{ p: 3, mb: 3, width: "100%", maxWidth: 600 }}>
              <Typography variant="body1" paragraph>
                Please scan your government-issued ID document to verify your
                identity. We support driver's licenses, passports, and national
                ID cards.
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Your document will be processed securely and the data will be
                used only for verification purposes.
              </Typography>
            </Paper>

            {/* BlinkID Scanner */}
            <Paper sx={{ p: 3, width: "100%", maxWidth: 600 }}>
              <BlinkIDStep
                licenseKey={BLINKID_LICENSE_KEY}
                documentType="single-side"
                onComplete={handleScanComplete}
                onError={handleScanError}
                onProgress={handleProgress}
              />
            </Paper>

            {/* Results Display */}
            {scanResult && (
              <Paper sx={{ p: 3, mt: 3, width: "100%", maxWidth: 600 }}>
                <Typography variant="h6" gutterBottom>
                  Verification Complete
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Your identity has been successfully verified.
                </Typography>

                <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                  <Button variant="outlined" onClick={handleRetry}>
                    Scan Again
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => {
                      if (onComplete) {
                        onComplete(scanResult);
                      }
                    }}
                  >
                    Continue
                  </Button>
                </Box>
              </Paper>
            )}
          </Box>
        </Grid>

        {/* Right side - TrueID branding and scanning status */}
        <Grid item xs={12} md={6} sx={{ py: 8, px: 5 }}>
          {/* Return button */}
          <IconButton
            onClick={onBack}
            sx={{
              position: "absolute",
              top: 16,
              left: 16,
              backgroundColor: "#e5e7eb",
              color: "#6b7280",
              width: 40,
              height: 40,
              "&:hover": {
                backgroundColor: "#d1d5db",
              },
            }}
          >
            <ArrowBackIcon />
          </IconButton>

          <Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            {/* TrueID branding */}
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                mb: 3,
                color: "#1f2937",
                fontSize: "2.5rem",
              }}
            >
              TrueID™
            </Typography>

            {/* Instructions */}
            <Typography
              variant="h6"
              sx={{
                mb: 4,
                color: "#374151",
                lineHeight: 1.4,
                maxWidth: "80%",
              }}
            >
              Place the front of your ID in front of the camera
            </Typography>

            {/* Scanning icon */}
            <Box sx={{ mb: 4 }}>
              <svg
                width="47"
                height="39"
                viewBox="0 0 47 39"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M17 1H13C8.58172 1 5 4.58172 5 9V12"
                  stroke="#A6A6A6"
                  strokeWidth="2"
                />
                <path
                  d="M30 1H34C38.4183 1 42 4.58172 42 9V12"
                  stroke="#A6A6A6"
                  strokeWidth="2"
                />
                <path
                  d="M13 12C13 9.79086 14.7909 8 17 8H31C33.2091 8 35 9.79086 35 12V16H13V12Z"
                  fill="#9A9A9A"
                />
                <path
                  d="M17 38H13C8.58172 38 5 34.4183 5 30V26"
                  stroke="black"
                  strokeWidth="2"
                />
                <path
                  d="M30 38H34C38.4183 38 42 34.4183 42 30V26"
                  stroke="black"
                  strokeWidth="2"
                />
                <path
                  d="M13 26C13 28.2091 14.7909 30 17 30H31C33.2091 30 35 28.2091 35 26V22H13V26Z"
                  fill="black"
                />
                <rect y="20" width="47" height="3" fill="black" />
              </svg>
            </Box>

            {/* Scanning status */}
            <Typography
              variant="h6"
              sx={{
                color: isScanning ? "#059669" : "#6b7280",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              {isScanning && (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "#059669",
                    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    "@keyframes pulse": {
                      "0%, 100%": {
                        opacity: 1,
                      },
                      "50%": {
                        opacity: 0.5,
                      },
                    },
                  }}
                />
              )}
              {isScanning ? "Scanning..." : "Ready to scan"}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ScanID;
