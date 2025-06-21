import React, { useState } from "react";
import {
  Box,
  Button,
  Typography,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Paper,
  InputAdornment,
} from "@mui/material";
import {
  CreditCard as CreditCardIcon,
  Lock as LockIcon,
} from "@mui/icons-material";

const MockPaymentForm = ({
  amount,
  currency = "USD",
  onSuccess,
  onError,
  onBack,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
    zipCode: "",
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (field) => (event) => {
    let value = event.target.value;

    // Format card number with spaces
    if (field === "cardNumber") {
      value = value
        .replace(/\s/g, "")
        .replace(/(.{4})/g, "$1 ")
        .trim();
      if (value.length > 19) return; // Max 16 digits + 3 spaces
    }

    // Format expiry date
    if (field === "expiryDate") {
      value = value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2");
      if (value.length > 5) return;
    }

    // Format CVV
    if (field === "cvv") {
      value = value.replace(/\D/g, "");
      if (value.length > 4) return;
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    const { cardNumber, expiryDate, cvv, cardholderName } = formData;

    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 13) {
      return "Please enter a valid card number";
    }
    if (!expiryDate || expiryDate.length < 5) {
      return "Please enter a valid expiry date";
    }
    if (!cvv || cvv.length < 3) {
      return "Please enter a valid CVV";
    }
    if (!cardholderName.trim()) {
      return "Please enter the cardholder name";
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setProcessing(true);

    try {
      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock successful payment
      const mockPaymentIntent = {
        id: `pi_mock_${Date.now()}`,
        status: "succeeded",
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        payment_method: {
          id: `pm_mock_${Date.now()}`,
          card: {
            last4: formData.cardNumber.slice(-4),
            brand: "visa", // Mock brand
          },
        },
      };

      onSuccess(mockPaymentIntent);
    } catch (err) {
      setError("Payment processing failed. Please try again.");
      if (onError) onError(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box>
      <Typography
        variant="h6"
        sx={{ mb: 3, display: "flex", alignItems: "center" }}
      >
        <CreditCardIcon sx={{ mr: 1 }} />
        Payment Information
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Demo Mode:</strong> This is a mock payment form. Enter any
          valid-looking card details to proceed.
        </Typography>
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Card Number"
                value={formData.cardNumber}
                onChange={handleInputChange("cardNumber")}
                placeholder="1234 5678 9012 3456"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CreditCardIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Expiry Date"
                value={formData.expiryDate}
                onChange={handleInputChange("expiryDate")}
                placeholder="MM/YY"
                variant="outlined"
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="CVV"
                value={formData.cvv}
                onChange={handleInputChange("cvv")}
                placeholder="123"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <LockIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cardholder Name"
                value={formData.cardholderName}
                onChange={handleInputChange("cardholderName")}
                placeholder="John Doe"
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="ZIP Code"
                value={formData.zipCode}
                onChange={handleInputChange("zipCode")}
                placeholder="12345"
                variant="outlined"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, display: "flex", justifyContent: "space-between" }}>
            <Button
              onClick={onBack}
              sx={{
                color: "#4A5568",
                borderColor: "#E2E8F0",
                textTransform: "none",
                borderRadius: "4px",
              }}
              variant="outlined"
              disabled={processing || isSubmitting}
            >
              Back
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={processing || isSubmitting}
              sx={{
                background: "linear-gradient(90deg, #4478EB 0%, #6FA0FF 100%)",
                color: "white",
                textTransform: "none",
                borderRadius: "4px",
                minWidth: "200px",
              }}
            >
              {processing || isSubmitting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                `Pay $${amount.toFixed(2)} ${currency}`
              )}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default MockPaymentForm;
