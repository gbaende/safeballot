import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  Paper,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BlinkIDStep from "../../components/Verification/BlinkIDStep";
import MockBlinkIDStep from "../../components/Verification/MockBlinkIDStep";

const ScanID = ({ onComplete, onBack }) => {
  const [error, setError] = useState(null);
  const [scanResults, setScanResults] = useState(null);
  const [useMockScanner, setUseMockScanner] = useState(false);

  // BlinkID license key - you'll need to replace this with your actual license key
  const BLINKID_LICENSE_KEY =
    process.env.REACT_APP_BLINKID_LICENSE_KEY || "YOUR_LICENSE_KEY_HERE";

  const handleScanComplete = (results) => {
    console.log("BlinkID scan complete:", results);
    setScanResults(results);

    // Transform BlinkID results to match the expected format
    const transformedData = {
      // Personal information
      givenName:
        results.documentData?.firstName ||
        results.documentData?.givenName ||
        results.combined?.firstName ||
        "",
      surname:
        results.documentData?.lastName ||
        results.documentData?.surname ||
        results.combined?.lastName ||
        "",
      fullName:
        results.documentData?.fullName ||
        results.combined?.fullName ||
        `${
          results.documentData?.firstName ||
          results.documentData?.givenName ||
          results.combined?.firstName ||
          ""
        } ${
          results.documentData?.lastName ||
          results.documentData?.surname ||
          results.combined?.lastName ||
          ""
        }`.trim(),
      dateOfBirth:
        results.documentData?.dateOfBirth ||
        results.combined?.dateOfBirth ||
        "",
      sex: results.documentData?.sex || results.combined?.sex || "",
      nationality:
        results.documentData?.nationality ||
        results.combined?.nationality ||
        "",

      // Document information
      documentNumber:
        results.documentData?.documentNumber ||
        results.combined?.documentNumber ||
        "",
      documentType:
        results.documentData?.documentType ||
        results.combined?.documentType ||
        "",
      issuingCountry:
        results.documentData?.issuingCountry || results.combined?.country || "",
      issuingState:
        results.documentData?.issuingState || results.combined?.region || "",
      dateOfExpiry:
        results.documentData?.expiryDate ||
        results.documentData?.dateOfExpiry ||
        results.combined?.dateOfExpiry ||
        "",
      dateOfIssue:
        results.documentData?.dateOfIssue ||
        results.combined?.dateOfIssue ||
        "",

      // Additional information
      address: results.documentData?.address || results.combined?.address || "",
      personalIdNumber:
        results.documentData?.personalIdNumber ||
        results.combined?.personalIdNumber ||
        "",

      // Images (base64 encoded) - Fixed to get from documentData
      faceImage:
        results.documentData?.faceImage || results.combined?.faceImage || null,
      documentImage:
        results.documentData?.documentImage ||
        results.documentData?.fullDocumentImage ||
        results.combined?.fullDocumentImage ||
        null,
      signatureImage:
        results.documentData?.signatureImage ||
        results.combined?.signatureImage ||
        null,

      // Verification status
      documentDataMatch:
        results.documentData?.documentDataMatch ||
        results.combined?.documentDataMatch,

      // Additional metadata
      isMockData: results.documentData?.isMockData || useMockScanner, // Flag to indicate if this is mock data

      // Raw BlinkID data for reference
      rawBlinkIDData: results,
    };

    console.log("Transformed data for ConfirmInfo:", transformedData);
    console.log("Image data available:", {
      faceImage: !!transformedData.faceImage,
      documentImage: !!transformedData.documentImage,
      signatureImage: !!transformedData.signatureImage,
    });

    // Call the completion handler with transformed data
    if (onComplete) {
      onComplete(transformedData);
    }
  };

  const handleScanError = (error) => {
    console.error("BlinkID scan error:", error);
    setError(error.message || "Failed to scan ID document");

    // If the error is license-related, suggest using mock scanner
    if (error.message && error.message.includes("licence is invalid")) {
      setError(
        "BlinkID license key is invalid. You can use the mock scanner below to test the functionality."
      );
    }
  };

  const handleProgress = (progress) => {
    console.log("BlinkID progress:", progress);
  };

  const handleRetry = () => {
    setError(null);
    setScanResults(null);
    setUseMockScanner(false);
  };

  const handleUseMockScanner = () => {
    setUseMockScanner(true);
    setError(null);
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f5f5f5", py: 3 }}>
      <Box sx={{ maxWidth: 800, mx: "auto", px: 2 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: "flex", alignItems: "center" }}>
          <IconButton onClick={onBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Scan Your ID
          </Typography>
        </Box>

        {/* Instructions */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="body1" paragraph>
            Please scan your government-issued ID document to verify your
            identity. We support driver's licenses, passports, and national ID
            cards.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Your document will be processed securely and the data will be used
            only for verification purposes.
          </Typography>
        </Paper>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
            <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
              <Button size="small" onClick={handleRetry}>
                Try Again
              </Button>
              {error.includes("licence is invalid") && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleUseMockScanner}
                >
                  Use Mock Scanner
                </Button>
              )}
            </Box>
          </Alert>
        )}

        {/* License Key Warning */}
        {BLINKID_LICENSE_KEY === "YOUR_LICENSE_KEY_HERE" && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              BlinkID license key is not configured. Please set
              REACT_APP_BLINKID_LICENSE_KEY environment variable.
            </Typography>
            <Button size="small" onClick={handleUseMockScanner} sx={{ mt: 1 }}>
              Use Mock Scanner for Testing
            </Button>
          </Alert>
        )}

        {/* Scanner Toggle */}
        {!scanResults && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: "#e3f2fd" }}>
            <Typography variant="subtitle2" gutterBottom>
              Scanner Options:
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant={!useMockScanner ? "contained" : "outlined"}
                size="small"
                onClick={() => setUseMockScanner(false)}
                disabled={BLINKID_LICENSE_KEY === "YOUR_LICENSE_KEY_HERE"}
              >
                Real BlinkID Scanner
              </Button>
              <Button
                variant={useMockScanner ? "contained" : "outlined"}
                size="small"
                onClick={handleUseMockScanner}
              >
                Mock Scanner (Testing)
              </Button>
            </Box>
          </Paper>
        )}

        {/* Scanner Component */}
        <Paper sx={{ p: 3 }}>
          {useMockScanner ? (
            <MockBlinkIDStep
              onComplete={handleScanComplete}
              onError={handleScanError}
              onBack={() => setUseMockScanner(false)}
            />
          ) : (
            <BlinkIDStep
              licenseKey={BLINKID_LICENSE_KEY}
              documentType="single-side" // or "multi-side" for documents that require both sides
              onComplete={handleScanComplete}
              onError={handleScanError}
              onProgress={handleProgress}
            />
          )}
        </Paper>

        {/* Results Display */}
        {scanResults && (
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Scan Results {scanResults.isMockData && "(Mock Data)"}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Your ID has been successfully scanned and verified.
              {scanResults.isMockData &&
                " Note: This is test data from the mock scanner."}
            </Typography>

            <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
              <Button variant="outlined" onClick={handleRetry}>
                Scan Again
              </Button>
              <Button
                variant="contained"
                onClick={() => onComplete && onComplete(scanResults)}
              >
                Continue
              </Button>
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default ScanID;
