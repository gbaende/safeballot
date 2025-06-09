import React, { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  IconButton,
} from "@mui/material";
import {
  CameraAlt as CameraIcon,
  Upload as UploadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import * as BlinkIDSDK from "@microblink/blinkid-in-browser-sdk";
import {
  verifyLoginIdentityRequest,
  verifyLoginIdentitySuccess,
  verifyLoginIdentityFailure,
} from "../../store/authSlice";

const LoginBlinkIDStep = ({ onComplete, onError, onBack, ballotId }) => {
  const dispatch = useDispatch();

  // Helper function to safely extract string values from BlinkID complex objects
  const extractStringValue = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      return (
        value.latin ||
        value.originalString ||
        value.originalDateString ||
        value.value ||
        value.toString?.() ||
        ""
      );
    }
    return String(value || "");
  };

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [scanningActive, setScanningActive] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const recognizerRef = useRef(null);
  const recognizerRunnerRef = useRef(null);
  const videoRecognizerRef = useRef(null);

  // Login-specific BlinkID configuration - streamlined for faster processing
  const LOGIN_CONFIG = {
    licenseKey: process.env.REACT_APP_BLINKID_LICENSE_KEY,
    engineLocation: "/resources/",
    allowedDocuments: ["passport", "driver-license", "national-id"],
    requireFullDocument: false, // Less strict for login
    extractSignature: false, // Skip signature for faster login
    extractPhoto: false, // Skip photo for faster login
    flowType: "login",
    ballotId: ballotId,
  };

  useEffect(() => {
    initializeLoginBlinkID();
    return () => {
      cleanup();
    };
  }, []);

  const initializeLoginBlinkID = async () => {
    try {
      setIsLoading(true);
      setError(null);
      dispatch(verifyLoginIdentityRequest());

      console.log("[LOGIN_BLINKID] Initializing for login flow");

      if (
        !LOGIN_CONFIG.licenseKey ||
        LOGIN_CONFIG.licenseKey === "your_blinkid_license_key_here"
      ) {
        throw new Error("Valid BlinkID license key required for login");
      }

      if (!BlinkIDSDK.isBrowserSupported()) {
        throw new Error("Browser not supported for document scanning");
      }

      // Initialize with login-specific settings (faster setup)
      const loadSettings = new BlinkIDSDK.WasmSDKLoadSettings(
        LOGIN_CONFIG.licenseKey
      );
      loadSettings.engineLocation = LOGIN_CONFIG.engineLocation;
      loadSettings.allowHelloMessage = false; // Skip intro message for faster login
      loadSettings.loadProgressCallback = (progress) => {
        console.log(`[LOGIN_BLINKID] Loading progress: ${progress}%`);
      };

      const wasmSDK = await BlinkIDSDK.loadWasmModule(loadSettings);

      // Create recognizer with login-specific settings (minimal extraction)
      const recognizer = await BlinkIDSDK.createBlinkIdSingleSideRecognizer(
        wasmSDK
      );

      // Configure recognizer for login requirements - faster processing
      const recognizerSettings = await recognizer.currentSettings();
      recognizerSettings.returnFaceImage = false; // Skip for speed
      recognizerSettings.returnFullDocumentImage = false; // Skip for speed
      recognizerSettings.returnSignatureImage = false; // Skip for speed
      recognizerSettings.allowBlurFilter = true; // More lenient for login
      recognizerSettings.allowUnparsedMrzResults = true; // More lenient
      recognizerSettings.allowUnverifiedMrzResults = true; // More lenient

      await recognizer.updateSettings(recognizerSettings);

      // Create recognizer runner
      const recognizerRunner = await BlinkIDSDK.createRecognizerRunner(
        wasmSDK,
        [recognizer],
        false
      );

      recognizerRef.current = recognizer;
      recognizerRunnerRef.current = recognizerRunner;

      setSdkLoaded(true);
      console.log("[LOGIN_BLINKID] SDK initialized successfully for login");
    } catch (err) {
      console.error("[LOGIN_BLINKID] Initialization error:", err);
      setError(
        "Failed to initialize document scanner for login. Please try again."
      );
      dispatch(verifyLoginIdentityFailure(err.message));
      if (onError) onError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const startCameraScanning = async () => {
    try {
      setShowCamera(true);
      setCameraError(null);
      setScanningActive(true);

      console.log("[LOGIN_BLINKID] Starting camera scanning for login");

      if (!videoRef.current || !recognizerRunnerRef.current) {
        throw new Error("Camera or recognizer not ready");
      }

      // Create video recognizer with login-specific camera settings (faster)
      const cameraSettings = {
        facingMode: "environment",
        width: { ideal: 1280 }, // Lower resolution for faster processing
        height: { ideal: 720 },
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraSettings,
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const videoRecognizer =
        await BlinkIDSDK.VideoRecognizer.createVideoRecognizerFromCameraStream(
          videoRef.current,
          recognizerRunnerRef.current
        );

      videoRecognizerRef.current = videoRecognizer;

      // Start recognition with login flow logging
      const processResult = await videoRecognizer.recognize();

      if (processResult !== BlinkIDSDK.RecognizerResultState.Empty) {
        const result = await recognizerRef.current.getResult();
        await handleLoginScanResult(result);
      } else {
        throw new Error("No document detected. Please try again.");
      }
    } catch (err) {
      console.error("[LOGIN_BLINKID] Camera scanning error:", err);
      setCameraError(err.message);
      setScanningActive(false);
      dispatch(verifyLoginIdentityFailure(err.message));
    } finally {
      cleanup();
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log("[LOGIN_BLINKID] Processing uploaded file for login");

      const imageElement = document.createElement("img");
      imageElement.src = URL.createObjectURL(file);

      await new Promise((resolve) => {
        imageElement.onload = resolve;
      });

      const imageFrame = BlinkIDSDK.captureFrame(imageElement);
      const processResult = await recognizerRunnerRef.current.processImage(
        imageFrame
      );

      URL.revokeObjectURL(imageElement.src);

      if (processResult !== BlinkIDSDK.RecognizerResultState.Empty) {
        const result = await recognizerRef.current.getResult();
        await handleLoginScanResult(result);
      } else {
        throw new Error("Failed to process document image. Please try again.");
      }
    } catch (err) {
      console.error("[LOGIN_BLINKID] File upload error:", err);
      setError(err.message);
      dispatch(verifyLoginIdentityFailure(err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginScanResult = async (result) => {
    try {
      console.log("[LOGIN_BLINKID] Processing scan result for login:", result);

      // Extract minimal login verification data (just what's needed for identity check)
      const loginData = {
        // Minimal required fields for login verification
        firstName: extractStringValue(result.firstName),
        lastName: extractStringValue(result.lastName),
        fullName:
          extractStringValue(result.fullName) ||
          `${extractStringValue(result.firstName)} ${extractStringValue(
            result.lastName
          )}`.trim(),
        documentNumber: extractStringValue(result.documentNumber),

        // Login metadata
        flowType: "login",
        ballotId: ballotId,
        timestamp: new Date().toISOString(),
        processingStatus: result.processingStatus,

        // Minimal verification fields
        dateOfBirth: extractStringValue(result.dateOfBirth),
        nationality: extractStringValue(result.nationality),
      };

      setScanResult(loginData);
      setScanningActive(false);
      setShowCamera(false);

      console.log("[LOGIN_BLINKID] Login scan completed successfully");
      dispatch(verifyLoginIdentitySuccess(loginData));

      if (onComplete) {
        onComplete(loginData);
      }
    } catch (err) {
      console.error("[LOGIN_BLINKID] Error processing login scan result:", err);
      setError("Failed to process document for login. Please try again.");
      dispatch(verifyLoginIdentityFailure(err.message));
    }
  };

  const cleanup = () => {
    if (videoRecognizerRef.current) {
      videoRecognizerRef.current.releaseVideoFeed();
      videoRecognizerRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    setScanningActive(false);
    setShowCamera(false);
  };

  const resetScanning = () => {
    setScanResult(null);
    setError(null);
    setCameraError(null);
    cleanup();
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          p: 3,
        }}
      >
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="h6">Initializing Login Scanner...</Typography>
        <Typography variant="body2" color="textSecondary">
          Setting up quick identity verification for login
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" color="error" gutterBottom>
            Login Scanner Error
          </Typography>
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ mb: 3, textAlign: "center" }}
          >
            {error}
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="contained" onClick={initializeLoginBlinkID}>
              Try Again
            </Button>
            {onBack && (
              <Button variant="outlined" onClick={onBack}>
                Go Back
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    );
  }

  if (scanResult) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <CheckIcon color="success" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Identity Verified for Login
          </Typography>
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ mb: 3, textAlign: "center" }}
          >
            Your identity has been verified. You can now proceed to vote.
          </Typography>

          <Card sx={{ width: "100%", maxWidth: 400, mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Verified Identity:
              </Typography>
              <Typography variant="body2">
                <strong>Name:</strong> {scanResult.fullName || "Not available"}
              </Typography>
              <Typography variant="body2">
                <strong>Document:</strong>{" "}
                {scanResult.documentNumber || "Not available"}
              </Typography>
            </CardContent>
          </Card>

          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={resetScanning}
            >
              Scan Again
            </Button>
            <Button
              variant="contained"
              onClick={() => onComplete?.(scanResult)}
            >
              Continue to Vote
            </Button>
          </Box>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box
        sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <Typography variant="h5" gutterBottom>
          Quick Identity Verification for Login
        </Typography>
        <Typography
          variant="body1"
          color="textSecondary"
          sx={{ mb: 3, textAlign: "center" }}
        >
          Please scan your ID document to verify your identity and access the
          ballot. This is a quick verification for existing voters.
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3, maxWidth: 400 }}>
          <Grid item xs={12} sm={6}>
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<CameraIcon />}
              onClick={() => setShowCamera(true)}
              disabled={!sdkLoaded || isLoading}
              sx={{ py: 2 }}
            >
              Use Camera
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              component="label"
              startIcon={<UploadIcon />}
              disabled={!sdkLoaded || isLoading}
              sx={{ py: 2 }}
            >
              Upload Image
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleFileUpload}
              />
            </Button>
          </Grid>
        </Grid>

        {onBack && (
          <Button variant="text" onClick={onBack}>
            Go Back
          </Button>
        )}
      </Box>

      {/* Camera Dialog */}
      <Dialog
        open={showCamera}
        onClose={() => setShowCamera(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Quick Login Verification
          <IconButton
            onClick={() => setShowCamera(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {cameraError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {cameraError}
            </Alert>
          )}

          <Box sx={{ position: "relative", textAlign: "center" }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                maxWidth: "500px",
                height: "auto",
                borderRadius: "8px",
              }}
            />
            {scanningActive && (
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.3)",
                  borderRadius: "8px",
                }}
              >
                <CircularProgress color="primary" />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCamera(false)}>Cancel</Button>
          <Button
            onClick={startCameraScanning}
            variant="contained"
            disabled={scanningActive}
            startIcon={
              scanningActive ? <CircularProgress size={20} /> : <CameraIcon />
            }
          >
            {scanningActive ? "Verifying..." : "Start Quick Scan"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default LoginBlinkIDStep;
