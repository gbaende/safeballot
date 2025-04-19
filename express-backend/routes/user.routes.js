const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const { User } = require("../models/user.model");
const { protect, restrictTo } = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * Get all users
 * @route GET /api/users
 * @access Private/Admin
 */
router.get("/", [protect, restrictTo("admin")], async (req, res) => {
  try {
    const users = await User.findAll();

    res.status(200).json({
      status: "success",
      data: users,
    });
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get users",
    });
  }
});

/**
 * Get current user profile
 * @route GET /api/users/profile
 * @access Private
 */
router.get("/profile", protect, async (req, res) => {
  try {
    // User is already loaded in the request by the protect middleware
    res.status(200).json({
      status: "success",
      data: req.user,
    });
  } catch (error) {
    console.error("Error getting user profile:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get user profile",
    });
  }
});

/**
 * Update current user profile
 * @route PUT /api/users/profile
 * @access Private
 */
router.put(
  "/profile",
  [
    protect,
    body("name").optional().notEmpty().withMessage("Name cannot be empty"),
    body("email")
      .optional()
      .isEmail()
      .withMessage("Please provide a valid email"),
    body("profilePicture").optional(),
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

      const { name, email, profilePicture } = req.body;

      // If email is being changed, check if it already exists
      if (email && email !== req.user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          return res.status(400).json({
            status: "error",
            message: "Email is already in use",
          });
        }
      }

      // Update user
      await req.user.update({
        ...(name && { name }),
        ...(email && { email }),
        ...(profilePicture !== undefined && { profilePicture }),
      });

      res.status(200).json({
        status: "success",
        message: "Profile updated successfully",
        data: req.user,
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update user profile",
      });
    }
  }
);

/**
 * Change user password
 * @route POST /api/users/change-password
 * @access Private
 */
router.post(
  "/change-password",
  [
    protect,
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters long"),
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

      const { currentPassword, newPassword } = req.body;

      // Check current password
      const isPasswordValid = await req.user.checkPassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({
          status: "error",
          message: "Current password is incorrect",
        });
      }

      // Update password
      req.user.password = newPassword;
      await req.user.save();

      res.status(200).json({
        status: "success",
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to change password",
      });
    }
  }
);

/**
 * Create a new user
 * @route POST /api/users
 * @access Private/Admin
 */
router.post(
  "/",
  [
    protect,
    restrictTo("admin"),
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("role").optional().isIn(["admin", "user"]).withMessage("Invalid role"),
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

      const { name, email, password, role } = req.body;

      // Check if user already exists
      const userExists = await User.findOne({ where: { email } });
      if (userExists) {
        return res.status(400).json({
          status: "error",
          message: "User already exists with this email",
        });
      }

      // Create user
      const user = await User.create({
        name,
        email,
        password,
        role: role || "user",
      });

      res.status(201).json({
        status: "success",
        message: "User created successfully",
        data: user,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to create user",
      });
    }
  }
);

/**
 * Get a user by ID
 * @route GET /api/users/:id
 * @access Private/Admin
 */
router.get("/:id", [protect, restrictTo("admin")], async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: user,
    });
  } catch (error) {
    console.error("Error getting user:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get user",
    });
  }
});

/**
 * Update a user
 * @route PUT /api/users/:id
 * @access Private/Admin
 */
router.put(
  "/:id",
  [
    protect,
    restrictTo("admin"),
    body("name").optional().notEmpty().withMessage("Name cannot be empty"),
    body("email")
      .optional()
      .isEmail()
      .withMessage("Please provide a valid email"),
    body("role").optional().isIn(["admin", "user"]).withMessage("Invalid role"),
    body("isVerified")
      .optional()
      .isBoolean()
      .withMessage("isVerified must be a boolean"),
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

      const { id } = req.params;
      const { name, email, role, isVerified } = req.body;

      // Find user
      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      // If email is being changed, check if it already exists
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          return res.status(400).json({
            status: "error",
            message: "Email is already in use",
          });
        }
      }

      // Update user
      await user.update({
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role }),
        ...(isVerified !== undefined && { isVerified }),
      });

      res.status(200).json({
        status: "success",
        message: "User updated successfully",
        data: user,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update user",
      });
    }
  }
);

/**
 * Delete a user
 * @route DELETE /api/users/:id
 * @access Private/Admin
 */
router.delete("/:id", [protect, restrictTo("admin")], async (req, res) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Prevent deleting self
    if (user.id === req.user.id) {
      return res.status(400).json({
        status: "error",
        message: "You cannot delete your own account",
      });
    }

    // Delete user
    await user.destroy();

    res.status(200).json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete user",
    });
  }
});

module.exports = router;
