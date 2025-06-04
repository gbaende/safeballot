import React, { useState, useRef, useEffect } from "react";
import blinkidService from "../services/blinkidService";

const BlinkIDStep = ({ onComplete, onError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [captureMode, setCaptureMode] = useState("camera"); // 'camera' or 'upload'
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    initializeBlinkID();
    return () => {
      blinkidService.cleanup();
    };
  }, []);

  const initializeBlinkID = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // You'll need to provide your BlinkID license key here
      const licenseKey =
        process.env.REACT_APP_BLINKID_LICENSE_KEY || "YOUR_LICENSE_KEY_HERE";

      await blinkidService.initialize(licenseKey);
      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to initialize BlinkID:", error);
      setError("Failed to initialize document scanner. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const startCameraCapture = async () => {
    if (!isInitialized) {
      setError("Scanner not initialized");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: "environment",
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Start BlinkID recognition
        const result = await blinkidService.startVideoRecognition(
          videoRef.current
        );

        // Stop camera stream
        stream.getTracks().forEach((track) => track.stop());

        if (onComplete) {
          onComplete(result);
        }
      }
    } catch (error) {
      console.error("Camera capture failed:", error);
      setError(
        "Camera access failed. Please ensure camera permissions are granted."
      );
      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!isInitialized) {
      setError("Scanner not initialized");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create image element from file
      const imageElement = document.createElement("img");
      imageElement.src = URL.createObjectURL(file);

      await new Promise((resolve) => {
        imageElement.onload = resolve;
      });

      // Process the image
      const result = await blinkidService.processImage(imageElement);

      // Clean up
      URL.revokeObjectURL(imageElement.src);

      if (onComplete) {
        onComplete(result);
      }
    } catch (error) {
      console.error("File processing failed:", error);
      setError(
        "Failed to process document image. Please try a different image."
      );
      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!blinkidService.isBrowserSupported()) {
    return (
      <div className="blinkid-step">
        <div className="error-message">
          <h3>Browser Not Supported</h3>
          <p>
            Your browser does not support the document scanner. Please use a
            modern browser like Chrome, Firefox, or Safari.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="blinkid-step">
      <div className="blinkid-container">
        <h2>Document Verification</h2>
        <p>
          Please scan your identity document to continue with voter
          registration.
        </p>

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {!isInitialized && isLoading && (
          <div className="loading-message">
            <p>Initializing document scanner...</p>
          </div>
        )}

        {isInitialized && (
          <div className="capture-options">
            <div className="mode-selector">
              <button
                className={captureMode === "camera" ? "active" : ""}
                onClick={() => setCaptureMode("camera")}
                disabled={isLoading}
              >
                Use Camera
              </button>
              <button
                className={captureMode === "upload" ? "active" : ""}
                onClick={() => setCaptureMode("upload")}
                disabled={isLoading}
              >
                Upload Image
              </button>
            </div>

            {captureMode === "camera" && (
              <div className="camera-capture">
                <video
                  ref={videoRef}
                  style={{ width: "100%", maxWidth: "400px", height: "auto" }}
                  playsInline
                  muted
                />
                <button
                  onClick={startCameraCapture}
                  disabled={isLoading}
                  className="capture-button"
                >
                  {isLoading ? "Scanning..." : "Start Camera Scan"}
                </button>
              </div>
            )}

            {captureMode === "upload" && (
              <div className="file-upload">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  style={{ display: "none" }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="upload-button"
                >
                  {isLoading ? "Processing..." : "Choose Image File"}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="instructions">
          <h4>Instructions:</h4>
          <ul>
            <li>Ensure your document is well-lit and clearly visible</li>
            <li>Hold the document steady and avoid glare</li>
            <li>Make sure all text is readable</li>
            <li>
              Supported documents: Driver's License, Passport, National ID
            </li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .blinkid-step {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }

        .blinkid-container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .error-message {
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 4px;
          padding: 15px;
          margin: 15px 0;
          color: #c33;
        }

        .loading-message {
          text-align: center;
          padding: 20px;
          color: #666;
        }

        .mode-selector {
          display: flex;
          gap: 10px;
          margin: 20px 0;
        }

        .mode-selector button {
          flex: 1;
          padding: 10px 20px;
          border: 2px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mode-selector button.active {
          border-color: #007bff;
          background: #007bff;
          color: white;
        }

        .mode-selector button:hover:not(:disabled) {
          border-color: #007bff;
        }

        .camera-capture,
        .file-upload {
          text-align: center;
          margin: 20px 0;
        }

        .capture-button,
        .upload-button {
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 10px;
          transition: background 0.2s;
        }

        .capture-button:hover:not(:disabled),
        .upload-button:hover:not(:disabled) {
          background: #0056b3;
        }

        .capture-button:disabled,
        .upload-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .instructions {
          margin-top: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .instructions h4 {
          margin-top: 0;
          color: #333;
        }

        .instructions ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .instructions li {
          margin: 5px 0;
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default BlinkIDStep;
