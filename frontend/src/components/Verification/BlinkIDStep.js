import React, { useState, useEffect, useRef } from "react";
import * as BlinkIDSDK from "@microblink/blinkid-in-browser-sdk";

// Global singleton to prevent multiple SDK instances
let globalSDKInstance = null;
let globalRecognizerRunner = null;
let globalRecognizer = null;
let sdkInitializationPromise = null;

const BlinkIDStep = ({ onComplete, onError, onBack }) => {
  // Helper function to safely extract string values from BlinkID complex objects
  const extractStringValue = (value) => {
    if (!value) return "";

    // If it's already a string, return it
    if (typeof value === "string") return value;

    // If it's an object with different script properties, try to extract a string value
    if (typeof value === "object") {
      console.log(
        "Extracting from object:",
        value,
        "Keys:",
        Object.keys(value)
      );

      // Try common BlinkID properties in order of preference
      const extracted =
        value.latin ||
        value.originalString ||
        value.originalDateString ||
        value.value ||
        value.rawText ||
        value.text ||
        "";

      if (extracted && typeof extracted === "string") {
        console.log("Successfully extracted string:", extracted);
        return extracted;
      }

      // If no string property found, try toString as last resort but avoid [object Object]
      if (value.toString && typeof value.toString === "function") {
        const stringified = value.toString();
        if (stringified !== "[object Object]") {
          console.log("Used toString():", stringified);
          return stringified;
        }
      }

      console.log(
        "Could not extract string from object, returning empty string"
      );
      return "";
    }

    // Convert other types to string
    return String(value || "");
  };

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const videoRef = useRef(null);
  const componentMounted = useRef(true);

  useEffect(() => {
    componentMounted.current = true;
    initializeBlinkID();

    return () => {
      componentMounted.current = false;
      // Don't cleanup global resources here, let them persist for reuse
    };
  }, []);

  const initializeBlinkID = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const licenseKey = process.env.REACT_APP_BLINKID_LICENSE_KEY;

      // Check if license key is provided and valid
      if (!licenseKey || licenseKey === "your_blinkid_license_key_here") {
        throw new Error(
          "Valid BlinkID license key required. Please get a license from https://microblink.com"
        );
      }

      // Check browser support
      if (!BlinkIDSDK.isBrowserSupported()) {
        throw new Error("Browser not supported");
      }

      // Use singleton pattern to prevent multiple instances
      if (!sdkInitializationPromise) {
        sdkInitializationPromise = initializeGlobalSDK(licenseKey);
      }

      await sdkInitializationPromise;

      if (componentMounted.current) {
        setIsLoading(false);
      }
    } catch (err) {
      console.error("BlinkID initialization error:", err);
      if (componentMounted.current) {
        setError("Failed to initialize document scanner. Please try again.");
        setIsLoading(false);
      }
      if (onError) {
        onError(err);
      }
    }
  };

  const initializeGlobalSDK = async (licenseKey) => {
    if (globalSDKInstance && globalRecognizerRunner && globalRecognizer) {
      // Already initialized
      return;
    }

    try {
      // Clean up any existing instances first
      if (globalRecognizerRunner) {
        try {
          globalRecognizerRunner.delete();
        } catch (e) {
          console.log("Error deleting existing recognizer runner:", e);
        }
        globalRecognizerRunner = null;
      }

      if (globalRecognizer) {
        try {
          globalRecognizer.delete();
        } catch (e) {
          console.log("Error deleting existing recognizer:", e);
        }
        globalRecognizer = null;
      }

      if (globalSDKInstance) {
        try {
          globalSDKInstance.delete();
        } catch (e) {
          console.log("Error deleting existing SDK instance:", e);
        }
        globalSDKInstance = null;
      }

      // Initialize BlinkID SDK
      const loadSettings = new BlinkIDSDK.WasmSDKLoadSettings(licenseKey);
      loadSettings.engineLocation = "/resources/"; // Set correct path for WASM files

      globalSDKInstance = await BlinkIDSDK.loadWasmModule(loadSettings);

      // Create recognizer - use the correct function name
      globalRecognizer = await BlinkIDSDK.createBlinkIdSingleSideRecognizer(
        globalSDKInstance
      );

      // Configure recognizer to return images
      const recognizerSettings = await globalRecognizer.currentSettings();
      recognizerSettings.returnFullDocumentImage = true;
      recognizerSettings.returnFaceImage = true;
      recognizerSettings.returnSignatureImage = true;

      // Additional image settings for better capture
      recognizerSettings.fullDocumentImageDpi = 250;
      recognizerSettings.faceImageDpi = 250;
      recognizerSettings.signatureImageDpi = 250;

      await globalRecognizer.updateSettings(recognizerSettings);

      console.log(
        "Recognizer configured to return images with enhanced settings"
      );
      console.log("Image settings:", {
        returnFullDocumentImage: recognizerSettings.returnFullDocumentImage,
        returnFaceImage: recognizerSettings.returnFaceImage,
        returnSignatureImage: recognizerSettings.returnSignatureImage,
        fullDocumentImageDpi: recognizerSettings.fullDocumentImageDpi,
        faceImageDpi: recognizerSettings.faceImageDpi,
        signatureImageDpi: recognizerSettings.signatureImageDpi,
      });

      // Create recognizer runner
      globalRecognizerRunner = await BlinkIDSDK.createRecognizerRunner(
        globalSDKInstance,
        [globalRecognizer],
        false
      );

      console.log("BlinkID SDK initialized successfully");
    } catch (err) {
      // Reset everything on error
      globalSDKInstance = null;
      globalRecognizerRunner = null;
      globalRecognizer = null;
      sdkInitializationPromise = null;
      throw err;
    }
  };

  const startScanning = async () => {
    if (!globalSDKInstance || !globalRecognizerRunner) {
      setError("Scanner not initialized. Please try again.");
      return;
    }

    try {
      setIsScanning(true);
      setError(null);

      // Check for camera permission first
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const permissions = await navigator.permissions.query({
            name: "camera",
          });
          if (permissions.state === "denied") {
            throw new Error(
              "Camera permission denied. Please enable camera access and try again."
            );
          }
        }
      } catch (permError) {
        // Permissions API not supported or failed, continue anyway
        console.log("Permissions API check skipped:", permError.message);
      }

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      // Ensure video element is available
      if (!videoRef.current) {
        throw new Error("Video element not available");
      }

      // Set up video element with stream
      videoRef.current.srcObject = stream;

      // Wait for video metadata to load
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Video failed to load within timeout"));
        }, 10000); // Increased timeout

        const onLoadedMetadata = () => {
          videoRef.current.removeEventListener(
            "loadedmetadata",
            onLoadedMetadata
          );
          clearTimeout(timeoutId);
          resolve();
        };

        videoRef.current.addEventListener("loadedmetadata", onLoadedMetadata);
      });

      // Play the video
      await videoRef.current.play();

      // Wait for video to actually start playing
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Video failed to start playing"));
        }, 5000);

        const checkVideoReady = () => {
          if (
            videoRef.current.readyState >= 2 &&
            videoRef.current.videoWidth > 0
          ) {
            clearTimeout(timeoutId);
            resolve();
          } else {
            setTimeout(checkVideoReady, 100);
          }
        };

        checkVideoReady();
      });

      console.log("Video is ready, creating VideoRecognizer...");

      // Create video recognizer - pass the HTMLVideoElement directly
      const videoRecognizer =
        await BlinkIDSDK.VideoRecognizer.createVideoRecognizerFromCameraStream(
          videoRef.current,
          globalRecognizerRunner
        );

      console.log("VideoRecognizer created, starting recognition...");

      // Start recognition
      const processResult = await videoRecognizer.recognize();

      // Capture current video frame as fallback for document image
      let capturedFrameBase64 = null;
      try {
        if (videoRef.current && videoRef.current.videoWidth > 0) {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0);
          capturedFrameBase64 = canvas
            .toDataURL("image/jpeg", 0.8)
            .split(",")[1];
          console.log(
            "Captured video frame as fallback image, size:",
            capturedFrameBase64.length
          );
        }
      } catch (frameError) {
        console.warn("Failed to capture video frame:", frameError);
      }

      // Stop camera
      stream.getTracks().forEach((track) => track.stop());

      if (processResult !== BlinkIDSDK.RecognizerResultState.Empty) {
        console.log("Scan successful, getting results...");

        // Get results from the recognizer, not the RecognizerRunner
        const results = await globalRecognizer.getResult();
        console.log("Raw BlinkID results:", results);

        if (results) {
          // Pass the captured frame as a fallback
          handleScanSuccess(results, capturedFrameBase64);
        } else {
          throw new Error("No results returned from recognizer");
        }
      } else {
        console.log("Recognition state is Empty");
        throw new Error("Recognition failed - no document detected");
      }
    } catch (err) {
      console.error("Scanning error:", err);

      // Stop any active streams
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }

      let errorMessage = "Failed to start camera. ";
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        errorMessage =
          "Camera permission denied. Please enable camera access and try again.";
      } else if (err.name === "NotFoundError") {
        errorMessage =
          "No camera found. Please connect a camera and try again.";
      } else if (err.name === "NotSupportedError") {
        errorMessage = "Camera not supported on this device.";
      } else {
        errorMessage +=
          err.message || "Please check permissions and try again.";
      }

      setError(errorMessage);
      setIsScanning(false);
      if (onError) {
        onError(err);
      }
    }
  };

  const handleScanSuccess = (result, fallbackImageBase64) => {
    console.log("Scan result:", result);

    // Stop camera
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }

    // Debug the fullName object specifically
    console.log("Debug fullName object:", result.fullName);
    console.log("fullName type:", typeof result.fullName);
    console.log(
      "fullName keys:",
      result.fullName ? Object.keys(result.fullName) : "no keys"
    );

    // Debug image data before processing
    console.log("Raw image data from BlinkID:", {
      fullDocumentImage: result.fullDocumentImage,
      faceImage: result.faceImage,
      signatureImage: result.signatureImage,
    });

    console.log("Image data details:", {
      fullDocumentImageExists: !!result.fullDocumentImage,
      fullDocumentImageHasRawImage: !!result.fullDocumentImage?.rawImage,
      fullDocumentImageHasEncodedImage:
        !!result.fullDocumentImage?.encodedImage,
      fullDocumentImageEncodedLength:
        result.fullDocumentImage?.encodedImage?.length || 0,
      faceImageExists: !!result.faceImage,
      faceImageHasRawImage: !!result.faceImage?.rawImage,
      faceImageHasEncodedImage: !!result.faceImage?.encodedImage,
      faceImageEncodedLength: result.faceImage?.encodedImage?.length || 0,
    });

    // Helper function to convert Uint8Array to base64
    const uint8ArrayToBase64 = (uint8Array) => {
      if (!uint8Array || uint8Array.length === 0) {
        console.log("No image data to convert - array is empty or null");
        return null;
      }

      try {
        console.log("Converting image data, length:", uint8Array.length);
        // Convert Uint8Array to binary string
        let binaryString = "";
        const len = uint8Array.byteLength;
        for (let i = 0; i < len; i++) {
          binaryString += String.fromCharCode(uint8Array[i]);
        }
        // Convert binary string to base64
        const base64 = btoa(binaryString);
        console.log("Successfully converted to base64, length:", base64.length);
        return base64;
      } catch (error) {
        console.warn("Failed to convert image to base64:", error);
        return null;
      }
    };

    // Helper function to safely extract fullName
    const extractFullName = (fullNameObj, firstName, lastName) => {
      // First try to extract from fullName object
      const extractedFullName = extractStringValue(fullNameObj);
      if (extractedFullName && extractedFullName !== "[object Object]") {
        console.log("Successfully extracted fullName:", extractedFullName);
        return extractedFullName;
      }

      // Fallback: construct from firstName and lastName
      const firstNameStr = extractStringValue(firstName) || "";
      const lastNameStr = extractStringValue(lastName) || "";
      const constructedFullName = `${firstNameStr} ${lastNameStr}`.trim();

      console.log("Constructed fullName from parts:", constructedFullName);
      return constructedFullName;
    };

    // Extract document data with images
    const documentData = {
      // Basic extracted text data - ensure all values are strings
      firstName: extractStringValue(result.firstName) || "",
      lastName: extractStringValue(result.lastName) || "",
      givenName: extractStringValue(result.firstName) || "",
      surname: extractStringValue(result.lastName) || "",
      fullName: extractFullName(
        result.fullName,
        result.firstName,
        result.lastName
      ),
      dateOfBirth: extractStringValue(result.dateOfBirth) || "",
      documentNumber: extractStringValue(result.documentNumber) || "",
      expiryDate: extractStringValue(result.dateOfExpiry) || "",
      dateOfExpiry: extractStringValue(result.dateOfExpiry) || "",
      dateOfIssue: extractStringValue(result.dateOfIssue) || "",
      nationality: extractStringValue(result.nationality) || "",
      issuingCountry: result.classInfo?.countryName || "",
      issuingState:
        extractStringValue(result.address)
          ?.split("\n")?.[1]
          ?.split(", ")?.[1]
          ?.split(" ")?.[0] || "",
      documentType:
        extractStringValue(result.documentSubtype) ||
        result.classInfo?.documentType ||
        "unknown",
      sex: extractStringValue(result.sex) || "",
      address: extractStringValue(result.address) || "",
      personalIdNumber: extractStringValue(result.personalIdNumber) || "",

      // Document images - convert from Uint8Array to base64, with fallback
      documentImage:
        uint8ArrayToBase64(result.fullDocumentImage?.encodedImage) ||
        fallbackImageBase64 ||
        null,
      faceImage: uint8ArrayToBase64(result.faceImage?.encodedImage),
      signatureImage: uint8ArrayToBase64(result.signatureImage?.encodedImage),

      // Additional metadata
      isMockData: false, // This is real scanned data
      documentDataMatch: null, // Will be determined later if needed
      usingFallbackImage:
        !uint8ArrayToBase64(result.fullDocumentImage?.encodedImage) &&
        !!fallbackImageBase64,

      // Raw result for debugging
      rawImageData: {
        fullDocumentImageSize:
          result.fullDocumentImage?.encodedImage?.length || 0,
        faceImageSize: result.faceImage?.encodedImage?.length || 0,
        signatureImageSize: result.signatureImage?.encodedImage?.length || 0,
        fallbackImageSize: fallbackImageBase64 ? fallbackImageBase64.length : 0,
      },
    };

    console.log("Processed document data:", documentData);
    console.log("Final image sizes:", documentData.rawImageData);
    console.log("Base64 images created:", {
      documentImage: !!documentData.documentImage,
      faceImage: !!documentData.faceImage,
      signatureImage: !!documentData.signatureImage,
    });

    // Set the processed document data instead of raw result
    setScanResult(documentData);
    setIsScanning(false);

    if (onComplete) {
      onComplete({
        success: true,
        documentData,
        rawResult: result,
        fallbackImageBase64,
      });
    }
  };

  const cleanup = () => {
    // Stop camera if running
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }

    // Don't cleanup global SDK resources here - let them persist for reuse
    // The global instances will be cleaned up when needed during re-initialization
  };

  const handleRetry = () => {
    setScanResult(null);
    setError(null);
    startScanning();
  };

  const resetSDK = () => {
    // Force reset of global SDK for "Try Again" button
    globalSDKInstance = null;
    globalRecognizerRunner = null;
    globalRecognizer = null;
    sdkInitializationPromise = null;
    initializeBlinkID();
  };

  if (isLoading) {
    return (
      <div className="blinkid-container">
        <div className="blinkid-loading">
          <div className="spinner"></div>
          <h3>Initializing Document Scanner...</h3>
          <p>Please wait while we prepare the scanner.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="blinkid-container">
        <div className="blinkid-error">
          <div className="error-icon">⚠️</div>
          <h3>Scanner Error</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={resetSDK}>
              Try Again
            </button>
            {onBack && (
              <button className="btn btn-secondary" onClick={onBack}>
                Go Back
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (scanResult) {
    return (
      <div className="blinkid-container">
        <div className="blinkid-success">
          <div className="success-icon">✅</div>
          <h3>Document Scanned Successfully!</h3>
          <div className="scan-results">
            <h4>Extracted Information:</h4>
            <div className="result-item">
              <strong>Name:</strong> {scanResult.firstName}{" "}
              {scanResult.lastName}
            </div>
            {scanResult.dateOfBirth && (
              <div className="result-item">
                <strong>Date of Birth:</strong> {scanResult.dateOfBirth}
              </div>
            )}
            {scanResult.documentNumber && (
              <div className="result-item">
                <strong>Document Number:</strong> {scanResult.documentNumber}
              </div>
            )}
            {scanResult.nationality && (
              <div className="result-item">
                <strong>Nationality:</strong> {scanResult.nationality}
              </div>
            )}
          </div>
          <div className="success-actions">
            <button
              className="btn btn-primary"
              onClick={() =>
                onComplete &&
                onComplete({
                  success: true,
                  documentData: scanResult,
                })
              }
            >
              Continue
            </button>
            <button className="btn btn-secondary" onClick={handleRetry}>
              Scan Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="blinkid-container">
      <div className="blinkid-scanner">
        <h3>Scan Your ID Document</h3>
        <p>Position your ID document within the frame and hold steady.</p>

        {!isScanning ? (
          <div className="scanner-setup">
            <div className="scanner-instructions">
              <h4>Before you start:</h4>
              <ul>
                <li>Ensure good lighting</li>
                <li>Hold your device steady</li>
                <li>Make sure the document is clearly visible</li>
                <li>Avoid glare and shadows</li>
              </ul>
            </div>
            <button
              className="btn btn-primary btn-large"
              onClick={startScanning}
            >
              Start Scanning
            </button>
            {onBack && (
              <button className="btn btn-secondary" onClick={onBack}>
                Go Back
              </button>
            )}
          </div>
        ) : (
          <div className="scanner-active">
            <div className="video-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="scanner-video"
              />
              <div className="scanner-overlay">
                <div className="scanner-frame"></div>
                <p className="scanner-hint">
                  Position your ID within the frame
                </p>
              </div>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setIsScanning(false);
                cleanup();
              }}
            >
              Cancel Scanning
            </button>
          </div>
        )}
      </div>

      <style jsx={true}>{`
        .blinkid-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
        }

        .blinkid-loading,
        .blinkid-error,
        .blinkid-success {
          text-align: center;
          padding: 40px 20px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .error-icon,
        .success-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }

        .error-actions,
        .success-actions {
          margin-top: 30px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          margin: 0 10px;
          transition: background-color 0.2s;
        }

        .btn-primary {
          background-color: #007bff;
          color: white;
        }

        .btn-primary:hover {
          background-color: #0056b3;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #545b62;
        }

        .btn-large {
          padding: 16px 32px;
          font-size: 18px;
        }

        .scanner-instructions {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          text-align: left;
        }

        .scanner-instructions ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .scanner-instructions li {
          margin: 8px 0;
        }

        .video-container {
          position: relative;
          width: 100%;
          max-width: 400px;
          margin: 0 auto 20px;
        }

        .scanner-video {
          width: 100%;
          height: auto;
          border-radius: 8px;
        }

        .scanner-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .scanner-frame {
          width: 80%;
          height: 60%;
          border: 2px solid #007bff;
          border-radius: 8px;
          background: transparent;
        }

        .scanner-hint {
          color: white;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
          margin-top: 20px;
          font-weight: bold;
        }

        .scan-results {
          text-align: left;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }

        .result-item {
          margin: 10px 0;
          padding: 8px 0;
          border-bottom: 1px solid #dee2e6;
        }

        .result-item:last-child {
          border-bottom: none;
        }

        @media (max-width: 768px) {
          .blinkid-container {
            padding: 10px;
          }

          .btn {
            display: block;
            width: 100%;
            margin: 10px 0;
          }
        }
      `}</style>
    </div>
  );
};

export default BlinkIDStep;
