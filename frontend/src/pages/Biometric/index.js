import React, { useState, useRef, useEffect } from "react";
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

function Biometric() {
  const [faceImage, setFaceImage] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Initialize camera on component mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Initialize camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      setError("Unable to access camera. Please check camera permissions.");
      console.error("Camera access error:", err);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  // Capture face image from camera
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          setFaceImage(blob);

          // Start progress animation
          setScanProgress(0);
          setLoading(true);

          intervalRef.current = setInterval(() => {
            setScanProgress((prevProgress) => {
              if (prevProgress >= 100) {
                clearInterval(intervalRef.current);
                setLoading(false);
                setScanComplete(true);
                return 100;
              }
              return prevProgress + 10;
            });
          }, 300);
        },
        "image/jpeg",
        0.8
      );
    }
  };

  // Submit biometric verification
  const handleSubmit = async () => {
    if (!faceImage || !scanComplete) {
      setError("Please complete the biometric scan");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create form data with image
      const formData = new FormData();
      formData.append("faceImage", faceImage);

      // Dispatch action to verify biometric
      await dispatch(
        verify({
          type: "biometric",
          faceImage: formData.get("faceImage"),
        })
      ).unwrap();

      // Navigate to verification success
      navigate("/verify/success");
    } catch (err) {
      setError(
        err.message || "Biometric verification failed. Please try again."
      );
      // Reset scan progress
      setScanComplete(false);
      setScanProgress(0);
    } finally {
      setLoading(false);
    }
  };

  // Retry verification
  const handleRetry = () => {
    setFaceImage(null);
    setScanComplete(false);
    setScanProgress(0);
    setError("");
    startCamera();
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
            Please look directly at the camera for facial recognition
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
          {cameraActive && !faceImage ? (
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
          ) : faceImage ? (
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
                src={URL.createObjectURL(faceImage)}
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
          {faceImage ? (
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
          onClick={handleSubmit}
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
