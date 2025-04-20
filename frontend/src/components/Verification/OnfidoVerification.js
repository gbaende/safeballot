import React, { useState, useEffect } from "react";
import { Box, Typography, CircularProgress, Alert } from "@mui/material";
import { onfidoService } from "../../services/api";

const OnfidoVerification = ({ userId, onComplete, onError }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sdkToken, setSdkToken] = useState(null);

  useEffect(() => {
    // Load Onfido script
    const script = document.createElement("script");
    script.src =
      "https://assets.onfido.com/web-sdk-releases/latest/onfido.min.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      // Clean up any Onfido instances
      if (window.onfido) {
        window.onfido.tearDown();
      }
    };
  }, []);

  useEffect(() => {
    const initOnfido = async () => {
      try {
        setLoading(true);
        // Get token from backend
        const tokenData = await onfidoService.getOnfidoToken(userId);
        setSdkToken(tokenData.token);

        if (!window.Onfido) {
          throw new Error("Onfido SDK not loaded");
        }

        const onfido = window.Onfido.init({
          token: tokenData.token,
          containerId: "onfido-mount",
          useModal: false,
          steps: [
            {
              type: "welcome",
              options: {
                title: "Identity Verification",
                description:
                  "Verify your identity to proceed with voter registration",
              },
            },
            {
              type: "document",
              options: {
                documentTypes: {
                  driving_licence: {
                    country: "USA",
                  },
                  national_identity_card: {
                    country: "USA",
                  },
                  passport: {
                    country: "USA",
                  },
                  residence_permit: {
                    country: "USA",
                  },
                },
              },
            },
            {
              type: "face",
              options: {
                requestedVariant: "standard",
              },
            },
          ],
          onComplete: async (data) => {
            try {
              // Submit verification to backend
              const verificationResult = await onfidoService.submitVerification(
                {
                  userId,
                  documentId: data.document.id,
                  faceId: data.face ? data.face.id : null,
                }
              );

              // Extract document data if successful
              if (verificationResult.success) {
                const extractedData = await onfidoService.extractDocumentData(
                  data.document.id
                );
                onComplete(extractedData);
              } else {
                setError("Verification failed. Please try again.");
              }
            } catch (error) {
              setError(error.message || "Error processing verification");
              onError && onError(error);
            }
          },
          onError: (error) => {
            setError(error.message || "Error during verification process");
            onError && onError(error);
          },
        });

        onfido.start();
        setLoading(false);
      } catch (error) {
        setLoading(false);
        setError(error.message || "Failed to initialize identity verification");
        onError && onError(error);
      }
    };

    if (userId) {
      initOnfido();
    }

    return () => {
      if (window.onfido) {
        window.onfido.tearDown();
      }
    };
  }, [userId, onComplete, onError]);

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" flexDirection="column" alignItems="center" p={3}>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Loading identity verification...
          </Typography>
        </Box>
      ) : (
        <>
          <Typography variant="h6" gutterBottom>
            Identity Verification
          </Typography>
          <Typography variant="body2" paragraph>
            Please follow the instructions to verify your identity using a valid
            government ID.
          </Typography>
          <Box id="onfido-mount" sx={{ minHeight: 600 }} />
        </>
      )}
    </Box>
  );
};

export default OnfidoVerification;
