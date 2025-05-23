import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Grid,
  CircularProgress,
  Alert,
  Paper,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import onfidoService from "../../services/onfidoService";

// Base64 encoded placeholder image as embedded data URI
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1NTAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgNTUwIDMwMCI+PHJlY3Qgd2lkdGg9IjU1MCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM2NjY2NjYiPllvdXIgSUQgd2lsbCBhcHBlYXIgaGVyZTwvdGV4dD48L3N2Zz4=";

const ScanID = ({ onComplete, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applicantId, setApplicantId] = useState(null);
  const [sdkToken, setSdkToken] = useState(null);
  const [checkId, setCheckId] = useState(null);
  const [scanComplete, setScanComplete] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [manualInitRequired, setManualInitRequired] = useState(false);

  const onfidoInstanceRef = useRef(null);

  // Handle Onfido completion
  const handleOnfidoComplete = async (data) => {
    try {
      console.log("Onfido scan complete:", data);

      if (!applicantId) {
        throw new Error("No applicant ID available");
      }

      // Create a check with the captured documents
      const checkResponse = await onfidoService.createCheck(applicantId);

      if (!checkResponse.success) {
        throw new Error(checkResponse.error || "Failed to create check");
      }

      setCheckId(checkResponse.data.id);

      // Wait a moment for the check to be processed
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Extract the document data
      const extractResponse = await onfidoService.extractDocumentData(
        checkResponse.data.id
      );

      if (!extractResponse.success) {
        throw new Error(
          extractResponse.error || "Failed to extract document data"
        );
      }

      setExtractedData(extractResponse.data.extractedData);
      setScanComplete(true);
    } catch (err) {
      console.error("Error handling Onfido completion:", err);
      setError(err.message || "Failed to process ID verification");
    }
  };

  // Start the Onfido scanning process
  const startScan = async () => {
    if (!sdkToken || !window.Onfido) {
      setError("SDK not ready. Please try again in a moment.");
      return;
    }

    try {
      setLoading(true);

      // Clean up any existing instance
      if (onfidoInstanceRef.current) {
        onfidoInstanceRef.current.tearDown();
      }

      console.log("Initializing Onfido SDK...");
      onfidoInstanceRef.current = window.Onfido.init({
        token: sdkToken,
        containerId: "onfido-mount",
        onComplete: handleOnfidoComplete,
        useModal: false,
        useMemoryHistory: true,
        customUI: {
          fontFamilyTitle: "'Inter', sans-serif",
          fontFamilyBody: "'Inter', sans-serif",
          colorBackgroundSurfaceModal: "#ffffff",
          colorBorderDocumentCapture: "#4f46e5",
          colorBackgroundDocumentCapturePressed: "#4338ca",
          colorBorderDocumentCaptureError: "#ef4444",
        },
        steps: [
          {
            type: "document",
            options: {
              documentTypes: {
                driving_licence: {
                  country: "USA",
                },
                passport: true,
                national_identity_card: true,
                residence_permit: true,
              },
              hideCountrySelection: true,
              forceCrossDevice: false,
              useLiveDocumentCapture: true,
              showCameraSelection: true,
            },
          },
        ],
      });

      console.log("Onfido SDK initialized successfully");
      setLoading(false);
    } catch (err) {
      console.error("Error manually initializing Onfido:", err);
      setError(err.message || "Failed to initialize ID verification");
      setLoading(false);
    }
  };

  // Initialize Onfido when component mounts
  useEffect(() => {
    const initOnfido = async () => {
      try {
        setLoading(true);

        // Step 1: Load Onfido SDK script if not already loaded
        if (!window.Onfido) {
          console.log("Loading Onfido SDK script...");
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src =
              "https://assets.onfido.com/web-sdk-releases/17.4.0/onfido.min.js";
            script.async = true;
            script.onload = () => {
              console.log("Onfido SDK script loaded successfully");
              setScriptLoaded(true);
              resolve();
            };
            script.onerror = (err) => {
              console.error("Failed to load Onfido SDK:", err);
              reject(new Error("Failed to load Onfido SDK"));
            };
            document.body.appendChild(script);
          });
        } else {
          setScriptLoaded(true);
        }

        // Step 2: Create an applicant
        console.log("Creating Onfido applicant...");
        const applicantResponse = await onfidoService.createApplicant(
          "Test",
          "User",
          "test@example.com"
        );

        if (!applicantResponse.success) {
          throw new Error(
            applicantResponse.error || "Failed to create applicant"
          );
        }

        const newApplicantId = applicantResponse.data.id;
        console.log("Applicant created:", newApplicantId);
        setApplicantId(newApplicantId);

        // Step 3: Generate SDK token
        console.log("Generating SDK token...");
        const tokenResponse = await onfidoService.generateSdkToken(
          newApplicantId
        );

        if (!tokenResponse.success) {
          throw new Error(
            tokenResponse.error || "Failed to generate SDK token"
          );
        }

        console.log("SDK token generated successfully");
        setSdkToken(tokenResponse.data.token);

        // Step 4: Initialize Onfido SDK immediately
        if (!window.Onfido) {
          throw new Error("Onfido SDK not available");
        }

        try {
          console.log("Auto-initializing Onfido SDK...");
          if (onfidoInstanceRef.current) {
            onfidoInstanceRef.current.tearDown();
          }

          onfidoInstanceRef.current = window.Onfido.init({
            token: tokenResponse.data.token,
            containerId: "onfido-mount",
            onComplete: handleOnfidoComplete,
            useModal: false,
            useMemoryHistory: true,
            customUI: {
              fontFamilyTitle: "'Inter', sans-serif",
              fontFamilyBody: "'Inter', sans-serif",
              colorBackgroundSurfaceModal: "#ffffff",
              colorBorderDocumentCapture: "#4f46e5",
              colorBackgroundDocumentCapturePressed: "#4338ca",
              colorBorderDocumentCaptureError: "#ef4444",
            },
            steps: [
              {
                type: "document",
                options: {
                  documentTypes: {
                    driving_licence: {
                      country: "USA",
                    },
                    passport: true,
                    national_identity_card: true,
                    residence_permit: true,
                  },
                  hideCountrySelection: true,
                  forceCrossDevice: false,
                  useLiveDocumentCapture: true,
                  showCameraSelection: true,
                },
              },
            ],
          });

          console.log("Onfido SDK auto-initialized successfully");
        } catch (initError) {
          console.error(
            "Auto-initialization failed, will require manual init:",
            initError
          );
          setManualInitRequired(true);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error initializing Onfido:", err);
        setError(err.message || "Failed to initialize ID verification");
        setManualInitRequired(true);
        setLoading(false);
      }
    };

    initOnfido();

    // Clean up on unmount
    return () => {
      if (onfidoInstanceRef.current) {
        try {
          console.log("Tearing down Onfido instance");
          onfidoInstanceRef.current.tearDown();
          onfidoInstanceRef.current = null;
        } catch (err) {
          console.error("Error tearing down Onfido:", err);
        }
      }
    };
  }, []);

  // When the user clicks Verify, pass the extracted data to the parent component
  const handleVerify = () => {
    if (extractedData && scanComplete) {
      // Format the data to match the expected structure
      const formattedData = {
        documentNumber: extractedData.documentNumber || "",
        issuingState: extractedData.issuingCountry || "",
        surname: extractedData.lastName || "",
        givenName: extractedData.firstName || "",
        sex: "",
        nationality: extractedData.nationality || "",
        birthDate: extractedData.dateOfBirth || "",
        expiryDate: extractedData.expirationDate || "",
      };

      onComplete(formattedData);
    } else {
      // If no data extracted, use fallback
      handleManualVerify();
    }
  };

  // Fallback to simulated data if extraction fails
  const handleManualVerify = () => {
    // Use the same simulated data as before
    const simulatedData = {
      documentNumber: "12888817",
      issuingState: "Texas",
      surname: "Nico",
      givenName: "Vanny",
      sex: "Male",
      nationality: "N/A",
      birthDate: "20 November 1999",
      expiryDate: "20 December 2022",
    };

    onComplete(simulatedData);
  };

  // Handle retry
  const handleRetry = () => {
    window.location.reload();
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
      {/* Back button - always visible */}
      <IconButton
        onClick={onBack}
        sx={{
          position: "absolute",
          top: 16,
          left: 16,
          color: "#000",
          zIndex: 1000,
        }}
      >
        <ArrowBackIcon />
      </IconButton>

      {/* Error message if present */}
      {error && (
        <Alert
          severity="error"
          sx={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 1000,
            maxWidth: "400px",
          }}
        >
          {error}
          <Button size="small" onClick={handleRetry} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Manual scan button for cases when auto-init fails */}
      {manualInitRequired && !loading && !scanComplete && (
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 950,
            backgroundColor: "rgba(0,0,0,0.8)",
            p: 4,
            borderRadius: 2,
            maxWidth: "400px",
            textAlign: "center",
          }}
        >
          <Typography variant="h6" sx={{ color: "white", mb: 2 }}>
            Camera not starting automatically
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={startScan}
            sx={{ py: 1.5, px: 4 }}
          >
            Start Scan
          </Button>
        </Box>
      )}

      {/* Status overlay during loading */}
      {loading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.7)",
            zIndex: 900,
            color: "white",
          }}
        >
          <CircularProgress color="inherit" sx={{ mb: 2 }} />
          <Typography variant="h6">
            {!scriptLoaded
              ? "Loading ID verification..."
              : "Starting camera..."}
          </Typography>
        </Box>
      )}

      {/* Onfido mount container - always present */}
      <div
        id="onfido-mount"
        style={{
          width: "100%",
          height: "100vh",
          position: "relative",
          backgroundColor: "#f8fafc",
        }}
      />

      {/* Success overlay after scanning */}
      {scanComplete && extractedData && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.8)",
            zIndex: 950,
            p: 3,
          }}
        >
          <Paper elevation={4} sx={{ p: 4, maxWidth: "600px", width: "100%" }}>
            <Typography
              variant="h5"
              gutterBottom
              align="center"
              sx={{ color: "green", mb: 3 }}
            >
              ID Scan Complete
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2">First Name</Typography>
                <Typography variant="body1">
                  {extractedData?.firstName || "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Last Name</Typography>
                <Typography variant="body1">
                  {extractedData?.lastName || "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Date of Birth</Typography>
                <Typography variant="body1">
                  {extractedData?.dateOfBirth || "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Document Number</Typography>
                <Typography variant="body1">
                  {extractedData?.documentNumber || "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Nationality</Typography>
                <Typography variant="body1">
                  {extractedData?.nationality || "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Issuing Country</Typography>
                <Typography variant="body1">
                  {extractedData?.issuingCountry || "N/A"}
                </Typography>
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleVerify}
                sx={{ py: 1.5, px: 4 }}
              >
                Continue
              </Button>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default ScanID;
