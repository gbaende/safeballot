const express = require("express");
const { body, validationResult } = require("express-validator");
const { protect } = require("../middleware/auth.middleware");
const Stripe = require("stripe");

const router = express.Router();

// Initialize Stripe with API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

/**
 * Create a payment intent
 * @route POST /api/payment/create-intent
 * @access Private
 */
router.post(
  "/create-intent",
  [
    protect,
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("currency")
      .isString()
      .isLength({ min: 3, max: 3 })
      .withMessage("Currency must be a 3-letter code"),
    body("description").optional().isString(),
    body("metadata").optional().isObject(),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: "error",
          errors: errors.array(),
        });
      }

      const { amount, currency, description, metadata } = req.body;

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount, // Amount in cents
        currency,
        description,
        metadata: {
          userId: req.user.id,
          ...metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.status(200).json({
        status: "success",
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to create payment intent",
        error: error.message,
      });
    }
  }
);

/**
 * Confirm a payment
 * @route POST /api/payment/confirm
 * @access Private
 */
router.post(
  "/confirm",
  [
    protect,
    body("paymentIntentId")
      .isString()
      .withMessage("Payment intent ID is required"),
  ],
  async (req, res) => {
    try {
      const { paymentIntentId } = req.body;

      // Retrieve the payment intent to confirm its status
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      res.status(200).json({
        status: "success",
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
      });
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to confirm payment",
        error: error.message,
      });
    }
  }
);

/**
 * Handle Stripe webhook events
 * @route POST /api/payment/webhook
 * @access Public - but secured by webhook signature
 */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      // Verify the event came from Stripe
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        console.log(`PaymentIntent ${paymentIntent.id} was successful!`);
        // Update your database here
        break;
      case "payment_intent.payment_failed":
        const failedPayment = event.data.object;
        console.log(
          `Payment failed: ${failedPayment.id}, ${failedPayment.last_payment_error?.message}`
        );
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.send();
  }
);

/**
 * Get payment methods for a customer
 * @route GET /api/payment/methods
 * @access Private
 */
router.get("/methods", protect, async (req, res) => {
  try {
    // Get the user's Stripe customer ID or create one
    let customerId = req.user.stripeCustomerId;

    if (!customerId) {
      // Create a new customer in Stripe
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.name,
        metadata: {
          userId: req.user.id,
        },
      });

      customerId = customer.id;

      // Update user with new Stripe customer ID
      // (implementation depends on your database model)
      // await User.update({ stripeCustomerId: customerId }, { where: { id: req.user.id } });
    }

    // Get saved payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    res.status(200).json({
      status: "success",
      data: paymentMethods.data,
    });
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve payment methods",
      error: error.message,
    });
  }
});

/**
 * Create a customer and setup intent for future payments
 * @route POST /api/payment/setup-intent
 * @access Private
 */
router.post("/setup-intent", protect, async (req, res) => {
  try {
    // Get or create customer
    let customerId = req.user.stripeCustomerId;

    if (!customerId) {
      // Create a new customer
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.name,
        metadata: {
          userId: req.user.id,
        },
      });

      customerId = customer.id;

      // Update user with Stripe customer ID
      // await User.update({ stripeCustomerId: customerId }, { where: { id: req.user.id } });
    }

    // Create a SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    });

    res.status(200).json({
      status: "success",
      clientSecret: setupIntent.client_secret,
    });
  } catch (error) {
    console.error("Error creating setup intent:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create setup intent",
      error: error.message,
    });
  }
});

module.exports = router;
