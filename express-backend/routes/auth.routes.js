const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
const { User } = require("../models/user.model");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * Helper function to generate JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
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
 * @access Public
 */
router.post(
  "/register",
  [
    // Validation middleware
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
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
        console.log("Validation errors:", errors.array());
        return res.status(400).json({
          status: "error",
          errors: errors.array(),
        });
      }

      const { name, email, password, role = "user" } = req.body;
      console.log("Registration attempt with:", {
        name,
        email,
        role,
        password: "***",
      });

      // Check if user already exists
      const userExists = await User.findOne({ where: { email } });
      if (userExists) {
        console.log("User already exists with email:", email);
        return res.status(400).json({
          status: "error",
          message: "User already exists with this email",
        });
      }

      // Create new user
      try {
        const user = await User.create({
          name,
          email,
          password,
          role, // Explicitly set the role from request
        });
        console.log("User created successfully:", user.id, "with role:", role);

        // Generate tokens
        const token = generateToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        // Update user with refresh token
        user.refreshToken = refreshToken;
        await user.save();
        console.log("Refresh token saved to user");

        // Return response with tokens and user data
        res.status(201).json({
          status: "success",
          message: "User registered successfully",
          data: {
            user: user.toJSON(),
            token,
            refreshToken,
          },
        });
      } catch (createError) {
        console.error("Error creating user in database:", createError);
        throw createError; // Re-throw to be caught by outer catch
      }
    } catch (error) {
      console.error("Error registering user:", error);
      console.error("Error details:", error.name, error.message);
      if (error.errors) {
        console.error("Validation errors:", error.errors);
      }
      if (error.parent) {
        console.error("Parent error:", error.parent.message);
      }
      res.status(500).json({
        status: "error",
        message: "Failed to register user",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
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
      const token = generateToken(user.id);
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
    const token = generateToken(user.id);
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

module.exports = router;
