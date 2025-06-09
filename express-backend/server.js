const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config();

// Import database connection
const { connectDB } = require("./database/connection");
const setupDatabase = require("./setup-db");
// Import MongoDB connection
const { connectDb } = require("./db/db");
// Import email transporter
const { getTransporter } = require("./utils/email");

// Import routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const ballotRoutes = require("./routes/ballot.routes");
const electionRoutes = require("./routes/election.routes");
const adminRoutes = require("./routes/admin.routes");
const paymentRoutes = require("./routes/payment.routes");

// Initialize express app
const app = express();
const PORT = process.env.PORT || 8000;

// Middlewares
app.use(helmet()); // Security headers
app.use(morgan("dev")); // Logging
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    optionsSuccessStatus: 200,
  })
); // CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// Special handling for webhook routes which need the raw body
// IMPORTANT: This must be before the route registration
app.use("/api/payment/webhook", (req, res, next) => {
  if (req.originalUrl === "/api/payment/webhook") {
    // Use raw body for Stripe webhook
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    next();
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/ballots", ballotRoutes);
app.use("/api/elections", electionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);

// Serve static files from the React app in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/build")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(`Error: ${err.message}`);
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    status: "error",
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Start the server
const startServer = async () => {
  try {
    // Focus on connecting to the database first
    await connectDB();

    // Also connect to MongoDB for OTP storage
    try {
      console.log("Attempting to connect to MongoDB for OTP functionality...");
      await connectDb();
      console.log("✅ MongoDB connected successfully for OTP functionality");
    } catch (mongoErr) {
      console.error(
        "❌ MongoDB connection failed, OTP features may not work:",
        mongoErr.message
      );
      // Show more detailed error info
      if (mongoErr.name === "MongoServerSelectionError") {
        console.error("MongoDB connection details:", {
          error: mongoErr.name,
          reason: mongoErr.reason?.toString(),
          message: mongoErr.message,
        });
      }
    }

    // Initialize email transporter
    try {
      console.log("Initializing email transporter...");
      await getTransporter();
    } catch (emailErr) {
      console.error(
        "❌ Email transporter initialization failed:",
        emailErr.message
      );
      console.log("📧 Email features may not work properly");
    }

    // Don't run setup every time
    //await setupDatabase();

    // Start the server
    app.listen(PORT, () => {
      console.log(`SafeBallot API server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to primary database:", err);

    // Try MongoDB connection anyway
    try {
      console.log(
        "Attempting fallback MongoDB connection for OTP functionality..."
      );
      await connectDb();
      console.log(
        "✅ MongoDB connected successfully, but primary database connection failed"
      );
    } catch (mongoErr) {
      console.error("❌ MongoDB connection also failed:", mongoErr.message);
      // Show more detailed error info
      if (mongoErr.name === "MongoServerSelectionError") {
        console.error("MongoDB connection details:", {
          error: mongoErr.name,
          reason: mongoErr.reason?.toString(),
          message: mongoErr.message,
        });
      }
    }

    // Start server anyway, even if database connection fails
    console.log("Starting server without full database connections...");
    app.listen(PORT, () => {
      console.log(
        `SafeBallot API server running at http://localhost:${PORT} (without full database connections)`
      );
    });
  }
};

startServer();

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("Gracefully shutting down");
  process.exit(0);
});

module.exports = app;
