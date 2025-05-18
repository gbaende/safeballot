import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { paymentService } from "../services/api";

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Parse the query parameters to get the payment_intent
    const params = new URLSearchParams(location.search);
    const paymentIntentId = params.get("payment_intent");
    const redirectStatus = params.get("redirect_status");

    const verifyPayment = async () => {
      if (!paymentIntentId) {
        setError("No payment information found");
        setIsLoading(false);
        return;
      }

      if (redirectStatus !== "succeeded") {
        setError("Payment was not completed successfully");
        setIsLoading(false);
        return;
      }

      try {
        const response = await paymentService.confirmPayment(paymentIntentId);
        if (response.status === "success") {
          setPayment(response.paymentIntent);
        } else {
          setError("Failed to verify payment");
        }
      } catch (err) {
        console.error("Error verifying payment:", err);
        setError("An error occurred while verifying your payment");
      } finally {
        setIsLoading(false);
      }
    };

    verifyPayment();
  }, [location.search]);

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          p: 3,
        }}
      >
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Verifying your payment...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        p: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: 2,
          maxWidth: 600,
          width: "100%",
          textAlign: "center",
          mt: 4,
        }}
      >
        {error ? (
          <>
            <Typography variant="h5" color="error" gutterBottom>
              Payment Verification Failed
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {error}
            </Typography>
          </>
        ) : (
          <>
            <CheckCircleOutlineIcon
              sx={{ fontSize: 64, color: "success.main", mb: 2 }}
            />
            <Typography variant="h5" gutterBottom>
              Payment Successful!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Thank you for your payment. Your transaction has been completed
              successfully.
            </Typography>
            {payment && (
              <Box
                sx={{
                  my: 3,
                  textAlign: "left",
                  bgcolor: "grey.50",
                  p: 2,
                  borderRadius: 1,
                }}
              >
                <Typography variant="subtitle2">Payment Details:</Typography>
                <Typography variant="body2">
                  Amount: ${(payment.amount / 100).toFixed(2)}{" "}
                  {payment.currency.toUpperCase()}
                </Typography>
                <Typography variant="body2">
                  Transaction ID: {payment.id}
                </Typography>
                <Typography variant="body2">
                  Status: {payment.status}
                </Typography>
              </Box>
            )}
          </>
        )}

        <Button
          variant="contained"
          onClick={handleBackToDashboard}
          sx={{
            mt: 2,
            background: "linear-gradient(90deg, #4478EB 0%, #6FA0FF 100%)",
            color: "white",
            textTransform: "none",
            borderRadius: "4px",
            py: 1,
            px: 3,
          }}
        >
          Back to Dashboard
        </Button>
      </Paper>
    </Box>
  );
};

export default PaymentSuccess;
