import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Paper, Button } from "@mui/material";
import CancelIcon from "@mui/icons-material/Cancel";

const CheckoutCancel = () => {
  const navigate = useNavigate();

  const handleBackToBallotBuilder = () => {
    // Navigate back to the ballot builder
    navigate("/ballot-builder");
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "80vh",
      }}
    >
      <Paper
        elevation={2}
        sx={{
          p: 5,
          maxWidth: 600,
          width: "100%",
          textAlign: "center",
        }}
      >
        <CancelIcon sx={{ fontSize: 64, color: "error.main", mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Payment Cancelled
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Your payment has been cancelled. No charges have been made to your
          account.
        </Typography>

        <Button
          variant="contained"
          onClick={handleBackToBallotBuilder}
          sx={{
            mt: 3,
            background: "linear-gradient(90deg, #4478EB 0%, #6FA0FF 100%)",
            color: "white",
            textTransform: "none",
            borderRadius: "4px",
            py: 1,
            px: 3,
          }}
        >
          Back to Ballot Builder
        </Button>
      </Paper>
    </Box>
  );
};

export default CheckoutCancel;
