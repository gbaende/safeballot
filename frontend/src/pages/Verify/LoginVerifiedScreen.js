import React, { useState, useEffect } from "react";
import { Box, Typography, Paper, Button, Snackbar, Alert } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useParams, useNavigate } from "react-router-dom";
import { authService } from "../../services/api";

const LoginVerifiedScreen = ({ ballotInfo, voterInfo, onComplete }) => {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const [digitalKey, setDigitalKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Generate digital key when component mounts
  useEffect(() => {
    const generateDigitalKey = async () => {
      try {
        // First, try to load existing digital key from registration
        const existingKey = localStorage.getItem(`digital_key_${id}`);

        if (existingKey) {
          console.log("Reusing existing digital key from registration");
          setDigitalKey(existingKey);
          setLoading(false);
          return;
        }

        console.log(
          "No existing digital key found, generating new one for login flow"
        );

        // Get voter email for API call
        const voterEmail =
          voterInfo?.email ||
          localStorage.getItem("voterEmail") ||
          localStorage.getItem("email");

        // For login flow, try to get email from voterUser if not available
        if (!voterEmail) {
          const voterUser = localStorage.getItem("voterUser");
          if (voterUser) {
            try {
              const userData = JSON.parse(voterUser);
              if (userData.email) {
                console.log("Using email from voterUser for login flow");
                const response = await authService.generateDigitalKey(
                  userData.email,
                  id
                );

                if (response?.data?.digital_key) {
                  const serverKey = response.data.digital_key;
                  setDigitalKey(serverKey);
                  localStorage.setItem(`digital_key_${id}`, serverKey);
                  localStorage.setItem(`verified_${id}`, "true");

                  // Store voter info
                  localStorage.setItem(`verified_name_${id}`, userData.name);
                  localStorage.setItem(`verified_email_${id}`, userData.email);
                  localStorage.setItem(
                    `voter_info_${id}`,
                    JSON.stringify({
                      name: userData.name,
                      email: userData.email,
                    })
                  );

                  console.log(
                    "Server-generated digital key stored successfully for login flow"
                  );
                  setLoading(false);
                  return;
                }
              }
            } catch (e) {
              console.warn("Error parsing voter user data:", e);
            }
          }
        }

        if (voterEmail) {
          console.log("Generating server-side digital key for login flow");

          // Call server-side digital key generation
          const response = await authService.generateDigitalKey(voterEmail, id);

          if (response?.data?.digital_key) {
            const serverKey = response.data.digital_key;
            setDigitalKey(serverKey);

            // Store the digital key and verification status
            localStorage.setItem(`digital_key_${id}`, serverKey);
            localStorage.setItem(`verified_${id}`, "true");

            // Store voter info if available
            if (voterInfo?.name && voterInfo?.email) {
              localStorage.setItem(`verified_name_${id}`, voterInfo.name);
              localStorage.setItem(`verified_email_${id}`, voterInfo.email);
              localStorage.setItem(
                `voter_info_${id}`,
                JSON.stringify({
                  name: voterInfo.name,
                  email: voterInfo.email,
                })
              );
            }

            console.log("Server-generated digital key stored successfully");
            setLoading(false);
            return;
          } else {
            throw new Error("Invalid response format from server");
          }
        }

        // Fallback to client-side generation if no email available
        console.warn(
          "No voter email available, using fallback client-side generation"
        );
        const fallbackKey = `SAFE-BALLOT-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}`;

        setDigitalKey(fallbackKey);
        localStorage.setItem(`digital_key_${id}`, fallbackKey);
        localStorage.setItem(`verified_${id}`, "true");
      } catch (error) {
        console.error("Error generating server-side digital key:", error);
        setError("Failed to generate digital key from server, using fallback");

        // Fallback to client-side generation
        const fallbackKey = `SAFE-BALLOT-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}`;

        setDigitalKey(fallbackKey);
        localStorage.setItem(`digital_key_${id}`, fallbackKey);
        localStorage.setItem(`verified_${id}`, "true");
      } finally {
        setLoading(false);
      }
    };

    generateDigitalKey();
  }, [id, voterInfo]);

  // Copy digital key to clipboard and navigate immediately
  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(digitalKey);
      setCopied(true);

      // Show success message briefly then navigate
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          navigate(`/vote/${id}/${slug}`);
        }
      }, 1000); // Short delay to show the success message
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // If clipboard fails, still navigate
      if (onComplete) {
        onComplete();
      } else {
        navigate(`/vote/${id}/${slug}`);
      }
    }
  };

  if (loading) {
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
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: "480px",
            minHeight: "500px",
            borderRadius: 3,
            p: 4,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#ffffff",
          }}
        >
          <Typography variant="h6" color="text.secondary">
            Generating your digital key...
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(to right, #1e293b, #3b5998)",
        padding: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: "480px",
          minHeight: "500px",
          borderRadius: 3,
          p: 4,
          textAlign: "center",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#ffffff",
        }}
      >
        {/* Back button */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            color: "#6b7280",
            minWidth: "auto",
            p: 1,
          }}
        />

        {/* Green checkmark */}
        <Box
          sx={{
            width: 80,
            height: 80,
            backgroundColor: "#10b981",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 4,
          }}
        >
          <CheckIcon
            sx={{
              color: "white",
              fontSize: 40,
            }}
          />
        </Box>

        {/* Verified title */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            mb: 2,
            color: "#1f2937",
          }}
        >
          Verified
        </Typography>

        {/* Description text */}
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            mb: 6,
            lineHeight: 1.5,
            maxWidth: "320px",
          }}
        >
          Below is your digital key you will need in order to submit your
          ballot.
        </Typography>

        {/* Copy Digital Key button - now handles both copy and navigation */}
        <Button
          variant="contained"
          startIcon={<ContentCopyIcon />}
          onClick={handleCopyKey}
          sx={{
            px: 4,
            py: 1.5,
            backgroundColor: "#4b5563",
            color: "white",
            borderRadius: 2,
            textTransform: "none",
            fontSize: "1rem",
            fontWeight: 500,
            "&:hover": {
              backgroundColor: "#374151",
            },
          }}
        >
          Copy Digital Key
        </Button>

        {/* Success message when copied */}
        <Snackbar
          open={copied}
          autoHideDuration={1000}
          onClose={() => setCopied(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity="success" variant="filled">
            Digital key copied to clipboard
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
};

export default LoginVerifiedScreen;
