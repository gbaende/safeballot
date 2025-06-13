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

  // Helper function to preprocess images for better document detection
  const preprocessImage = async (imageElement) => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Set canvas size to match image
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;

      // Draw original image
      ctx.drawImage(imageElement, 0, 0);

      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Apply contrast enhancement and sharpening
      for (let i = 0; i < data.length; i += 4) {
        // Enhance contrast
        const contrast = 1.2;
        const factor =
          (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

        data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128)); // Red
        data[i + 1] = Math.min(
          255,
          Math.max(0, factor * (data[i + 1] - 128) + 128)
        ); // Green
        data[i + 2] = Math.min(
          255,
          Math.max(0, factor * (data[i + 2] - 128) + 128)
        ); // Blue
      }

      // Put processed image data back
      ctx.putImageData(imageData, 0, 0);

      // Create new image element with processed data
      const processedImage = new Image();
      processedImage.src = canvas.toDataURL("image/jpeg", 0.9);

      return new Promise((resolve) => {
        processedImage.onload = () => resolve(processedImage);
        processedImage.onerror = () => {
          console.warn(
            "[REGISTRATION_BLINKID] Processed image load failed, using original"
          );
          resolve(imageElement);
        };
      });
    } catch (error) {
      console.warn(
        "[REGISTRATION_BLINKID] Image preprocessing failed, using original:",
        error
      );
      return imageElement;
    }
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

      // Store references including wasmSDK for file upload fallback
      recognizerRef.current = recognizer;
      recognizerRunnerRef.current = recognizerRunner;
      recognizerRunnerRef.current.wasmSDK = wasmSDK; // Store for relaxed recognizer creation

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

      // Check image dimensions - be more lenient
      if (imageElement.width < 200 || imageElement.height < 150) {
        URL.revokeObjectURL(imageUrl);
        throw new Error(
          "Image resolution is too low. Please use a higher quality image (minimum 200x150 pixels)."
        );
      }

      console.log(
        "[REGISTRATION_BLINKID] Image validated, processing with BlinkID SDK"
      );

      // Preprocess image for better detection
      const processedImage = await preprocessImage(imageElement);

      // Create a more lenient recognizer for file uploads
      let processResult;
      let result;

      try {
        // First attempt with current recognizer using processed image
        const imageFrame = BlinkIDSDK.captureFrame(processedImage);

        if (!imageFrame) {
          // Fallback to original image if processed image fails
          console.log(
            "[REGISTRATION_BLINKID] Processed image failed, trying original..."
          );
          const originalFrame = BlinkIDSDK.captureFrame(imageElement);
          if (!originalFrame) {
            throw new Error("Failed to capture image frame");
          }

          processResult = await recognizerRunnerRef.current.processImage(
            originalFrame
          );
        } else {
          processResult = await recognizerRunnerRef.current.processImage(
            imageFrame
          );
        }

        console.log("[REGISTRATION_BLINKID] First attempt result:", {
          resultCode: processResult,
          stateName:
            processResult === 0
              ? "Empty"
              : processResult === 1
              ? "Uncertain"
              : "Valid",
          imageSize: `${imageElement.width}x${imageElement.height}`,
          fileSize: `${Math.round(file.size / 1024)}KB`,
          usedProcessedImage: !!imageFrame,
        });

        // If first attempt fails, try with relaxed settings
        if (processResult === BlinkIDSDK.RecognizerResultState.Empty) {
          console.log(
            "[REGISTRATION_BLINKID] First attempt failed, trying with relaxed settings..."
          );

          try {
            // Update the existing recognizer with more lenient settings instead of creating a new one
            const currentSettings =
              await recognizerRef.current.currentSettings();

            // Store original settings for restoration
            const originalSettings = {
              allowBlurFilter: currentSettings.allowBlurFilter,
              allowUnparsedMrzResults: currentSettings.allowUnparsedMrzResults,
              allowUnverifiedMrzResults:
                currentSettings.allowUnverifiedMrzResults,
            };

            // Apply more lenient settings for file uploads
            currentSettings.allowBlurFilter = true; // Allow blurred images
            currentSettings.allowUnparsedMrzResults = true; // Allow unparsed MRZ
            currentSettings.allowUnverifiedMrzResults = true; // Allow unverified MRZ

            await recognizerRef.current.updateSettings(currentSettings);

            // Try processing with relaxed settings - try both processed and original images
            const relaxedFrame =
              imageFrame || BlinkIDSDK.captureFrame(imageElement);
            if (relaxedFrame) {
              processResult = await recognizerRunnerRef.current.processImage(
                relaxedFrame
              );

              console.log("[REGISTRATION_BLINKID] Relaxed attempt result:", {
                resultCode: processResult,
                stateName:
                  processResult === 0
                    ? "Empty"
                    : processResult === 1
                    ? "Uncertain"
                    : "Valid",
              });

              if (processResult !== BlinkIDSDK.RecognizerResultState.Empty) {
                result = await recognizerRef.current.getResult();
              }
            }

            // Restore original settings
            try {
              currentSettings.allowBlurFilter =
                originalSettings.allowBlurFilter;
              currentSettings.allowUnparsedMrzResults =
                originalSettings.allowUnparsedMrzResults;
              currentSettings.allowUnverifiedMrzResults =
                originalSettings.allowUnverifiedMrzResults;
              await recognizerRef.current.updateSettings(currentSettings);
            } catch (restoreError) {
              console.warn(
                "[REGISTRATION_BLINKID] Failed to restore original settings:",
                restoreError
              );
              // Continue anyway - the recognizer might still work
            }
          } catch (relaxedError) {
            console.warn(
              "[REGISTRATION_BLINKID] Relaxed processing failed:",
              relaxedError
            );
            // Fall back to original result if relaxed processing fails
            if (processResult !== BlinkIDSDK.RecognizerResultState.Empty) {
              result = await recognizerRef.current.getResult();
            }
          }
        } else {
          result = await recognizerRef.current.getResult();
        }
      } catch (frameError) {
        console.error(
          "[REGISTRATION_BLINKID] Frame processing error:",
          frameError
        );

        // If we get an SDK error, try to reinitialize and process again
        if (
          frameError.message.includes("Failed to invoke object") ||
          frameError.message.includes("SDKError")
        ) {
          console.log(
            "[REGISTRATION_BLINKID] SDK error detected, attempting recovery..."
          );

          try {
            // Try to process with a simple approach - just the original image
            const simpleFrame = BlinkIDSDK.captureFrame(imageElement);
            if (simpleFrame) {
              // Reset recognizer to default settings first
              const defaultSettings =
                await recognizerRef.current.currentSettings();
              defaultSettings.allowBlurFilter = true;
              defaultSettings.allowUnparsedMrzResults = true;
              defaultSettings.allowUnverifiedMrzResults = true;
              await recognizerRef.current.updateSettings(defaultSettings);

              processResult = await recognizerRunnerRef.current.processImage(
                simpleFrame
              );

              console.log("[REGISTRATION_BLINKID] Recovery attempt result:", {
                resultCode: processResult,
                stateName:
                  processResult === 0
                    ? "Empty"
                    : processResult === 1
                    ? "Uncertain"
                    : "Valid",
              });

              if (processResult !== BlinkIDSDK.RecognizerResultState.Empty) {
                result = await recognizerRef.current.getResult();
              }
            }
          } catch (recoveryError) {
            console.error(
              "[REGISTRATION_BLINKID] Recovery attempt failed:",
              recoveryError
            );
            throw new Error(
              "Document processing failed. Please try using the camera instead of uploading an image."
            );
          }
        } else {
          throw new Error(
            "Failed to process image. Please try a clearer, well-lit photo of your document."
          );
        }
      }

      URL.revokeObjectURL(imageUrl);

      console.log("[REGISTRATION_BLINKID] Final processing result:", {
        resultCode: processResult,
        stateName:
          processResult === 0
            ? "Empty"
            : processResult === 1
            ? "Uncertain"
            : "Valid",
        hasResult: !!result,
      });

      if (processResult === BlinkIDSDK.RecognizerResultState.Valid) {
        console.log("[REGISTRATION_BLINKID] Valid result found, processing...");
        await handleRegistrationScanResult(result);
      } else if (processResult === BlinkIDSDK.RecognizerResultState.Uncertain) {
        console.log(
          "[REGISTRATION_BLINKID] Uncertain result found, attempting to process..."
        );
        if (result) {
          // Check if we have enough data to proceed
          const hasBasicData =
            result.firstName ||
            result.lastName ||
            result.fullName ||
            result.documentNumber;
          if (hasBasicData) {
            console.log(
              "[REGISTRATION_BLINKID] Uncertain result has basic data, proceeding..."
            );
            await handleRegistrationScanResult(result);
          } else {
            console.log(
              "[REGISTRATION_BLINKID] Uncertain result lacks basic data"
            );
            setShowImagePreview(true);
            throw new Error(
              "Document partially detected but missing key information. Please ensure your ID document is clearly visible and well-lit."
            );
          }
        } else {
          setShowImagePreview(true);
          throw new Error(
            "Document partially detected but could not extract information. Please try a clearer image."
          );
        }
      } else {
        // Empty result - provide detailed guidance
        console.log(
          "[REGISTRATION_BLINKID] Empty result - no document detected"
        );

        // Get detailed result for debugging
        try {
          const emptyResult = await recognizerRef.current.getResult();
          console.log(
            "[REGISTRATION_BLINKID] Empty result details:",
            emptyResult
          );
        } catch (e) {
          console.log(
            "[REGISTRATION_BLINKID] Could not get empty result details"
          );
        }

        setShowImagePreview(true);
        throw new Error(
          "No government-issued document detected. Please ensure:\n• Your ID document fills most of the frame\n• The document is well-lit with no shadows or glare\n• All text is clearly readable\n• The document is lying flat (not tilted)\n• You're using a government-issued photo ID (passport, driver's license, or national ID)"
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

      if (
        err.message.includes("captureFrame") ||
        err.message.includes("Failed to capture")
      ) {
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
          minHeight: "100vh",
          bgcolor: "#2c3e50",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Header with Back Button */}
        <Box
          sx={{
            position: "absolute",
            top: 20,
            left: 20,
            zIndex: 1000,
          }}
        >
          {onBack && (
            <IconButton
              onClick={onBack}
              sx={{
                color: "white",
                bgcolor: "rgba(255,255,255,0.1)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>

        {/* Main Content - Split 50/50 */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            minHeight: "100vh",
          }}
        >
          {!showCamera ? (
            <>
              {/* Left Side - Document Verification */}
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  p: 4,
                  color: "white",
                }}
              >
                <Box
                  sx={{
                    maxWidth: 500,
                    width: "100%",
                    textAlign: "center",
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      mb: 2,
                      fontWeight: 600,
                      color: "white",
                    }}
                  >
                    Document Verification
                  </Typography>

                  <Typography
                    variant="body1"
                    sx={{
                      mb: 4,
                      opacity: 0.9,
                      lineHeight: 1.6,
                      fontSize: "1.1rem",
                    }}
                  >
                    Please scan your government-issued ID to complete voter
                    registration. We support passports, driver's licenses, and
                    national ID cards.
                  </Typography>

                  {/* Document Requirements Card */}
                  <Paper
                    sx={{
                      p: 3,
                      mb: 4,
                      bgcolor: "rgba(255,255,255,0.95)",
                      borderRadius: 3,
                      textAlign: "left",
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ mb: 2, color: "#2c3e50", fontWeight: 600 }}
                    >
                      📋 Document Requirements
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0, color: "#2c3e50" }}>
                      <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                        Government-issued photo ID (passport, driver's license,
                        national ID)
                      </Typography>
                      <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                        Document must be valid and not expired
                      </Typography>
                      <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                        All text and details must be clearly visible
                      </Typography>
                    </Box>

                    <Typography
                      variant="h6"
                      sx={{ mt: 3, mb: 2, color: "#2c3e50", fontWeight: 600 }}
                    >
                      📸 Photo Tips
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0, color: "#2c3e50" }}>
                      <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                        Good lighting - avoid shadows and glare
                      </Typography>
                      <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                        Hold document flat and steady
                      </Typography>
                      <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                        Fill the frame - document should take up most of the
                        image
                      </Typography>
                      <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                        Use JPG, PNG, or BMP format (max 10MB)
                      </Typography>
                    </Box>
                  </Paper>

                  {/* Action Buttons */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      flexDirection: "column",
                    }}
                  >
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<CameraIcon />}
                      onClick={() => setShowCamera(true)}
                      disabled={!sdkLoaded || isLoading}
                      sx={{
                        py: 2,
                        bgcolor: "#3498db",
                        fontSize: "1.1rem",
                        fontWeight: 600,
                        "&:hover": { bgcolor: "#2980b9" },
                      }}
                    >
                      Use Camera
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      component="label"
                      startIcon={<UploadIcon />}
                      disabled={!sdkLoaded || isLoading}
                      sx={{
                        py: 2,
                        borderColor: "white",
                        color: "white",
                        fontSize: "1.1rem",
                        fontWeight: 600,
                        "&:hover": {
                          borderColor: "white",
                          bgcolor: "rgba(255,255,255,0.1)",
                        },
                      }}
                    >
                      Upload Image
                      <input
                        type="file"
                        hidden
                        accept="image/jpeg,image/jpg,image/png,image/bmp"
                        onChange={handleFileUpload}
                      />
                    </Button>
                  </Box>

                  {/* Loading State */}
                  {isLoading && (
                    <Box
                      sx={{
                        mt: 3,
                        p: 2,
                        bgcolor: "rgba(255,255,255,0.1)",
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 2,
                      }}
                    >
                      <CircularProgress size={24} sx={{ color: "white" }} />
                      <Typography variant="body2" sx={{ color: "white" }}>
                        Setting up document verification for voter registration
                      </Typography>
                    </Box>
                  )}

                  {/* Error State */}
                  {error && (
                    <Alert
                      severity="error"
                      sx={{
                        mt: 3,
                        bgcolor: "rgba(244, 67, 54, 0.1)",
                        color: "white",
                        "& .MuiAlert-icon": { color: "#ff6b6b" },
                      }}
                    >
                      {error}
                    </Alert>
                  )}
                </Box>
              </Box>

              {/* Right Side - TrueID Section */}
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "white",
                  p: 4,
                  position: "relative",
                }}
              >
                {/* TrueID Branding */}
                <Box sx={{ textAlign: "center", mb: 6 }}>
                  <Typography
                    variant="h3"
                    sx={{
                      color: "#2c3e50",
                      fontWeight: 700,
                      mb: 2,
                      letterSpacing: "0.05em",
                    }}
                  >
                    trueID™
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color: "#7f8c8d",
                      fontWeight: 400,
                      mb: 4,
                    }}
                  >
                    Please follow the instructions to upload your ID
                  </Typography>
                </Box>

                {/* ID Scanner Icon */}
                <Box sx={{ textAlign: "center" }}>
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
              </Box>
            </>
          ) : (
            // Camera Scanning Interface (Full Width)
            <Box
              sx={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 4,
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 500,
                  position: "relative",
                  textAlign: "center",
                }}
              >
                {/* trueID™ Branding */}
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="h5"
                    sx={{
                      color: "white",
                      fontWeight: 700,
                      mb: 1,
                    }}
                  >
                    trueID™
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "rgba(255,255,255,0.8)",
                      mb: 2,
                    }}
                  >
                    Place the front of your ID into the camera.
                  </Typography>
                </Box>

                {/* Camera View */}
                <Box
                  sx={{
                    position: "relative",
                    borderRadius: 3,
                    overflow: "hidden",
                    bgcolor: "#1a1a1a",
                    border: "2px solid #3498db",
                    mb: 3,
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                    }}
                  />

                  {/* Scanning Overlay */}
                  {scanningActive && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(0,0,0,0.3)",
                      }}
                    >
                      {/* Scanning Icon */}
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          border: "3px solid white",
                          borderRadius: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mb: 2,
                          animation: "pulse 2s infinite",
                          "@keyframes pulse": {
                            "0%": { opacity: 1 },
                            "50%": { opacity: 0.5 },
                            "100%": { opacity: 1 },
                          },
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ color: "white", fontWeight: 600 }}
                        >
                          📱
                        </Typography>
                      </Box>
                      <Typography
                        variant="body1"
                        sx={{
                          color: "white",
                          fontWeight: 600,
                          textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                        }}
                      >
                        Scanning...
                      </Typography>
                    </Box>
                  )}

                  {/* Camera Error State */}
                  {cameraError && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(0,0,0,0.8)",
                        color: "white",
                        p: 2,
                      }}
                    >
                      <ErrorIcon
                        sx={{ fontSize: 48, mb: 2, color: "#ff6b6b" }}
                      />
                      <Typography variant="body1" sx={{ textAlign: "center" }}>
                        {cameraError}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
                  <Button
                    variant="outlined"
                    onClick={() => setShowCamera(false)}
                    sx={{
                      borderColor: "white",
                      color: "white",
                      "&:hover": {
                        borderColor: "white",
                        bgcolor: "rgba(255,255,255,0.1)",
                      },
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={startCameraScanning}
                    variant="contained"
                    disabled={scanningActive}
                    startIcon={
                      scanningActive ? (
                        <CircularProgress size={20} />
                      ) : (
                        <CameraIcon />
                      )
                    }
                    sx={{
                      bgcolor: "#3498db",
                      "&:hover": { bgcolor: "#2980b9" },
                      px: 4,
                    }}
                  >
                    {scanningActive ? "Scanning..." : "Verify"}
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </Box>

        {/* Image Preview Dialog for Troubleshooting */}
        <Dialog
          open={showImagePreview && imagePreview}
          onClose={() => setShowImagePreview(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: "#2c3e50",
              color: "white",
            },
          }}
        >
          <DialogTitle sx={{ color: "white" }}>
            Document Analysis - Review Required
            <IconButton
              onClick={() => setShowImagePreview(false)}
              sx={{ position: "absolute", right: 8, top: 8, color: "white" }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Alert
              severity="warning"
              sx={{
                mb: 2,
                bgcolor: "rgba(255, 193, 7, 0.1)",
                color: "white",
                "& .MuiAlert-icon": { color: "#ffc107" },
              }}
            >
              The document scanner could not detect a valid government document
              in this image. Please review the image below and try the
              suggestions.
            </Alert>

            {imagePreview && (
              <Box sx={{ textAlign: "center", mb: 3 }}>
                <img
                  src={imagePreview.url}
                  alt="Document preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "400px",
                    border: "2px solid #3498db",
                    borderRadius: "8px",
                  }}
                />
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ mt: 1, color: "white" }}
                >
                  {imagePreview.name} • {Math.round(imagePreview.size / 1024)}KB
                  • {imagePreview.type}
                </Typography>
              </Box>
            )}

            <Paper sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "white" }}>
              <CardContent>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ color: "#3498db", fontWeight: 600 }}
                >
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
            </Paper>
          </DialogContent>
          <DialogActions sx={{ bgcolor: "rgba(0,0,0,0.1)" }}>
            <Button
              onClick={() => setShowImagePreview(false)}
              sx={{ color: "white" }}
            >
              Close
            </Button>
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
              sx={{
                bgcolor: "#3498db",
                "&:hover": { bgcolor: "#2980b9" },
              }}
            >
              Try Another Image
            </Button>
          </DialogActions>
        </Dialog>
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
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#2c3e50",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Header with Back Button */}
      <Box
        sx={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 1000,
        }}
      >
        {onBack && (
          <IconButton
            onClick={onBack}
            sx={{
              color: "white",
              bgcolor: "rgba(255,255,255,0.1)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Main Content - Split 50/50 */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          minHeight: "100vh",
        }}
      >
        {!showCamera ? (
          <>
            {/* Left Side - Document Verification */}
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 4,
                color: "white",
              }}
            >
              <Box
                sx={{
                  maxWidth: 500,
                  width: "100%",
                  textAlign: "center",
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    mb: 2,
                    fontWeight: 600,
                    color: "white",
                  }}
                >
                  Document Verification
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    mb: 4,
                    opacity: 0.9,
                    lineHeight: 1.6,
                    fontSize: "1.1rem",
                  }}
                >
                  Please scan your government-issued ID to complete voter
                  registration. We support passports, driver's licenses, and
                  national ID cards.
                </Typography>

                {/* Document Requirements Card */}
                <Paper
                  sx={{
                    p: 3,
                    mb: 4,
                    bgcolor: "rgba(255,255,255,0.95)",
                    borderRadius: 3,
                    textAlign: "left",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ mb: 2, color: "#2c3e50", fontWeight: 600 }}
                  >
                    📋 Document Requirements
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0, color: "#2c3e50" }}>
                    <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                      Government-issued photo ID (passport, driver's license,
                      national ID)
                    </Typography>
                    <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                      Document must be valid and not expired
                    </Typography>
                    <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                      All text and details must be clearly visible
                    </Typography>
                  </Box>

                  <Typography
                    variant="h6"
                    sx={{ mt: 3, mb: 2, color: "#2c3e50", fontWeight: 600 }}
                  >
                    📸 Photo Tips
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0, color: "#2c3e50" }}>
                    <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                      Good lighting - avoid shadows and glare
                    </Typography>
                    <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                      Hold document flat and steady
                    </Typography>
                    <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                      Fill the frame - document should take up most of the image
                    </Typography>
                    <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                      Use JPG, PNG, or BMP format (max 10MB)
                    </Typography>
                  </Box>
                </Paper>

                {/* Action Buttons */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    flexDirection: "column",
                  }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<CameraIcon />}
                    onClick={() => setShowCamera(true)}
                    disabled={!sdkLoaded || isLoading}
                    sx={{
                      py: 2,
                      bgcolor: "#3498db",
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      "&:hover": { bgcolor: "#2980b9" },
                    }}
                  >
                    Use Camera
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    component="label"
                    startIcon={<UploadIcon />}
                    disabled={!sdkLoaded || isLoading}
                    sx={{
                      py: 2,
                      borderColor: "white",
                      color: "white",
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      "&:hover": {
                        borderColor: "white",
                        bgcolor: "rgba(255,255,255,0.1)",
                      },
                    }}
                  >
                    Upload Image
                    <input
                      type="file"
                      hidden
                      accept="image/jpeg,image/jpg,image/png,image/bmp"
                      onChange={handleFileUpload}
                    />
                  </Button>
                </Box>

                {/* Loading State */}
                {isLoading && (
                  <Box
                    sx={{
                      mt: 3,
                      p: 2,
                      bgcolor: "rgba(255,255,255,0.1)",
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                    }}
                  >
                    <CircularProgress size={24} sx={{ color: "white" }} />
                    <Typography variant="body2" sx={{ color: "white" }}>
                      Setting up document verification for voter registration
                    </Typography>
                  </Box>
                )}

                {/* Error State */}
                {error && (
                  <Alert
                    severity="error"
                    sx={{
                      mt: 3,
                      bgcolor: "rgba(244, 67, 54, 0.1)",
                      color: "white",
                      "& .MuiAlert-icon": { color: "#ff6b6b" },
                    }}
                  >
                    {error}
                  </Alert>
                )}
              </Box>
            </Box>

            {/* Right Side - TrueID Section */}
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "white",
                p: 4,
                position: "relative",
              }}
            >
              {/* TrueID Branding */}
              <Box sx={{ textAlign: "center", mb: 6 }}>
                <Typography
                  variant="h3"
                  sx={{
                    color: "#2c3e50",
                    fontWeight: 700,
                    mb: 2,
                    letterSpacing: "0.05em",
                  }}
                >
                  trueID™
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: "#7f8c8d",
                    fontWeight: 400,
                    mb: 4,
                  }}
                >
                  Please follow the instructions to upload your ID
                </Typography>
              </Box>

              {/* ID Scanner Icon */}
              <Box sx={{ textAlign: "center" }}>
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
            </Box>
          </>
        ) : (
          // Camera Scanning Interface (Full Width)
          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              p: 4,
            }}
          >
            <Box
              sx={{
                width: "100%",
                maxWidth: 500,
                position: "relative",
                textAlign: "center",
              }}
            >
              {/* trueID™ Branding */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="h5"
                  sx={{
                    color: "white",
                    fontWeight: 700,
                    mb: 1,
                  }}
                >
                  trueID™
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(255,255,255,0.8)",
                    mb: 2,
                  }}
                >
                  Place the front of your ID into the camera.
                </Typography>
              </Box>

              {/* Camera View */}
              <Box
                sx={{
                  position: "relative",
                  borderRadius: 3,
                  overflow: "hidden",
                  bgcolor: "#1a1a1a",
                  border: "2px solid #3498db",
                  mb: 3,
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                  }}
                />

                {/* Scanning Overlay */}
                {scanningActive && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "rgba(0,0,0,0.3)",
                    }}
                  >
                    {/* Scanning Icon */}
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        border: "3px solid white",
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 2,
                        animation: "pulse 2s infinite",
                        "@keyframes pulse": {
                          "0%": { opacity: 1 },
                          "50%": { opacity: 0.5 },
                          "100%": { opacity: 1 },
                        },
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ color: "white", fontWeight: 600 }}
                      >
                        📱
                      </Typography>
                    </Box>
                    <Typography
                      variant="body1"
                      sx={{
                        color: "white",
                        fontWeight: 600,
                        textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                      }}
                    >
                      Scanning...
                    </Typography>
                  </Box>
                )}

                {/* Camera Error State */}
                {cameraError && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "rgba(0,0,0,0.8)",
                      color: "white",
                      p: 2,
                    }}
                  >
                    <ErrorIcon sx={{ fontSize: 48, mb: 2, color: "#ff6b6b" }} />
                    <Typography variant="body1" sx={{ textAlign: "center" }}>
                      {cameraError}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Action Buttons */}
              <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowCamera(false)}
                  sx={{
                    borderColor: "white",
                    color: "white",
                    "&:hover": {
                      borderColor: "white",
                      bgcolor: "rgba(255,255,255,0.1)",
                    },
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={startCameraScanning}
                  variant="contained"
                  disabled={scanningActive}
                  startIcon={
                    scanningActive ? (
                      <CircularProgress size={20} />
                    ) : (
                      <CameraIcon />
                    )
                  }
                  sx={{
                    bgcolor: "#3498db",
                    "&:hover": { bgcolor: "#2980b9" },
                    px: 4,
                  }}
                >
                  {scanningActive ? "Scanning..." : "Verify"}
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* Image Preview Dialog for Troubleshooting */}
      <Dialog
        open={showImagePreview && imagePreview}
        onClose={() => setShowImagePreview(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#2c3e50",
            color: "white",
          },
        }}
      >
        <DialogTitle sx={{ color: "white" }}>
          Document Analysis - Review Required
          <IconButton
            onClick={() => setShowImagePreview(false)}
            sx={{ position: "absolute", right: 8, top: 8, color: "white" }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Alert
            severity="warning"
            sx={{
              mb: 2,
              bgcolor: "rgba(255, 193, 7, 0.1)",
              color: "white",
              "& .MuiAlert-icon": { color: "#ffc107" },
            }}
          >
            The document scanner could not detect a valid government document in
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
                  border: "2px solid #3498db",
                  borderRadius: "8px",
                }}
              />
              <Typography
                variant="caption"
                display="block"
                sx={{ mt: 1, color: "white" }}
              >
                {imagePreview.name} • {Math.round(imagePreview.size / 1024)}KB •{" "}
                {imagePreview.type}
              </Typography>
            </Box>
          )}

          <Paper sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "white" }}>
            <CardContent>
              <Typography
                variant="subtitle2"
                gutterBottom
                sx={{ color: "#3498db", fontWeight: 600 }}
              >
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
          </Paper>
        </DialogContent>
        <DialogActions sx={{ bgcolor: "rgba(0,0,0,0.1)" }}>
          <Button
            onClick={() => setShowImagePreview(false)}
            sx={{ color: "white" }}
          >
            Close
          </Button>
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
            sx={{
              bgcolor: "#3498db",
              "&:hover": { bgcolor: "#2980b9" },
            }}
          >
            Try Another Image
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RegistrationBlinkIDStep;
