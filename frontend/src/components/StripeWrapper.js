import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

// Load the Stripe.js library once when the component is first rendered
// This is outside the component to avoid recreating the stripePromise on every render
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

/**
 * StripeWrapper provides the Stripe context to its children
 * Wrap any component that needs to use Stripe Elements with this component
 * @param {Object} props Component props
 * @param {React.ReactNode} props.children Child components
 * @param {Object} props.options Stripe Elements options
 * @param {Object} props.appearance Stripe Elements appearance customization
 */
const StripeWrapper = ({
  children,
  options = {},
  appearance = {
    theme: "stripe",
    variables: {
      colorPrimary: "#3182CE",
      colorBackground: "#FFFFFF",
      colorText: "#4A5568",
    },
  },
}) => {
  // Merge the appearance settings with the options
  const elementsOptions = {
    ...options,
    appearance,
  };

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      {children}
    </Elements>
  );
};

export default StripeWrapper;
