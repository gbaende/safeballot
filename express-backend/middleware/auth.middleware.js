const jwt = require("jsonwebtoken");
const { User } = require("../models/user.model");

/**
 * Authentication middleware to protect routes
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from the Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // If no token found, return unauthorized
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "You are not logged in. Please log in to access this resource",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user with the id from the token
    const user = await User.findByPk(decoded.id);

    // If no user found, return unauthorized
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "The user belonging to this token no longer exists",
      });
    }

    // Set user in request
    req.user = user;
    next();
  } catch (error) {
    // If token verification fails
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        status: "error",
        message: "Invalid token. Please log in again",
      });
    }

    // If token has expired
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: "error",
        message: "Your token has expired. Please log in again",
      });
    }

    // Any other error
    return res.status(500).json({
      status: "error",
      message: "Authentication error. Please try again",
    });
  }
};

/**
 * Middleware to restrict access to certain user roles
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if user role is allowed
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };
};

/**
 * Middleware to protect admin routes
 * Verifies token and ensures the user has admin role
 */
exports.protectAdmin = async (req, res, next) => {
  try {
    let token;

    // Get token from the Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // If no token found, return unauthorized
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "You are not logged in. Please log in to access this resource",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user with the id from the token
    const user = await User.findByPk(decoded.id);

    // If no user found, return unauthorized
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "The user belonging to this token no longer exists",
      });
    }

    // Check if user has admin role
    if (user.role !== "admin") {
      console.log(
        `Access denied: User ${user.email} (${user.id}) with role ${user.role} attempted to access admin route`
      );
      return res.status(403).json({
        status: "error",
        message: "This account does not have administrator privileges",
      });
    }

    // Set user in request
    req.user = user;
    next();
  } catch (error) {
    // If token verification fails
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        status: "error",
        message: "Invalid token. Please log in again",
      });
    }

    // If token has expired
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: "error",
        message: "Your token has expired. Please log in again",
      });
    }

    // Any other error
    return res.status(500).json({
      status: "error",
      message: "Authentication error. Please try again",
    });
  }
};

/**
 * Middleware to protect voter routes
 * Verifies token and ensures the user has voter role
 */
exports.protectVoter = async (req, res, next) => {
  try {
    let token;

    // Get token from the Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // If no token found, return unauthorized
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "You are not logged in. Please log in to access this resource",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user with the id from the token
    const user = await User.findByPk(decoded.id);

    // If no user found, return unauthorized
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "The user belonging to this token no longer exists",
      });
    }

    // Check if user has voter role
    if (user.role !== "voter") {
      console.log(
        `Access denied: User ${user.email} (${user.id}) with role ${user.role} attempted to access voter route`
      );
      return res.status(403).json({
        status: "error",
        message: "This account does not have voter privileges",
      });
    }

    // Set user in request
    req.user = user;
    next();
  } catch (error) {
    // If token verification fails
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        status: "error",
        message: "Invalid token. Please log in again",
      });
    }

    // If token has expired
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: "error",
        message: "Your token has expired. Please log in again",
      });
    }

    // Any other error
    return res.status(500).json({
      status: "error",
      message: "Authentication error. Please try again",
    });
  }
};
