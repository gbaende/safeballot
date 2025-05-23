import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import onfidoService from "../../services/onfidoService";

const OnfidoTest = ({ onComplete, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applicantId, setApplicantId] = useState(null);
  const [sdkToken, setSdkToken] = useState(null);
  const [complete, setComplete] = useState(false);
  const [output, setOutput] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null);

  const onfidoMountRef = useRef(null);
  const onfidoInstance = useRef(null);

  // Check camera permissions first
  useEffect(() => {
    const checkCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        setCameraPermission("granted");
      } catch (err) {
        console.error("Camera permission error:", err);
        setCameraPermission("denied");
        setError("Please enable camera access to proceed with ID verification");
      }
    };
    checkCamera();
  }, []);

  // Step 1: Create an applicant and get a token
  useEffect(() => {
    const setup = async () => {
      if (cameraPermission !== "granted") return;

      try {
        console.log("Creating test applicant");
        const applicantResponse = await onfidoService.createApplicant(
          "Test",
          "User",
          "test@example.com"
        );

        if (!applicantResponse.success) {
          throw new Error("Failed to create applicant");
        }

        const newApplicantId = applicantResponse.data.id;
        console.log("Applicant created:", newApplicantId);
        setApplicantId(newApplicantId);

        const tokenResponse = await onfidoService.generateSdkToken(
          newApplicantId
        );
        if (!tokenResponse.success) {
          throw new Error("Failed to generate token");
        }

        console.log("Token generated");
        setSdkToken(tokenResponse.data.token);
        setLoading(false);
      } catch (err) {
        console.error("Setup error:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    setup();

    return () => {
      if (onfidoInstance.current) {
        try {
          console.log("Cleaning up Onfido instance");
          onfidoInstance.current.tearDown();
        } catch (e) {
          console.error("Error during teardown:", e);
        }
      }
    };
  }, [cameraPermission]);

  // Step 2: Initialize the Onfido SDK when we have a token
  const initOnfido = async () => {
    if (!sdkToken || !onfidoMountRef.current) {
      console.error("Cannot initialize: missing token or mount point");
      return;
    }

    setLoading(true);

    try {
      // Load the Onfido script if not already loaded
      if (!window.Onfido) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src =
            "https://assets.onfido.com/web-sdk-releases/17.4.0/onfido.min.js";
          script.async = true;
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      // Initialize the SDK
      console.log(
        "Initializing Onfido with token:",
        sdkToken.substring(0, 10) + "..."
      );

      // Clean up any existing instance
      if (onfidoInstance.current) {
        onfidoInstance.current.tearDown();
      }

      onfidoInstance.current = window.Onfido.init({
        token: sdkToken,
        containerId: "onfido-mount",
        onComplete: async (data) => {
          console.log("Onfido flow complete:", data);
          setComplete(true);
          setOutput(data);

          try {
            // Create a check with the captured documents
            const checkResponse = await onfidoService.createCheck(applicantId);

            if (!checkResponse.success) {
              throw new Error(checkResponse.error || "Failed to create check");
            }

            // Wait a moment for the check to be processed
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Extract the document data
            const extractResponse = await onfidoService.extractDocumentData(
              checkResponse.data.id
            );

            if (!extractResponse.success) {
              throw new Error(
                extractResponse.error || "Failed to extract document data"
              );
            }

            // Call parent's onComplete callback with the extracted data
            if (onComplete) {
              onComplete(extractResponse.data.extractedData);
            }
          } catch (err) {
            console.error("Error processing verification:", err);
            setError(err.message);
          }
        },
        onError: (error) => {
          console.error("Onfido error:", error);
          setError(error.message);
        },
        steps: [
          {
            type: "welcome",
            options: {
              title: "Verify your ID",
              descriptions: [
                "We need to verify your identity",
                "Please make sure you're in a well-lit area",
              ],
            },
          },
          {
            type: "document",
            options: {
              documentTypes: {
                driving_licence: {
                  country: "USA",
                },
                passport: true,
                national_identity_card: true,
              },
              forceCrossDevice: false,
              useLiveDocumentCapture: true,
            },
          },
          {
            type: "face",
            options: {
              requestedVariant: "standard",
              uploadFallback: false,
            },
          },
        ],
      });

      console.log("Onfido initialized successfully");
      setLoading(false);
    } catch (err) {
      console.error("Error initializing Onfido:", err);
      setError(`Initialization error: ${err.message}`);
      setLoading(false);
    }
  };

  const handleReset = () => {
    window.location.reload();
  };

  const handleBack = () => {
    // Call parent's onBack callback if provided
    if (onBack && typeof onBack === "function") {
      onBack();
    }
  };

  return (
    <Box
      sx={{ p: 3, height: "100vh", display: "flex", flexDirection: "column" }}
    >
      <IconButton
        onClick={handleBack}
        sx={{ position: "absolute", top: 16, left: 16 }}
      >
        <ArrowBackIcon />
      </IconButton>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ textAlign: "center", mb: 6, mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              We need to verify your identity
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              This helps ensure the security of your vote. You'll need to scan a
              government-issued photo ID.
            </Typography>
            {cameraPermission === "denied" && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Camera access is required. Please enable your camera and refresh
                the page.
              </Alert>
            )}
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={initOnfido}
              disabled={!sdkToken || cameraPermission !== "granted"}
              sx={{ mt: 2, py: 1.5, px: 4 }}
            >
              Start ID Verification
            </Button>
          </Box>

          <Box
            id="onfido-mount"
            ref={onfidoMountRef}
            sx={{
              width: "100%",
              height: "600px",
              border: "1px solid #ccc",
              backgroundColor: "#f5f5f5",
              borderRadius: 2,
              mt: 3,
              mx: "auto",
              maxWidth: "800px",
            }}
          />
        </>
      )}
    </Box>
  );
};

export default OnfidoTest;
