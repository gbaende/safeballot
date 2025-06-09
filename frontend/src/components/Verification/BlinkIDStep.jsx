import React, { useState, useRef, useEffect } from "react";
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
  CardMedia,
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

const BlinkIDStep = ({
  onComplete,
  onError,
  licenseKey,
  documentType = "single-side", // 'single-side' or 'multi-side'
  allowedDocuments = null, // array of allowed document types
  onProgress = null,
  onBack,
}) => {
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

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [scanningActive, setScanningActive] = useState(false);
  const [currentStep, setCurrentStep] = useState("front"); // 'front', 'back', 'complete'
  const [scanResults, setScanResults] = useState({
    front: null,
    back: null,
    combined: null,
  });
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const wasmSDKRef = useRef(null);
  const recognizerRef = useRef(null);
  const recognizerRunnerRef = useRef(null);
  const videoRecognizerRef = useRef(null);

  // Initialize BlinkID SDK
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if license key is provided and valid
        if (!licenseKey || licenseKey === "your_blinkid_license_key_here") {
          throw new Error(
            "Valid BlinkID license key required. Please get a license from https://microblink.com"
          );
        }

        // Check browser support
        if (!BlinkIDSDK.isBrowserSupported()) {
          throw new Error("Your browser is not supported by BlinkID SDK");
        }

        // Configure SDK settings
        const loadSettings = new BlinkIDSDK.WasmSDKLoadSettings(licenseKey);
        loadSettings.allowHelloMessage = true;
        loadSettings.engineLocation = "/resources/"; // Fixed path to match actual directory

        // Load WASM module
        const wasmSDK = await BlinkIDSDK.loadWasmModule(loadSettings);
        wasmSDKRef.current = wasmSDK;

        // Create recognizer based on document type
        let recognizer;
        if (documentType === "multi-side") {
          recognizer = await BlinkIDSDK.createBlinkIdMultiSideRecognizer(
            wasmSDK
          );
        } else {
          recognizer = await BlinkIDSDK.createBlinkIdSingleSideRecognizer(
            wasmSDK
          );
        }
        recognizerRef.current = recognizer;

        // Configure recognizer settings if needed
        if (allowedDocuments) {
          const settings = await recognizer.currentSettings();
          // Configure allowed documents here if SDK supports it
          await recognizer.updateSettings(settings);
        }

        // Create recognizer runner
        const recognizerRunner = await BlinkIDSDK.createRecognizerRunner(
          wasmSDK,
          [recognizer],
          false
        );
        recognizerRunnerRef.current = recognizerRunner;

        setSdkLoaded(true);
        onProgress?.({
          step: "sdk-loaded",
          message: "SDK initialized successfully",
        });
      } catch (err) {
        console.error("Failed to initialize BlinkID SDK:", err);
        setError(`Failed to initialize scanner: ${err.message}`);
        onError?.(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (licenseKey) {
      initializeSDK();
    }

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [licenseKey, documentType, allowedDocuments]);

  const cleanup = () => {
    try {
      if (videoRecognizerRef.current) {
        videoRecognizerRef.current.releaseVideoFeed();
        videoRecognizerRef.current = null;
      }
      if (recognizerRunnerRef.current) {
        recognizerRunnerRef.current.delete();
        recognizerRunnerRef.current = null;
      }
      if (recognizerRef.current) {
        recognizerRef.current.delete();
        recognizerRef.current = null;
      }
    } catch (err) {
      console.error("Error during cleanup:", err);
    }
  };

  const startCameraScanning = async () => {
    try {
      setShowCamera(true);
      setCameraError(null);
      setScanningActive(true);

      if (!videoRef.current || !recognizerRunnerRef.current) {
        throw new Error("Camera or recognizer not ready");
      }

      // Create video recognizer from camera stream
      const videoRecognizer =
        await BlinkIDSDK.VideoRecognizer.createVideoRecognizerFromCameraStream(
          videoRef.current,
          recognizerRunnerRef.current
        );
      videoRecognizerRef.current = videoRecognizer;

      onProgress?.({
        step: "scanning-started",
        message: "Camera scanning started",
      });

      // Start recognition
      const processResult = await videoRecognizer.recognize();

      if (processResult !== BlinkIDSDK.RecognizerResultState.Empty) {
        const result = await recognizerRef.current.getResult();
        await handleScanResult(result);
      } else {
        throw new Error("No document detected. Please try again.");
      }
    } catch (err) {
      console.error("Camera scanning error:", err);
      setCameraError(err.message);
      setScanningActive(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);

      // Create image element
      const imageElement = document.createElement("img");
      imageElement.src = URL.createObjectURL(file);
      await new Promise((resolve) => {
        imageElement.onload = resolve;
      });

      // Process image
      const imageFrame = BlinkIDSDK.captureFrame(imageElement);
      const processResult = await recognizerRunnerRef.current.processImage(
        imageFrame
      );

      if (processResult !== BlinkIDSDK.RecognizerResultState.Empty) {
        const result = await recognizerRef.current.getResult();
        await handleScanResult(result);
      } else {
        throw new Error(
          "No document detected in the uploaded image. Please try a different image."
        );
      }

      // Cleanup
      URL.revokeObjectURL(imageElement.src);
    } catch (err) {
      console.error("File upload error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanResult = async (result) => {
    try {
      onProgress?.({
        step: "processing-result",
        message: "Processing scan result",
      });

      // Extract relevant data from BlinkID result
      const extractedData = {
        documentType: result.classInfo?.documentType || "unknown",
        country: result.classInfo?.country || "unknown",
        region: result.classInfo?.region || "unknown",
        firstName: extractStringValue(result.firstName),
        lastName: extractStringValue(result.lastName),
        fullName: extractStringValue(result.fullName),
        dateOfBirth: extractStringValue(result.dateOfBirth),
        documentNumber: extractStringValue(result.documentNumber),
        address: extractStringValue(result.address),
        dateOfExpiry: extractStringValue(result.dateOfExpiry),
        dateOfIssue: extractStringValue(result.dateOfIssue),
        sex: extractStringValue(result.sex),
        nationality: extractStringValue(result.nationality),
        // Images
        faceImage: result.faceImage || null,
        fullDocumentImage: result.fullDocumentImage || null,
        signatureImage: result.signatureImage || null,
        // Additional fields
        personalIdNumber: extractStringValue(result.personalIdNumber),
        drivingLicenceDetailedInfo: result.drivingLicenceDetailedInfo || null,
        // Verification status
        documentDataMatch: result.documentDataMatch || null,
        scanningFirstSideDone: result.scanningFirstSideDone || false,
      };

      if (
        documentType === "multi-side" &&
        !extractedData.scanningFirstSideDone
      ) {
        // First side scanned, prompt for back side
        setScanResults((prev) => ({ ...prev, front: extractedData }));
        setCurrentStep("back");
        setScanningActive(false);
        setShowCamera(false);
        onProgress?.({
          step: "first-side-complete",
          message: "Front side scanned. Please scan the back side.",
        });
      } else {
        // Single side or both sides complete
        const finalResults =
          documentType === "multi-side"
            ? { ...scanResults, back: extractedData, combined: extractedData }
            : { front: extractedData, combined: extractedData };

        setScanResults(finalResults);
        setCurrentStep("complete");
        setScanningActive(false);
        setShowCamera(false);

        onProgress?.({
          step: "scan-complete",
          message: "Document scanning completed successfully",
        });
        onComplete?.(finalResults);
      }
    } catch (err) {
      console.error("Error handling scan result:", err);
      setError(`Error processing scan result: ${err.message}`);
      setScanningActive(false);
    }
  };

  const resetScanning = () => {
    setScanResults({ front: null, back: null, combined: null });
    setCurrentStep("front");
    setShowCamera(false);
    setScanningActive(false);
    setCameraError(null);
    setError(null);
  };

  const renderScanningInterface = () => (
    <Dialog
      open={showCamera}
      onClose={() => setShowCamera(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: "70vh" },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Scan {currentStep === "back" ? "Back" : "Front"} of Document
          </Typography>
          <IconButton onClick={() => setShowCamera(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box textAlign="center" mb={2}>
          <Typography variant="body2" color="textSecondary">
            Position your document within the frame and hold steady
          </Typography>
        </Box>

        {cameraError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {cameraError}
          </Alert>
        )}

        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: "400px",
            backgroundColor: "#000",
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <video
            ref={videoRef}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            autoPlay
            muted
            playsInline
          />

          {scanningActive && (
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "white",
                textAlign: "center",
              }}
            >
              <CircularProgress color="inherit" size={40} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Scanning...
              </Typography>
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
          {scanningActive ? "Scanning..." : "Start Scan"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderResults = () => {
    if (!scanResults.combined) return null;

    const data = scanResults.combined;

    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <CheckIcon
              color="success"
              sx={{ mr: 1, verticalAlign: "middle" }}
            />
            Document Scanned Successfully
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Personal Information
              </Typography>
              <Typography variant="body2">
                <strong>Name:</strong>{" "}
                {data.fullName ||
                  `${data.firstName} ${data.lastName}`.trim() ||
                  "Not detected"}
              </Typography>
              <Typography variant="body2">
                <strong>Date of Birth:</strong>{" "}
                {data.dateOfBirth || "Not detected"}
              </Typography>
              <Typography variant="body2">
                <strong>Document Number:</strong>{" "}
                {data.documentNumber || "Not detected"}
              </Typography>
              <Typography variant="body2">
                <strong>Nationality:</strong>{" "}
                {data.nationality || "Not detected"}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Document Information
              </Typography>
              <Typography variant="body2">
                <strong>Document Type:</strong> {data.documentType}
              </Typography>
              <Typography variant="body2">
                <strong>Country:</strong> {data.country}
              </Typography>
              <Typography variant="body2">
                <strong>Expiry Date:</strong>{" "}
                {data.dateOfExpiry || "Not detected"}
              </Typography>
              {data.documentDataMatch !== null && (
                <Typography variant="body2">
                  <strong>Data Match:</strong>{" "}
                  {data.documentDataMatch ? "Verified" : "Mismatch detected"}
                </Typography>
              )}
            </Grid>

            {data.faceImage && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Extracted Face Image
                </Typography>
                <img
                  src={`data:image/jpeg;base64,${data.faceImage}`}
                  alt="Face"
                  style={{
                    maxWidth: "150px",
                    maxHeight: "150px",
                    borderRadius: "4px",
                  }}
                />
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  if (!licenseKey) {
    return (
      <Alert severity="error">
        BlinkID license key is required for document scanning.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Document Verification
      </Typography>

      <Typography variant="body1" color="textSecondary" paragraph>
        {currentStep === "front"
          ? "Scan the front side of your identity document"
          : currentStep === "back"
          ? "Now scan the back side of your document"
          : "Document scanning completed"}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isLoading && (
        <Box display="flex" alignItems="center" justifyContent="center" py={4}>
          <CircularProgress sx={{ mr: 2 }} />
          <Typography>Initializing scanner...</Typography>
        </Box>
      )}

      {sdkLoaded && currentStep !== "complete" && (
        <Box>
          <Grid container spacing={2} sx={{ mb: 3 }}>
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
        </Box>
      )}

      {currentStep === "back" && scanResults.front && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Front side scanned successfully. Please scan the back side of your
          document.
        </Alert>
      )}

      {currentStep === "complete" && (
        <Box>
          {renderResults()}
          <Box mt={3} display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={resetScanning}
            >
              Scan Again
            </Button>
            <Button
              variant="contained"
              onClick={() => onComplete?.(scanResults)}
            >
              Continue
            </Button>
          </Box>
        </Box>
      )}

      {renderScanningInterface()}
    </Box>
  );
};

export default BlinkIDStep;
