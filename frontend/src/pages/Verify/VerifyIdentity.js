import React, { useState } from "react";
import { Box, Typography, Button, IconButton, Paper } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const VerifyIdentity = ({ onComplete, onBack }) => {
  const [scanning, setScanning] = useState(false);

  const handleStartScan = () => {
    setScanning(true);

    // Immediately proceed to ID scanning
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(to right, #1e293b, #3b5998)",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: "550px",
          borderRadius: 2,
          p: 0,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Back button */}
        <IconButton
          sx={{ position: "absolute", top: 16, left: 16 }}
          onClick={onBack}
        >
          <ArrowBackIcon />
        </IconButton>

        <Box
          sx={{
            p: 6,
            textAlign: "center",
            minHeight: "600px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            Verify your identity
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 5 }}>
            To ensure fair and safe voting practices, we must verify your
            identification before you can vote.
          </Typography>

          {/* Identity verification illustration */}
          <div
            className="mb-8 flex justify-center"
            style={{ marginBottom: "3rem" }}
          >
            <svg
              width="131"
              height="156"
              viewBox="0 0 131 156"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3"
                y="86"
                width="127"
                height="4"
                fill="#848484"
                fillOpacity="0.17"
              />
              <rect
                x="3"
                y="86"
                width="127"
                height="68"
                fill="url(#paint0_linear_0_1)"
                fillOpacity="0.17"
              />
              <path
                d="M51.9593 35.1071L58.8785 58.0571M51.9593 35.1071L37.0286 43.1214M51.9593 35.1071H80M58.8785 58.0571L51.9593 64.9786M58.8785 58.0571L37.0286 43.1214M58.8785 58.0571H73.0809M51.9593 64.9786H41.7627M51.9593 64.9786L65.7976 77.7286M41.7627 64.9786L37.0286 43.1214M41.7627 64.9786L35.2078 77.7286M37.0286 43.1214C34.8436 48.4491 32.6586 45.6714 34.1153 66.0714M37.0286 43.1214C42.8552 28.9143 53.416 28.1857 65.7976 26M35.2078 77.7286L53.416 85.7429M35.2078 77.7286L34.1153 66.0714M35.2078 77.7286L37.939 95.9429M53.416 85.7429L65.7976 77.7286M53.416 85.7429L39.5778 106.871M53.416 85.7429L51.9593 109.786M53.416 85.7429L59.971 93.0286M65.7976 77.7286L59.971 93.0286M39.5778 106.871L51.9593 109.786M39.5778 106.871L51.9593 121.443M39.5778 106.871L37.939 95.9429M51.9593 109.786V121.443M51.9593 109.786L59.971 93.0286M51.9593 109.786L65.7976 118.164L51.9593 121.443M51.9593 121.443L58.8785 128H65.7976M59.971 93.0286L65.7976 97.7643M34.1153 66.0714C28.2127 67.0485 29.0677 69.7105 29.017 76.6357C29.8415 85.7236 32.5539 89.5089 37.939 95.9429"
                stroke="#0003BB"
                strokeOpacity="0.43"
              />
              <ellipse cx="53.5" cy="86" rx="1.5" ry="1" fill="#C91414" />
              <circle cx="66" cy="78" r="1" fill="#C91414" />
              <ellipse cx="66" cy="97.5" rx="1" ry="1.5" fill="#C91414" />
              <circle cx="37.5" cy="43.5" r="1.5" fill="#C91414" />
              <ellipse cx="42" cy="65.5" rx="1" ry="1.5" fill="#C91414" />
              <circle cx="52.5" cy="65.5" r="1.5" fill="#C91414" />
              <ellipse cx="35.5" cy="78" rx="1.5" ry="1" fill="#C91414" />
              <circle cx="66" cy="118" r="1" fill="#C91414" />
              <circle cx="52.5" cy="121.5" r="1.5" fill="#C91414" />
              <ellipse cx="52.5" cy="110" rx="1.5" ry="1" fill="#C91414" />
              <circle cx="39.5" cy="107.5" r="1.5" fill="#C91414" />
              <circle cx="60.5" cy="93.5" r="1.5" fill="#C91414" />
              <path
                d="M79.0407 35.1071L72.1215 58.0571M79.0407 35.1071L93.9714 43.1214M79.0407 35.1071H51M72.1215 58.0571L79.0407 64.9786M72.1215 58.0571L93.9714 43.1214M72.1215 58.0571H57.9191M79.0407 64.9786H89.2373M79.0407 64.9786L65.2024 77.7286M89.2373 64.9786L93.9714 43.1214M89.2373 64.9786L95.7922 77.7286M93.9714 43.1214C96.1564 48.4491 98.3414 45.6714 96.8847 66.0714M93.9714 43.1214C88.1448 28.9143 77.584 28.1857 65.2024 26M95.7922 77.7286L77.584 85.7429M95.7922 77.7286L96.8847 66.0714M95.7922 77.7286L93.061 95.9429M77.584 85.7429L65.2024 77.7286M77.584 85.7429L91.4222 106.871M77.584 85.7429L79.0407 109.786M77.584 85.7429L71.029 93.0286M65.2024 77.7286L71.029 93.0286M91.4222 106.871L79.0407 109.786M91.4222 106.871L79.0407 121.443M91.4222 106.871L93.061 95.9429M79.0407 109.786V121.443M79.0407 109.786L71.029 93.0286M79.0407 109.786L65.2024 118.164L79.0407 121.443M79.0407 121.443L72.1215 128H65.2024M71.029 93.0286L65.2024 97.7643M96.8847 66.0714C102.787 67.0485 101.932 69.7105 101.983 76.6357C101.159 85.7236 98.4461 89.5089 93.061 95.9429"
                stroke="#0003BB"
                strokeOpacity="0.43"
              />
              <circle
                cx="1"
                cy="1"
                r="1"
                transform="matrix(-1 0 0 1 79 85)"
                fill="#C91414"
              />
              <circle
                cx="1"
                cy="1"
                r="1"
                transform="matrix(-1 0 0 1 67 77)"
                fill="#C91414"
              />
              <ellipse
                cx="1"
                cy="1.5"
                rx="1"
                ry="1.5"
                transform="matrix(-1 0 0 1 67 96)"
                fill="#C91414"
              />
              <circle
                cx="1.5"
                cy="1.5"
                r="1.5"
                transform="matrix(-1 0 0 1 81 34)"
                fill="#C91414"
              />
              <circle
                cx="1.5"
                cy="1.5"
                r="1.5"
                transform="matrix(-1 0 0 1 74 57)"
                fill="#C91414"
              />
              <ellipse
                cx="1"
                cy="1.5"
                rx="1"
                ry="1.5"
                transform="matrix(-1 0 0 1 95 42)"
                fill="#C91414"
              />
              <circle
                cx="1.5"
                cy="1.5"
                r="1.5"
                transform="matrix(-1 0 0 1 91 64)"
                fill="#C91414"
              />
              <circle
                cx="1.5"
                cy="1.5"
                r="1.5"
                transform="matrix(-1 0 0 1 81 64)"
                fill="#C91414"
              />
              <ellipse
                cx="1.5"
                cy="1"
                rx="1.5"
                ry="1"
                transform="matrix(-1 0 0 1 98 77)"
                fill="#C91414"
              />
              <circle
                cx="1"
                cy="1"
                r="1"
                transform="matrix(-1 0 0 1 67 117)"
                fill="#C91414"
              />
              <circle
                cx="1.5"
                cy="1.5"
                r="1.5"
                transform="matrix(-1 0 0 1 81 120)"
                fill="#C91414"
              />
              <ellipse
                cx="1.5"
                cy="1"
                rx="1.5"
                ry="1"
                transform="matrix(-1 0 0 1 81 109)"
                fill="#C91414"
              />
              <circle
                cx="1.5"
                cy="1.5"
                r="1.5"
                transform="matrix(-1 0 0 1 93 106)"
                fill="#C91414"
              />
              <circle
                cx="1.5"
                cy="1.5"
                r="1.5"
                transform="matrix(-1 0 0 1 73 92)"
                fill="#C91414"
              />
              <circle cx="52.5" cy="35.5" r="1.5" fill="#C91414" />
              <circle cx="58.5" cy="58.5" r="1.5" fill="#C91414" />
              <path
                d="M2 24V12C2 6.47715 6.47715 2 12 2L23 2"
                stroke="black"
                strokeOpacity="0.15"
                strokeWidth="3"
              />
              <path
                d="M129 24V12C129 6.47715 124.523 2 119 2L109 2"
                stroke="black"
                strokeOpacity="0.15"
                strokeWidth="3"
              />
              <path
                d="M2 132V144C2 149.523 6.47715 154 12 154H23"
                stroke="black"
                strokeOpacity="0.15"
                strokeWidth="3"
              />
              <path
                d="M129 132V144C129 149.523 124.523 154 119 154H109"
                stroke="black"
                strokeOpacity="0.15"
                strokeWidth="3"
              />
              <defs>
                <linearGradient
                  id="paint0_linear_0_1"
                  x1="66.5"
                  y1="86"
                  x2="66.5"
                  y2="154"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#848484" />
                  <stop offset="1" stopColor="#1E1E1E" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <Button
            variant="contained"
            onClick={handleStartScan}
            disabled={scanning}
            sx={{
              py: 1.5,
              width: "85%",
              background: "linear-gradient(to right, #080E1D, #263C75)",
              "&:hover": {
                background: "linear-gradient(to right, #0a1022, #2e4585)",
              },
              "&.Mui-disabled": {
                background: "linear-gradient(to right, #475569, #64748b)",
                color: "white",
              },
            }}
          >
            {scanning ? "Processing..." : "Next"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default VerifyIdentity;
