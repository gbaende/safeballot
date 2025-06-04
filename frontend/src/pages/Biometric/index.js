import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
  Grid,
  LinearProgress,
} from "@mui/material";
import { CameraAlt, CheckCircle } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { verify } from "../../store/slices/authSlice";
import LogoComponent from "../../components/Common/LogoComponent";
import { toast } from "react-hot-toast";

function Biometric() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanComplete, setScanComplete] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [imageCapture, setImageCapture] = useState(null);
  const [stage, setStage] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    // Initialize camera
    const startCamera = async () => {
      try {
        setCameraActive(true);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError("Camera access denied. Please enable camera permissions.");
        console.error("Camera error:", err);
      }
    };

    startCamera();

    return () => {
      // Cleanup camera
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  // Capture image from camera
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Match canvas dimensions to video
    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;

    // Add willReadFrequently hint for optimized readback performance
    let context;
    try {
      context = canvas.getContext("2d", { willReadFrequently: true });
    } catch (e) {
      // Fallback for browsers that don't support the willReadFrequently option
      context = canvas.getContext("2d");
    }

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, width, height);

    // Convert to blob for upload
    canvas.toBlob(
      (blob) => {
        setImageCapture(blob);
        setStage(1);
        // Start mock verification progress
        startVerificationProgress();
      },
      "image/jpeg",
      0.8
    );
  }, []);

  // Simulate verification progress
  const startVerificationProgress = () => {
    setStage(2);
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        const newProgress = prev + Math.random() * 10;
        if (newProgress >= 100) {
          clearInterval(interval);
          setScanComplete(true);
          setStage(3);
          return 100;
        }
        return newProgress;
      });
    }, 200);
  };

  // Submit verification to backend
  const submitVerification = async () => {
    setLoading(true);

    try {
      // In a real implementation, you would send this to your backend
      if (!imageCapture || !scanComplete) {
        throw new Error("Image capture not complete");
      }

      const formData = new FormData();
      formData.append("userId", "user123"); // Would come from auth context
      formData.append("imageCapture", imageCapture);

      // Mock API call
      console.log("Would submit:", {
        userId: formData.get("userId"),
        imageCapture: formData.get("imageCapture"),
      });

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // On success
      toast.success("Identity verification successful!");
      onComplete && onComplete();
    } catch (err) {
      console.error("Verification error:", err);
      setError(err.message || "Verification failed. Please try again.");
      toast.error("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Reset the verification process
  const handleRetry = () => {
    setStage(0);
    setScanProgress(0);
    setScanComplete(false);
    setImageCapture(null);
    setError("");
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #2B3A4E 0%, #1B2838 100%)",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 500,
          display: "flex",
          flexDirection: "column",
          borderRadius: 2,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Box sx={{ mb: 3, textAlign: "center" }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <LogoComponent width={80} height={80} />
          </Box>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 700, color: "#333" }}
          >
            Biometric Verification
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Please look directly at the camera for identity verification
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Camera view or face scan result */}
        <Box
          sx={{
            width: "100%",
            height: 300,
            bgcolor: "grey.100",
            borderRadius: 2,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            position: "relative",
            mb: 3,
          }}
        >
          {cameraActive && !imageCapture ? (
            <>
              <Box
                sx={{
                  position: "absolute",
                  border: "2px solid #4caf50",
                  borderRadius: "50%",
                  width: 220,
                  height: 220,
                  opacity: 0.7,
                }}
              />
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <IconButton
                sx={{
                  position: "absolute",
                  bottom: 16,
                  bgcolor: "background.paper",
                  "&:hover": { bgcolor: "background.paper" },
                }}
                onClick={captureImage}
              >
                <CameraAlt fontSize="large" />
              </IconButton>
            </>
          ) : imageCapture ? (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
              }}
            >
              <Box
                component="img"
                src={URL.createObjectURL(imageCapture)}
                sx={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  opacity: scanComplete ? 1 : 0.7,
                }}
                alt="Face Scan"
              />

              {!scanComplete && (
                <Box sx={{ position: "absolute", width: "80%", mt: 10 }}>
                  <Typography variant="body2" align="center" sx={{ mb: 1 }}>
                    Analyzing face... {Math.round(scanProgress)}%
                  </Typography>
                  <LinearProgress variant="determinate" value={scanProgress} />
                </Box>
              )}

              {scanComplete && (
                <Box
                  sx={{
                    position: "absolute",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(76, 175, 80, 0.9)",
                    borderRadius: "50%",
                    width: 60,
                    height: 60,
                  }}
                >
                  <CheckCircle fontSize="large" sx={{ color: "white" }} />
                </Box>
              )}
            </Box>
          ) : (
            <Typography color="text.secondary">
              Camera initializing...
            </Typography>
          )}
        </Box>

        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Action buttons */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {imageCapture ? (
            <Grid item xs={12}>
              <Button
                variant="outlined"
                fullWidth
                onClick={handleRetry}
                disabled={loading}
              >
                Retry Scan
              </Button>
            </Grid>
          ) : null}
        </Grid>

        <Button
          variant="contained"
          fullWidth
          size="large"
          disabled={!scanComplete || loading}
          onClick={submitVerification}
          sx={{
            py: 1.5,
            borderRadius: 1.5,
            textTransform: "none",
            fontSize: "1rem",
            fontWeight: 600,
            backgroundColor: "#2B3A4E",
            "&:hover": {
              backgroundColor: "#1B2838",
            },
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Complete Verification"
          )}
        </Button>
      </Paper>
    </Box>
  );
}

export default Biometric;
