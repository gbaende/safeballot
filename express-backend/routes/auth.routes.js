const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
const { User } = require("../models/user.model");
const { protect } = require("../middleware/auth.middleware");
const axios = require("axios");
const crypto = require("crypto");
const authController = require("../controllers/authController");

// Try-catch for Onfido import to prevent startup failures
let Onfido;
let onfidoApi;
try {
  Onfido = require("@onfido/api");
} catch (err) {
  console.warn(
    "Onfido API package not found. Will use mock implementation instead."
  );
}

const router = express.Router();

// Initialize Onfido client (will use mock functionality if API key not available)
try {
  if (Onfido) {
    onfidoApi = new Onfido({
      apiToken: process.env.ONFIDO_API_KEY || "api_sandbox_token", // Use sandbox token if no API key set
      region: "us", // or 'eu' based on where your account is registered
    });
    console.log("Onfido API initialized successfully");
  } else {
    // Create a mock Onfido API with the same methods
    onfidoApi = {
      applicants: {
        create: async (data) => ({ id: "mock-applicant-id", ...data }),
        find: async (id) => ({ id, created_at: new Date().toISOString() }),
      },
      checks: {
        create: async (data) => ({
          id: "mock-check-id",
          status: "in_progress",
          ...data,
        }),
        find: async (id) => ({ id, status: "complete", result: "clear" }),
      },
      sdkToken: {
        generate: async (data) => ({ token: "mock-sdk-token", ...data }),
      },
      documents: {
        upload: async (data) => ({
          id: "mock-document-id",
          type: data.type || "passport",
        }),
      },
    };
    console.log("Using mock Onfido API implementation");
  }
} catch (err) {
  console.error("Failed to initialize Onfido API:", err.message);
  // Create the mock Onfido API
  onfidoApi = {
    applicants: {
      create: async (data) => ({ id: "mock-applicant-id", ...data }),
      find: async (id) => ({ id, created_at: new Date().toISOString() }),
    },
    checks: {
      create: async (data) => ({
        id: "mock-check-id",
        status: "in_progress",
        ...data,
      }),
      find: async (id) => ({ id, status: "complete", result: "clear" }),
    },
    sdkToken: {
      generate: async (data) => ({ token: "mock-sdk-token", ...data }),
    },
    documents: {
      upload: async (data) => ({
        id: "mock-document-id",
        type: data.type || "passport",
      }),
    },
  };
  console.log("Using mock Onfido API due to initialization failure");
}

/**
 * Helper function to generate token
 */
const generateToken = (id, role = "admin") => {
  return jwt.sign(
    {
      id,
      role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );
};

/**
 * Helper function to generate refresh token
 */
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });
};

/**
 * Register a new user
 * @route POST /api/auth/register
 * @body {string} name - User's name
 * @body {string} email - User's email
 * @body {string} password - User's password
 * @access Public
 */
router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Please include a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
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

      const { name, email, password } = req.body;

      console.log("Registration attempt with:", {
        name,
        email,
        role: req.body.role || "user",
        password: "***",
      });

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });

      if (existingUser) {
        return res.status(400).json({
          status: "error",
          message: "User already exists",
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Determine user role - default to 'user' unless explicitly specified
      // CRITICAL FIX: For voter registration, make sure role is 'voter' not 'user'
      // This is particularly important for the ballot access flow
      const isVoterRegistration =
        req.originalUrl.includes("register-with-key") ||
        req.body.isVoter === true;

      const role = isVoterRegistration ? "voter" : req.body.role || "user";

      console.log(`Setting role for new registration: ${role}`);

      // Create user
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
        isVerified: false, // User needs to verify email
      });

      console.log(
        `User created successfully: ${user.id} with role: ${user.role}`
      );

      // Generate JWT token
      const payload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "30d",
      });

      // Generate refresh token
      const refreshToken = crypto.randomBytes(40).toString("hex");

      // Save refresh token to user
      user.refreshToken = refreshToken;
      await user.save();
      console.log("Refresh token saved to user");

      // Store voter token for debugging
      if (user.role === "voter") {
        console.log(`Stored voter token: ${token.substring(0, 15)}...`);
      }

      res.status(201).json({
        status: "success",
        message: "User registered successfully",
        data: {
          token,
          refreshToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        status: "error",
        message: "Server error",
      });
    }
  }
);

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
router.post(
  "/login",
  [
    // Validation middleware
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
    body("role")
      .optional()
      .isIn(["admin", "user"])
      .withMessage("Role must be either 'admin' or 'user'"),
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

      const { email, password, role } = req.body;

      // Find user
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({
          status: "error",
          message: "Invalid email or password",
        });
      }

      // Check password
      const isPasswordValid = await user.checkPassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          status: "error",
          message: "Invalid email or password",
        });
      }

      // If a specific role was requested in the login, verify the user has that role
      if (role && user.role !== role) {
        console.log(
          `Role mismatch: User ${user.email} has role ${user.role} but tried to login as ${role}`
        );
        return res.status(403).json({
          status: "error",
          message: `This account does not have ${role} privileges`,
        });
      }

      // Generate tokens
      const token = generateToken(user.id, user.role);
      const refreshToken = generateRefreshToken(user.id);

      // Update user with refresh token
      user.refreshToken = refreshToken;
      await user.save();

      // Return response with tokens and user data
      res.status(200).json({
        status: "success",
        message: "Login successful",
        data: {
          user: user.toJSON(),
          token,
          refreshToken,
        },
      });
    } catch (error) {
      console.error("Error logging in user:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to login",
      });
    }
  }
);

/**
 * Refresh token
 * @route POST /api/auth/refresh-token
 * @access Public
 */
router.post("/refresh-token", async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        status: "error",
        message: "Refresh token is required",
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refresh_token, process.env.JWT_SECRET);

    // Find user with the id and refresh token
    const user = await User.findOne({
      where: {
        id: decoded.id,
        refreshToken: refresh_token,
      },
    });

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid refresh token",
      });
    }

    // Generate new tokens
    const token = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Update user with new refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Return response with new tokens
    res.status(200).json({
      status: "success",
      message: "Token refreshed successfully",
      data: {
        token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("Error refreshing token:", error);

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired refresh token",
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to refresh token",
    });
  }
});

/**
 * Logout user
 * @route POST /api/auth/logout
 * @access Private
 */
router.post("/logout", protect, async (req, res) => {
  try {
    // Clear refresh token
    req.user.refreshToken = null;
    await req.user.save();

    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Error logging out user:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to logout",
    });
  }
});

/**
 * Verify email
 * @route POST /api/auth/verify-email
 * @access Public
 */
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        status: "error",
        message: "Verification token is required",
      });
    }

    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Update user verification status
    user.isVerified = true;
    await user.save();

    res.status(200).json({
      status: "success",
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Error verifying email:", error);

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired verification token",
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to verify email",
    });
  }
});

/**
 * Request password reset
 * @route POST /api/auth/reset-password/request
 * @access Public
 */
router.post(
  "/reset-password/request",
  [body("email").isEmail().withMessage("Please provide a valid email")],
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

      const { email } = req.body;

      // Find user
      const user = await User.findOne({ where: { email } });
      if (!user) {
        // Return success even if user doesn't exist for security reasons
        return res.status(200).json({
          status: "success",
          message:
            "If your email is registered, you will receive a password reset link",
        });
      }

      // Generate reset token
      const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      // In a real application, you would send an email with the reset link
      // For now, just return the token for testing
      res.status(200).json({
        status: "success",
        message:
          "If your email is registered, you will receive a password reset link",
        data: {
          resetToken,
        },
      });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to request password reset",
      });
    }
  }
);

/**
 * Confirm password reset
 * @route POST /api/auth/reset-password/confirm
 * @access Public
 */
router.post(
  "/reset-password/confirm",
  [
    body("token").notEmpty().withMessage("Reset token is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
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

      const { token, password } = req.body;

      // Verify and decode token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user
      const user = await User.findByPk(decoded.id);
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      // Update password
      user.password = password;
      await user.save();

      res.status(200).json({
        status: "success",
        message: "Password reset successfully",
      });
    } catch (error) {
      console.error("Error confirming password reset:", error);

      if (
        error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError"
      ) {
        return res.status(401).json({
          status: "error",
          message: "Invalid or expired reset token",
        });
      }

      res.status(500).json({
        status: "error",
        message: "Failed to reset password",
      });
    }
  }
);

/**
 * Get Onfido token for verification
 * @route POST /api/auth/onfido/token
 * @access Public
 */
router.post("/onfido/token", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        status: "error",
        message: "User ID is required",
      });
    }

    let tokenData;

    // Use Onfido SDK if available, otherwise use mock
    if (onfidoApi) {
      try {
        // Find user in database
        const user = await User.findByPk(userId);
        if (!user) {
          return res.status(404).json({
            status: "error",
            message: "User not found",
          });
        }

        // Create Onfido applicant if doesn't exist
        let applicantId = user.onfidoApplicantId;

        if (!applicantId) {
          const applicant = await onfidoApi.applicant.create({
            firstName: user.name.split(" ")[0] || "Unknown",
            lastName: user.name.split(" ").slice(1).join(" ") || "User",
            email: user.email,
          });

          applicantId = applicant.id;

          // Save applicant ID to user
          user.onfidoApplicantId = applicantId;
          await user.save();
        }

        // Create SDK token
        const sdkToken = await onfidoApi.sdkToken.generate({
          applicantId: applicantId,
          referrer: process.env.FRONTEND_URL || "http://localhost:3000",
        });

        tokenData = {
          token: sdkToken.token,
          expiry: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        };
      } catch (onfidoError) {
        console.error("Onfido API error:", onfidoError);
        // Fall back to mock token if Onfido API fails
        tokenData = {
          token: `onfido-token-${userId}-${Date.now()}`,
          expiry: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        };
      }
    } else {
      // Create mock token
      tokenData = {
        token: `onfido-token-${userId}-${Date.now()}`,
        expiry: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      };
    }

    res.status(200).json({
      status: "success",
      data: tokenData,
    });
  } catch (error) {
    console.error("Error getting Onfido token:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get Onfido token",
    });
  }
});

/**
 * Submit verification to Onfido
 * @route POST /api/auth/onfido/submit
 * @access Public
 */
router.post("/onfido/submit", async (req, res) => {
  try {
    const { userId, documentId, faceId } = req.body;

    if (!userId || !documentId) {
      return res.status(400).json({
        status: "error",
        message: "User ID and document ID are required",
      });
    }

    let verificationResult;

    // Use Onfido SDK if available, otherwise use mock
    if (onfidoApi) {
      try {
        // Find user in database
        const user = await User.findByPk(userId);
        if (!user) {
          return res.status(404).json({
            status: "error",
            message: "User not found",
          });
        }

        // Get applicant ID
        const applicantId = user.onfidoApplicantId;
        if (!applicantId) {
          return res.status(400).json({
            status: "error",
            message: "User does not have an Onfido applicant ID",
          });
        }

        // Create check
        const check = await onfidoApi.check.create({
          applicantId: applicantId,
          reportNames: ["document", "facial_similarity"],
          documentIds: [documentId],
          faceIds: faceId ? [faceId] : undefined,
        });

        verificationResult = {
          success: true,
          verification_id: check.id,
          status: check.status,
        };

        // Save check ID to user
        user.onfidoCheckId = check.id;
        await user.save();
      } catch (onfidoError) {
        console.error("Onfido API error:", onfidoError);
        // Fall back to mock response if Onfido API fails
        verificationResult = {
          success: true,
          verification_id: `verification-${userId}-${Date.now()}`,
          status: "in_progress",
        };
      }
    } else {
      // Create mock response
      verificationResult = {
        success: true,
        verification_id: `verification-${userId}-${Date.now()}`,
        status: "in_progress",
      };
    }

    res.status(200).json({
      status: "success",
      data: verificationResult,
    });
  } catch (error) {
    console.error("Error submitting verification:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to submit verification",
    });
  }
});

/**
 * Get verification status from Onfido
 * @route GET /api/auth/onfido/status/:userId
 * @access Public
 */
router.get("/onfido/status/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        status: "error",
        message: "User ID is required",
      });
    }

    let statusData;

    // Use Onfido SDK if available, otherwise use mock
    if (onfidoApi) {
      try {
        // Find user in database
        const user = await User.findByPk(userId);
        if (!user) {
          return res.status(404).json({
            status: "error",
            message: "User not found",
          });
        }

        // Get check ID
        const checkId = user.onfidoCheckId;
        if (!checkId) {
          return res.status(400).json({
            status: "error",
            message: "User does not have a verification check",
          });
        }

        // Get check status
        const check = await onfidoApi.check.find(checkId);

        // Map Onfido result to our expected format
        statusData = {
          verification_status: check.status,
          result: check.result,
          created_at: check.createdAt,
          updated_at: check.updatedAt,
        };
      } catch (onfidoError) {
        console.error("Onfido API error:", onfidoError);
        // Fall back to mock response if Onfido API fails
        statusData = {
          verification_status: "complete",
          result: "approved",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    } else {
      // Create mock response
      statusData = {
        verification_status: "complete",
        result: "approved",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    res.status(200).json({
      status: "success",
      data: statusData,
    });
  } catch (error) {
    console.error("Error getting verification status:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get verification status",
    });
  }
});

/**
 * Extract document data from Onfido
 * @route GET /api/auth/onfido/extract/:documentId
 * @access Public
 */
router.get("/onfido/extract/:documentId", async (req, res) => {
  try {
    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).json({
        status: "error",
        message: "Document ID is required",
      });
    }

    let documentData;

    // Use Onfido SDK if available, otherwise use mock
    if (onfidoApi) {
      try {
        // Get document details from Onfido
        const document = await onfidoApi.document.find(documentId);

        // Extract data
        documentData = {
          document_id: documentId,
          document_type: document.type,
          document_data: {
            given_name: document.firstName || "Unknown",
            surname: document.lastName || "Unknown",
            date_of_birth: document.dateOfBirth || null,
            nationality: document.nationality || "Unknown",
            document_number: document.documentNumber || null,
            expiry_date: document.expiryDate || null,
            issuing_country: document.issuingCountry || null,
          },
        };

        // Add issuing state if available (for US documents)
        if (document.issuingState) {
          documentData.document_data.issuing_state = document.issuingState;
        }
      } catch (onfidoError) {
        console.error("Onfido API error:", onfidoError);
        // Fall back to mock data if Onfido API fails
        documentData = {
          document_id: documentId,
          document_type: "driving_license",
          document_data: {
            given_name: "John",
            surname: "Doe",
            date_of_birth: "1990-01-01",
            nationality: "USA",
            document_number: "DL12345678",
            expiry_date: "2025-01-01",
            issuing_country: "USA",
            issuing_state: "California",
          },
        };
      }
    } else {
      // Create mock response
      documentData = {
        document_id: documentId,
        document_type: "driving_license",
        document_data: {
          given_name: "John",
          surname: "Doe",
          date_of_birth: "1990-01-01",
          nationality: "USA",
          document_number: "DL12345678",
          expiry_date: "2025-01-01",
          issuing_country: "USA",
          issuing_state: "California",
        },
      };
    }

    res.status(200).json({
      status: "success",
      data: documentData,
    });
  } catch (error) {
    console.error("Error extracting document data:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to extract document data",
    });
  }
});

/**
 * Generate digital key
 * @route POST /api/auth/verify/digital-key
 * @access Public
 */
router.post("/verify/digital-key", async (req, res) => {
  try {
    const { email, ballot_id } = req.body;

    if (!email || !ballot_id) {
      return res.status(400).json({
        status: "error",
        message: "Email and ballot ID are required",
      });
    }

    // Here you would generate a unique digital key
    // For now, we'll generate a mock key
    const digitalKey = `${Math.random()
      .toString(36)
      .substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

    // Save the digital key to the database (mock implementation)
    console.log(
      `Generated digital key for email: ${email}, ballot: ${ballot_id}: ${digitalKey}`
    );

    res.status(200).json({
      status: "success",
      data: {
        digital_key: digitalKey,
        expiry: new Date(Date.now() + 24 * 3600000).toISOString(), // 24 hours from now
      },
    });
  } catch (error) {
    console.error("Error generating digital key:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to generate digital key",
    });
  }
});

/**
 * Validate token and get role information
 * @route GET /api/auth/validate-token
 * @access Public
 */
router.get("/validate-token", async (req, res) => {
  try {
    // Get token from Authorization header
    let token = req.header("Authorization");

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "No authentication token provided",
      });
    }

    // Remove Bearer prefix if present
    if (token.startsWith("Bearer ")) {
      token = token.slice(7);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check token type
    if (decoded.role === "voter") {
      // This is a voter token
      return res.status(200).json({
        status: "success",
        data: {
          isValid: true,
          role: "voter",
          voterId: decoded.voterId,
          ballotId: decoded.ballotId,
          email: decoded.email,
          name: decoded.name,
        },
      });
    } else if (decoded.role === "admin" || decoded.role === "user") {
      // This is an admin token - verify the user exists
      const user = await User.findByPk(decoded.id);
      if (!user) {
        return res.status(401).json({
          status: "error",
          message: "Invalid token - user not found",
        });
      }

      return res.status(200).json({
        status: "success",
        data: {
          isValid: true,
          role: decoded.role,
          userId: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } else {
      // Unknown role
      return res.status(401).json({
        status: "error",
        message: "Invalid token role",
      });
    }
  } catch (error) {
    console.error("Token validation error:", error);
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
    });
  }
});

// Add a function to validate the token
const validateToken = async () => {
  try {
    const response = await axios.get("/api/auth/validate-token");
    console.log("Token validation:", response.data);
    return response.data.status === "success";
  } catch (error) {
    console.error("Token validation failed:", error);
    return false;
  }
};

// After successful registration with /ballots/register-with-key
function handleRegistrationSuccess(response) {
  // Extract token and voter info
  const { token, voter, ballot } = response.data.data;

  // Store token in localStorage
  localStorage.setItem("voterToken", token);

  // Also store voter info for later use
  localStorage.setItem(
    "voterInfo",
    JSON.stringify({
      name: voter.name,
      email: voter.email,
      voterId: voter.id,
      ballotId: ballot.id,
    })
  );

  console.log("Voter token stored:", token.substring(0, 15) + "...");

  return { voter, ballot };
}

// Function to register voter with ballot after successful registration
async function registerVoterWithBallot(ballotId) {
  try {
    // Debug: Check if token exists
    const token = localStorage.getItem("voterToken");
    console.log(
      "Token being sent:",
      token ? token.substring(0, 15) + "..." : "NO TOKEN"
    );

    // Make API call using the interceptor
    const response = await api.post(`/ballots/${ballotId}/register-voter`);

    console.log("Voter registered with ballot:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(
      "Failed to register voter with ballot:",
      error.response?.data || error.message
    );
    return {
      success: false,
      error: error.response?.data?.message || "Failed to register with ballot",
    };
  }
}

// Instead of using the interceptor, make the call with explicit headers
async function registerVoterManually(ballotId) {
  try {
    const token = localStorage.getItem("voterToken");
    if (!token) {
      throw new Error("No voter token available");
    }

    // Make API call with explicit headers
    const response = await axios({
      method: "post",
      url: `/api/ballots/${ballotId}/register-voter`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Voter registered with ballot:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(
      "Failed to register voter with ballot:",
      error.response?.data || error.message
    );
    return {
      success: false,
      error: error.response?.data?.message || "Failed to register with ballot",
    };
  }
}

// Debug function to check token in localStorage
function checkVoterToken() {
  const token = localStorage.getItem("voterToken");
  if (token) {
    console.log("Voter token exists:", token.substring(0, 15) + "...");
    return true;
  } else {
    console.warn("No voter token found in localStorage");
    return false;
  }
}

// Debug function to validate token with backend
async function validateVoterToken() {
  try {
    const token = localStorage.getItem("voterToken");
    if (!token) {
      console.warn("No token to validate");
      return false;
    }

    const response = await axios.get("/api/auth/validate-token", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Token validation response:", response.data);
    return response.data.status === "success";
  } catch (error) {
    console.error(
      "Token validation failed:",
      error.response?.data || error.message
    );
    return false;
  }
}

// Add OTP authentication routes
router.post("/sign-in", authController.signIn);
router.post("/verify-otp", authController.verifyOtp);
router.post("/resend-otp", authController.resendOtp);

// Add dedicated voter authentication route
router.post("/voter/sign-in", authController.voterSignIn);

module.exports = router;
