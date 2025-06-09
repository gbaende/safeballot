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
  registrationScanRequest,
  registrationScanSuccess,
  registrationScanFailure,
} from "../../store/authSlice";

const RegistrationBlinkIDStep = ({ onComplete, onError, onBack, ballotId }) => {
  const dispatch = useDispatch();

  // Helper function to safely extract string values from BlinkID complex objects
  const extractStringValue = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      // Try multiple possible string properties from BlinkID objects
      const stringValue =
        value.latin ||
        value.originalString ||
        value.originalDateString ||
        value.value ||
        value.description ||
        value.stringResult ||
        "";

      // If we still have an object, try to convert it properly
      if (stringValue && typeof stringValue === "string") {
        return stringValue;
      }

      // Last resort: if it's still an object, try toString but avoid [object Object]
      if (value.toString && value.toString() !== "[object Object]") {
        return value.toString();
      }

      return "";
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
  const [imagePreview, setImagePreview] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);

  const videoRef = useRef(null);
  const recognizerRef = useRef(null);
  const recognizerRunnerRef = useRef(null);
  const videoRecognizerRef = useRef(null);

  // Registration-specific BlinkID configuration
  const REGISTRATION_CONFIG = {
    licenseKey: process.env.REACT_APP_BLINKID_LICENSE_KEY,
    engineLocation: "/resources/",
    allowedDocuments: ["passport", "driver-license", "national-id"],
    requireFullDocument: true,
    extractSignature: true,
    extractPhoto: true,
    flowType: "registration",
    ballotId: ballotId,
  };

  useEffect(() => {
    initializeRegistrationBlinkID();
    return () => {
      cleanup();
    };
  }, []);

  const initializeRegistrationBlinkID = async () => {
    try {
      setIsLoading(true);
      setError(null);
      dispatch(registrationScanRequest());

      console.log("[REGISTRATION_BLINKID] Initializing for registration flow");

      if (
        !REGISTRATION_CONFIG.licenseKey ||
        REGISTRATION_CONFIG.licenseKey === "your_blinkid_license_key_here"
      ) {
        throw new Error("Valid BlinkID license key required for registration");
      }

      if (!BlinkIDSDK.isBrowserSupported()) {
        throw new Error("Browser not supported for document scanning");
      }

      // Initialize with registration-specific settings
      const loadSettings = new BlinkIDSDK.WasmSDKLoadSettings(
        REGISTRATION_CONFIG.licenseKey
      );
      loadSettings.engineLocation = REGISTRATION_CONFIG.engineLocation;
      loadSettings.allowHelloMessage = true;
      loadSettings.loadProgressCallback = (progress) => {
        console.log(`[REGISTRATION_BLINKID] Loading progress: ${progress}%`);
      };

      const wasmSDK = await BlinkIDSDK.loadWasmModule(loadSettings);

      // Create recognizer with registration-specific settings
      const recognizer = await BlinkIDSDK.createBlinkIdSingleSideRecognizer(
        wasmSDK
      );

      // Configure recognizer for registration requirements
      const recognizerSettings = await recognizer.currentSettings();
      recognizerSettings.returnFaceImage = true;
      recognizerSettings.returnFullDocumentImage = true;
      recognizerSettings.returnSignatureImage =
        REGISTRATION_CONFIG.extractSignature;
      recognizerSettings.allowBlurFilter = false;
      recognizerSettings.allowUnparsedMrzResults = false;
      recognizerSettings.allowUnverifiedMrzResults = false;

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
      console.log(
        "[REGISTRATION_BLINKID] SDK initialized successfully for registration"
      );
    } catch (err) {
      console.error("[REGISTRATION_BLINKID] Initialization error:", err);
      setError(
        "Failed to initialize document scanner for registration. Please try again."
      );
      dispatch(registrationScanFailure(err.message));
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

      console.log(
        "[REGISTRATION_BLINKID] Starting camera scanning for registration"
      );

      if (!videoRef.current || !recognizerRunnerRef.current) {
        throw new Error("Camera or recognizer not ready");
      }

      // Create video recognizer with registration-specific camera settings
      const cameraSettings = {
        facingMode: "environment",
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        advanced: [{ torch: false }],
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

      // Start recognition with registration flow logging
      const processResult = await videoRecognizer.recognize();

      if (processResult !== BlinkIDSDK.RecognizerResultState.Empty) {
        const result = await recognizerRef.current.getResult();
        await handleRegistrationScanResult(result);
      } else {
        throw new Error(
          "No document detected. Please ensure proper lighting and positioning."
        );
      }
    } catch (err) {
      console.error("[REGISTRATION_BLINKID] Camera scanning error:", err);
      setCameraError(err.message);
      setScanningActive(false);
      dispatch(registrationScanFailure(err.message));
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

      console.log(
        "[REGISTRATION_BLINKID] Processing uploaded file for registration:",
        {
          name: file.name,
          size: file.size,
          type: file.type,
        }
      );

      // File validation
      const maxSizeInMB = 10;
      if (file.size > maxSizeInMB * 1024 * 1024) {
        throw new Error(`File is too large. Maximum size is ${maxSizeInMB}MB.`);
      }

      const supportedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/bmp",
      ];
      if (!supportedTypes.includes(file.type.toLowerCase())) {
        throw new Error(
          `Unsupported file type. Please use JPG, PNG, or BMP format.`
        );
      }

      // Create image element and wait for load
      const imageElement = document.createElement("img");
      const imageUrl = URL.createObjectURL(file);
      imageElement.src = imageUrl;

      // Store preview data for error debugging
      setImagePreview({
        url: imageUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      });

      // Wait for image to load with timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(
            new Error("Image loading timeout. Please try a different image.")
          );
        }, 10000); // 10 second timeout

        imageElement.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        imageElement.onerror = () => {
          clearTimeout(timeout);
          reject(new Error("Invalid image file. Please select a valid image."));
        };
      });

      // Check image dimensions
      if (imageElement.width < 300 || imageElement.height < 200) {
        URL.revokeObjectURL(imageUrl);
        throw new Error(
          "Image resolution is too low. Please use a higher quality image (minimum 300x200 pixels)."
        );
      }

      console.log(
        "[REGISTRATION_BLINKID] Image validated, processing with BlinkID SDK"
      );

      // Process with BlinkID SDK
      const imageFrame = BlinkIDSDK.captureFrame(imageElement);

      if (!imageFrame) {
        URL.revokeObjectURL(imageUrl);
        throw new Error(
          "Failed to capture image frame. Please try a different image."
        );
      }

      const processResult = await recognizerRunnerRef.current.processImage(
        imageFrame
      );

      URL.revokeObjectURL(imageUrl);

      console.log(
        "[REGISTRATION_BLINKID] SDK processing result:",
        processResult
      );

      // Log the actual SDK state names for better debugging
      const stateNames = {
        0: "Empty",
        1: "Uncertain",
        2: "Valid",
      };

      console.log("[REGISTRATION_BLINKID] SDK processing result details:", {
        resultCode: processResult,
        stateName: stateNames[processResult] || "Unknown",
        imageSize: `${imageElement.width}x${imageElement.height}`,
        fileSize: `${Math.round(file.size / 1024)}KB`,
      });

      if (processResult === BlinkIDSDK.RecognizerResultState.Valid) {
        const result = await recognizerRef.current.getResult();
        await handleRegistrationScanResult(result);
      } else if (processResult === BlinkIDSDK.RecognizerResultState.Uncertain) {
        const result = await recognizerRef.current.getResult();
        console.warn(
          "[REGISTRATION_BLINKID] Uncertain result, attempting to process anyway"
        );
        await handleRegistrationScanResult(result);
      } else if (processResult === BlinkIDSDK.RecognizerResultState.Empty) {
        // Get more detailed information about why the result was empty
        try {
          const result = await recognizerRef.current.getResult();
          console.log("[REGISTRATION_BLINKID] Empty result details:", result);
        } catch (e) {
          console.log(
            "[REGISTRATION_BLINKID] Could not get result details for empty state"
          );
        }

        // Show image preview for user to analyze
        setShowImagePreview(true);

        throw new Error(
          "No valid government-issued document detected. Please ensure your ID document fills most of the frame and is clearly visible."
        );
      } else {
        throw new Error(
          "Document processing failed. Please ensure the document is well-lit, in focus, and fully visible."
        );
      }
    } catch (err) {
      console.error("[REGISTRATION_BLINKID] File upload error:", err);

      // Show image preview for debugging if we have one
      if (imagePreview && !showImagePreview) {
        setShowImagePreview(true);
      }

      // Provide more user-friendly error messages
      let userMessage = err.message;

      if (err.message.includes("captureFrame")) {
        userMessage =
          "Failed to process image. Please try a clearer, well-lit photo of your document.";
      } else if (err.message.includes("processImage")) {
        userMessage =
          "Document processing failed. Please ensure your document is fully visible and in focus.";
      } else if (
        err.message.includes("network") ||
        err.message.includes("fetch")
      ) {
        userMessage =
          "Network error. Please check your connection and try again.";
      }

      setError(userMessage);
      dispatch(registrationScanFailure(userMessage));
    } finally {
      setIsLoading(false);
      // Clear the file input so user can try the same file again if needed
      event.target.value = "";
    }
  };

  const handleRegistrationScanResult = async (result) => {
    try {
      console.log(
        "[REGISTRATION_BLINKID] Processing scan result for registration:",
        result
      );

      // Debug the fullName object structure
      if (result.fullName) {
        console.log("[REGISTRATION_BLINKID] FullName object structure:", {
          type: typeof result.fullName,
          value: result.fullName,
          keys: Object.keys(result.fullName || {}),
          latin: result.fullName.latin,
          originalString: result.fullName.originalString,
          description: result.fullName.description,
          stringResult: result.fullName.stringResult,
        });
      }

      // Clear any image preview since processing was successful
      setImagePreview(null);
      setShowImagePreview(false);

      // Helper function to convert ImageData to base64 string
      const imageDataToBase64 = (imageData) => {
        if (!imageData || !imageData.rawImage) return null;

        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = imageData.rawImage.width;
          canvas.height = imageData.rawImage.height;
          ctx.putImageData(imageData.rawImage, 0, 0);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

          // Return just the base64 part without the data URL prefix
          // This prevents double-prefixing when the image is displayed
          return dataUrl.split(",")[1];
        } catch (error) {
          console.warn(
            "[REGISTRATION_BLINKID] Failed to convert image data:",
            error
          );
          return null;
        }
      };

      // Extract and format registration-specific data
      const registrationData = {
        // Required fields for registration
        firstName: extractStringValue(result.firstName),
        lastName: extractStringValue(result.lastName),
        fullName:
          extractStringValue(result.fullName) ||
          `${extractStringValue(result.firstName)} ${extractStringValue(
            result.lastName
          )}`.trim(),
        dateOfBirth: extractStringValue(result.dateOfBirth),
        documentNumber: extractStringValue(result.documentNumber),
        nationality: extractStringValue(result.nationality),

        // Additional registration fields
        address: extractStringValue(result.address),
        sex: extractStringValue(result.sex),
        personalIdNumber: extractStringValue(result.personalIdNumber),
        dateOfExpiry: extractStringValue(result.dateOfExpiry),
        dateOfIssue: extractStringValue(result.dateOfIssue),
        issuer: extractStringValue(result.issuer),

        // Registration metadata
        flowType: "registration",
        ballotId: ballotId,
        timestamp: new Date().toISOString(),
        processingStatus: result.processingStatus,
        recognitionMode: result.recognitionMode,

        // Images for registration verification (converted to base64 for Redux serialization)
        faceImage: imageDataToBase64(result.faceImage),
        fullDocumentImage: imageDataToBase64(result.fullDocumentImage),
        documentImage: imageDataToBase64(result.fullDocumentImage),
        signatureImage: imageDataToBase64(result.signatureImage),
      };

      setScanResult(registrationData);
      setScanningActive(false);
      setShowCamera(false);

      // Debug the processed image data
      console.log("[REGISTRATION_BLINKID] Processed image data:", {
        faceImageLength: registrationData.faceImage?.length || 0,
        documentImageLength: registrationData.documentImage?.length || 0,
        fullDocumentImageLength:
          registrationData.fullDocumentImage?.length || 0,
        signatureImageLength: registrationData.signatureImage?.length || 0,
        faceImageSample: registrationData.faceImage?.substring(0, 50) + "...",
        documentImageSample:
          registrationData.documentImage?.substring(0, 50) + "...",
      });

      console.log(
        "[REGISTRATION_BLINKID] Registration scan completed successfully"
      );
      dispatch(registrationScanSuccess(registrationData));

      if (onComplete) {
        onComplete(registrationData);
      }
    } catch (err) {
      console.error(
        "[REGISTRATION_BLINKID] Error processing registration scan result:",
        err
      );
      setError(
        "Failed to process document for registration. Please try again."
      );
      dispatch(registrationScanFailure(err.message));
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
    setImagePreview(null);
    setShowImagePreview(false);
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
        <Typography variant="h6">
          Initializing Registration Scanner...
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Setting up document verification for voter registration
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
            Registration Scanner Error
          </Typography>
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ mb: 3, textAlign: "center" }}
          >
            {error}
          </Typography>

          {/* Troubleshooting Tips */}
          <Card
            sx={{
              width: "100%",
              maxWidth: 500,
              mb: 3,
              bgcolor: "background.paper",
            }}
          >
            <CardContent>
              <Typography variant="subtitle2" gutterBottom color="primary">
                🔧 Troubleshooting Tips:
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Document visibility:</strong> Ensure the entire
                  document is visible with no cropped edges
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Document type:</strong> Only government-issued photo
                  IDs work (passport, driver's license, national ID)
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Image quality:</strong> Ensure good lighting, sharp
                  focus, and no blur
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Document position:</strong> Lay document flat, avoid
                  tilted angles or glare
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Background:</strong> Use a plain, contrasting
                  background (dark document on light surface)
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  <strong>File format:</strong> Use JPG, PNG, or BMP format (max
                  10MB)
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Camera vs Upload:</strong> Try using the camera
                  instead of uploading a photo
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="contained" onClick={initializeRegistrationBlinkID}>
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
            Registration Document Verified
          </Typography>
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ mb: 3, textAlign: "center" }}
          >
            Your identity document has been successfully scanned for voter
            registration
          </Typography>

          <Card sx={{ width: "100%", maxWidth: 400, mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Verified Information:
              </Typography>
              <Typography variant="body2">
                <strong>Name:</strong> {scanResult.fullName || "Not available"}
              </Typography>
              <Typography variant="body2">
                <strong>Document:</strong>{" "}
                {scanResult.documentNumber || "Not available"}
              </Typography>
              <Typography variant="body2">
                <strong>Nationality:</strong>{" "}
                {scanResult.nationality || "Not available"}
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
              Continue Registration
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
          Document Verification for Registration
        </Typography>
        <Typography
          variant="body1"
          color="textSecondary"
          sx={{ mb: 2, textAlign: "center" }}
        >
          Please scan your government-issued ID to complete voter registration.
          We support passports, driver's licenses, and national ID cards.
        </Typography>

        {/* Document Requirements */}
        <Card
          sx={{
            width: "100%",
            maxWidth: 500,
            mb: 3,
            bgcolor: "background.default",
          }}
        >
          <CardContent>
            <Typography variant="subtitle2" gutterBottom color="primary">
              📋 Document Requirements:
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                Government-issued photo ID (passport, driver's license, national
                ID)
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                Document must be valid and not expired
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                All text and details must be clearly visible
              </Typography>
            </Box>

            <Typography
              variant="subtitle2"
              gutterBottom
              color="primary"
              sx={{ mt: 2 }}
            >
              📸 Photo Tips:
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                Good lighting - avoid shadows and glare
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                Hold document flat and steady
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                Fill the frame - document should take up most of the image
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                Use JPG, PNG, or BMP format (max 10MB)
              </Typography>
            </Box>
          </CardContent>
        </Card>

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
                accept="image/jpeg,image/jpg,image/png,image/bmp"
                onChange={handleFileUpload}
              />
            </Button>
          </Grid>
        </Grid>

        {/* Processing Status */}
        {isLoading && (
          <Alert severity="info" sx={{ mb: 2, width: "100%", maxWidth: 500 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">
                Processing document... This may take a few moments.
              </Typography>
            </Box>
          </Alert>
        )}

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
          Scan Registration Document
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
            {scanningActive ? "Scanning..." : "Start Registration Scan"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Preview Dialog for Troubleshooting */}
      <Dialog
        open={showImagePreview && imagePreview}
        onClose={() => setShowImagePreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Image Analysis - Document Not Detected
          <IconButton
            onClick={() => setShowImagePreview(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            The BlinkID scanner could not detect a valid government document in
            this image. Please review the image below and try the suggestions.
          </Alert>

          {imagePreview && (
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <img
                src={imagePreview.url}
                alt="Document preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "400px",
                  border: "2px solid #ddd",
                  borderRadius: "8px",
                }}
              />
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                {imagePreview.name} • {Math.round(imagePreview.size / 1024)}KB •{" "}
                {imagePreview.type}
              </Typography>
            </Box>
          )}

          <Card sx={{ bgcolor: "background.default" }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom color="primary">
                ✅ What to check in your image:
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  Is the entire document visible (no cropped edges)?
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  Is it a government-issued photo ID (not a photocopy or
                  screen)?
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  Is the text clear and readable?
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  Is there good contrast between the document and background?
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                  Is the document lying flat (not tilted or curved)?
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowImagePreview(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowImagePreview(false);
              setError(null);
              if (imagePreview?.url) {
                URL.revokeObjectURL(imagePreview.url);
              }
              setImagePreview(null);
            }}
          >
            Try Another Image
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default RegistrationBlinkIDStep;
