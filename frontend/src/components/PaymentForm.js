import React, { useState, useEffect } from "react";
import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import { paymentService } from "../services/api";

const PaymentForm = ({
  amount,
  currency,
  description,
  metadata,
  onSuccess,
  onError,
  themeColor = "#3182CE",
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    // Create a payment intent when the component mounts
    const createIntent = async () => {
      try {
        setIsLoading(true);
        const response = await paymentService.createPaymentIntent({
          amount, // amount in cents
          currency: currency || "usd",
          description,
          metadata,
        });

        setClientSecret(response.clientSecret);
      } catch (error) {
        console.error("Error creating payment intent:", error);
        setIsError(true);
        setMessage(
          error.response?.data?.message || "Failed to initialize payment"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (amount) {
      createIntent();
    }
  }, [amount, currency, description, metadata]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      // Stripe.js has not yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    setIsLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          // Return URL where the customer should be redirected after payment
          return_url: window.location.origin + "/payment-success",
        },
        redirect: "if_required",
      });

      if (error) {
        // Show error to customer
        setIsError(true);
        setMessage(error.message || "Payment failed");
        if (onError) onError(error);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Payment succeeded
        setMessage("Payment successful!");
        if (onSuccess) onSuccess(paymentIntent);
      } else {
        // Payment requires additional action
        setMessage(
          "Payment requires additional verification. Please follow any prompts."
        );
      }
    } catch (err) {
      setIsError(true);
      setMessage("An unexpected error occurred.");
      console.error("Payment error:", err);
      if (onError) onError(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!clientSecret && isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress sx={{ color: themeColor }} />
      </Box>
    );
  }

  // Stripe Element appearance customization
  const appearance = {
    theme: "stripe",
    variables: {
      colorPrimary: themeColor,
      colorBackground: "#FFFFFF",
      colorText: "#4A5568",
      colorDanger: "#EF4444",
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      spacingUnit: "4px",
      borderRadius: "4px",
    },
    rules: {
      ".Input": {
        border: "1px solid #E2E8F0",
        boxShadow: "none",
        padding: "12px",
      },
      ".Input:focus": {
        border: `1px solid ${themeColor}`,
        boxShadow: `0 0 0 1px ${themeColor}`,
      },
      ".Label": {
        fontWeight: "500",
        marginBottom: "8px",
      },
      ".Tab": {
        border: "1px solid #E2E8F0",
        boxShadow: "none",
      },
      ".Tab:hover": {
        border: `1px solid ${themeColor}`,
        color: themeColor,
      },
      ".Tab--selected": {
        border: `2px solid ${themeColor}`,
        color: themeColor,
        fontWeight: "500",
      },
      ".CheckboxInput": {
        border: "1px solid #E2E8F0",
        borderRadius: "2px",
      },
      ".CheckboxInput--checked": {
        backgroundColor: themeColor,
        borderColor: themeColor,
      },
    },
  };

  const paymentElementOptions = {
    layout: {
      type: "tabs",
      defaultCollapsed: false,
    },
    // Enable multiple payment methods
    paymentMethodOrder: [
      "card",
      "link",
      "apple_pay",
      "google_pay",
      "us_bank_account",
    ],
  };

  return (
    <Box>
      {message && (
        <Alert severity={isError ? "error" : "success"} sx={{ mb: 3 }}>
          {message}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Box sx={{ mb: 4 }}>
          {clientSecret ? (
            <PaymentElement options={paymentElementOptions} />
          ) : (
            <Typography color="text.secondary">
              Initializing payment form...
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading || !stripe || !elements || !clientSecret}
            sx={{
              mt: 2,
              background: "linear-gradient(90deg, #4478EB 0%, #6FA0FF 100%)",
              color: "white",
              textTransform: "none",
              borderRadius: "4px",
              py: 1.2,
              px: 3,
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              `Pay ${amount / 100} ${currency?.toUpperCase() || "USD"}`
            )}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default PaymentForm;
