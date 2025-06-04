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

const ScanID = ({ onComplete, onBack }) => {
  const [error, setError] = useState(null);
  const [scanResults, setScanResults] = useState(null);

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
        "",
      surname:
        results.documentData?.lastName || results.documentData?.surname || "",
      fullName:
        results.documentData?.fullName ||
        `${
          results.documentData?.firstName ||
          results.documentData?.givenName ||
          ""
        } ${
          results.documentData?.lastName || results.documentData?.surname || ""
        }`.trim(),
      dateOfBirth: results.documentData?.dateOfBirth || "",
      sex: results.documentData?.sex || "",
      nationality: results.documentData?.nationality || "",

      // Document information
      documentNumber: results.documentData?.documentNumber || "",
      documentType: results.documentData?.documentType || "",
      issuingCountry: results.documentData?.issuingCountry || "",
      issuingState: results.documentData?.issuingState || "",
      dateOfExpiry:
        results.documentData?.expiryDate ||
        results.documentData?.dateOfExpiry ||
        "",
      dateOfIssue: results.documentData?.dateOfIssue || "",

      // Additional information
      address: results.documentData?.address || "",
      personalIdNumber: results.documentData?.personalIdNumber || "",

      // Images (base64 encoded)
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
  };

  const handleProgress = (progress) => {
    console.log("BlinkID progress:", progress);
  };

  const handleRetry = () => {
    setError(null);
    setScanResults(null);
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
            Verify Your Identity
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
            <Button size="small" onClick={handleRetry} sx={{ ml: 2 }}>
              Try Again
            </Button>
          </Alert>
        )}

        {/* License Key Warning */}
        {BLINKID_LICENSE_KEY === "YOUR_LICENSE_KEY_HERE" && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            BlinkID license key is not configured. Please set
            REACT_APP_BLINKID_LICENSE_KEY environment variable.
          </Alert>
        )}

        {/* BlinkID Scanner */}
        <Paper sx={{ p: 3 }}>
          <BlinkIDStep
            licenseKey={BLINKID_LICENSE_KEY}
            documentType="single-side" // or "multi-side" for documents that require both sides
            onComplete={handleScanComplete}
            onError={handleScanError}
            onProgress={handleProgress}
          />
        </Paper>

        {/* Results Display */}
        {scanResults && (
          <Paper sx={{ p: 3, mt: 3 }}>
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
