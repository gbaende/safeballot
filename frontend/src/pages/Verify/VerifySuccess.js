import React from "react";
import { Box, Typography, Paper, Button } from "@mui/material";
import { CheckCircle } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import LogoComponent from "../../components/Common/LogoComponent";

function VerifySuccess() {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate("/dashboard");
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #2B3A4E 0%, #1B2838 100%)",
        p: 3,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 500,
          textAlign: "center",
          borderRadius: 2,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Box sx={{ mb: 3, textAlign: "center" }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <LogoComponent width={80} height={80} />
          </Box>
        </Box>

        <Box sx={{ color: "success.main", fontSize: 72, mb: 2 }}>
          <CheckCircle fontSize="inherit" />
        </Box>

        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 700, color: "#333" }}
        >
          Verification Successful!
        </Typography>

        <Typography variant="body1" sx={{ mb: 4, color: "text.secondary" }}>
          Your identity has been successfully verified. You can now access the
          full features of SafeBallot.
        </Typography>

        <Button
          variant="contained"
          size="large"
          onClick={handleContinue}
          sx={{
            py: 1.5,
            px: 4,
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
          Continue to Dashboard
        </Button>
      </Paper>
    </Box>
  );
}

export default VerifySuccess;
