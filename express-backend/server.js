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

// Import routes
const authRoutes = require("./routes/auth.routes");
const ballotRoutes = require("./routes/ballot.routes");
const electionRoutes = require("./routes/election.routes");
const userRoutes = require("./routes/user.routes");

// Initialize express app
const app = express();
const PORT = process.env.PORT || 8080;

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

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/ballots", ballotRoutes);
app.use("/api/elections", electionRoutes);
app.use("/api/users", userRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "API is running",
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

    // Don't run setup every time
    //await setupDatabase();

    // Start the server
    app.listen(PORT, () => {
      console.log(`SafeBallot API server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to database:", err);

    // Start server anyway, even if database connection fails
    console.log("Starting server without database connection...");
    app.listen(PORT, () => {
      console.log(
        `SafeBallot API server running at http://localhost:${PORT} (without database connection)`
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
