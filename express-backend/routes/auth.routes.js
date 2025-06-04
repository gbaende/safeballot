const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models/user.model");
const { Ballot } = require("../models/ballot.model");
const Voter = require("../models/voter.model");
const axios = require("axios");
const { body, validationResult } = require("express-validator");
const { protect } = require("../middleware/auth.middleware");
const crypto = require("crypto");
const authController = require("../controllers/authController");

const router = express.Router();

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
 * @route POST /api/auth/verify/digital-key
 * @desc Generate a digital key for voter verification
 * @access Public
 */
router.post("/verify/digital-key", async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, documentNumber } = req.body;

    if (!firstName || !lastName || !dateOfBirth || !documentNumber) {
      return res.status(400).json({
        success: false,
        message: "All fields are required for digital key generation",
      });
    }

    // Generate a mock digital key (replace with actual implementation)
    const digitalKey = `DK-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    res.json({
      success: true,
      digitalKey,
      message: "Digital key generated successfully",
    });
  } catch (error) {
    console.error("Digital key generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate digital key",
    });
  }
});

/**
 * @route GET /api/auth/validate-token
 * @desc Validate JWT token and return user info
 * @access Private
 */
router.get("/validate-token", async (req, res) => {
  try {
    const token = req.header("x-auth-token");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Token validation error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid token",
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

/**
 * Voter Registration
 * @route POST /api/voter-registration
 * @body {object} formData - Voter registration data
 * @access Public
 */
router.post(
  "/voter-registration",
  [
    body("firstName").notEmpty().withMessage("First name is required"),
    body("lastName").notEmpty().withMessage("Last name is required"),
    body("dateOfBirth").notEmpty().withMessage("Date of birth is required"),
    body("address").notEmpty().withMessage("Address is required"),
    body("city").notEmpty().withMessage("City is required"),
    body("state").notEmpty().withMessage("State is required"),
    body("zipCode").notEmpty().withMessage("ZIP code is required"),
    body("ssn").notEmpty().withMessage("SSN is required"),
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("phone").notEmpty().withMessage("Phone number is required"),
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

      const {
        firstName,
        lastName,
        dateOfBirth,
        address,
        city,
        state,
        zipCode,
        ssn,
        email,
        phone,
      } = req.body;

      console.log("Voter registration attempt:", {
        firstName,
        lastName,
        email,
        city,
        state,
      });

      // Check if voter already exists with this email
      const existingVoter = await Voter.findOne({ where: { email } });
      if (existingVoter) {
        return res.status(400).json({
          status: "error",
          message: "A voter with this email is already registered",
        });
      }

      // Create voter record
      const voter = await Voter.create({
        firstName,
        lastName,
        dateOfBirth,
        address,
        city,
        state,
        zipCode,
        ssn: ssn.replace(/\D/g, ""), // Store only digits
        email,
        phone: phone.replace(/\D/g, ""), // Store only digits
        isVerified: false,
        registrationDate: new Date(),
      });

      console.log(`Voter registered successfully: ${voter.id}`);

      // Generate a verification token (you might want to send this via email)
      const verificationToken = crypto.randomBytes(32).toString("hex");
      voter.verificationToken = verificationToken;
      await voter.save();

      res.status(201).json({
        status: "success",
        message:
          "Voter registration successful. Please check your email for verification instructions.",
        data: {
          voterId: voter.id,
          email: voter.email,
          // Don't send sensitive data back
        },
      });
    } catch (error) {
      console.error("Voter registration error:", error);
      res.status(500).json({
        status: "error",
        message: "Registration failed. Please try again.",
      });
    }
  }
);

module.exports = router;
