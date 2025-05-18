const jwt = require("jsonwebtoken");
const { User } = require("../models/user.model");
const { Voter } = require("../models/ballot.model");

/**
 * Authentication middleware for all users (admin and voter)
 * This checks for any valid token and attaches the appropriate user info
 */
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    let token = req.header("Authorization");

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "No authentication token, access denied",
      });
    }

    // Remove Bearer prefix if present
    if (token.startsWith("Bearer ")) {
      token = token.slice(7);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Set token payload with role information on request
    req.user = decoded;

    // Log auth activity
    console.log(
      `Auth: ${decoded.role || "unknown"} user authenticated, ID: ${
        decoded.id || "unknown"
      }`
    );

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    return res.status(401).json({
      status: "error",
      message: "Token is invalid or expired",
    });
  }
};

/**
 * Authentication middleware for admin/user roles
 * This ensures only admins/users can access protected admin routes
 */
exports.protect = async (req, res, next) => {
  try {
    // Get token from Authorization header
    let token = req.header("Authorization");

    // Add detailed logging to diagnose the issue
    console.log(`[PROTECT MIDDLEWARE] Request to ${req.originalUrl}`);
    console.log(`[PROTECT MIDDLEWARE] Auth header present: ${!!token}`);

    // Check if token exists
    if (!token) {
      console.log(
        `[PROTECT MIDDLEWARE] 🚫 No token provided for ${req.originalUrl}`
      );
      return res.status(401).json({
        status: "error",
        message: "No authentication token, access denied",
      });
    }

    // Remove Bearer prefix if present
    if (token.startsWith("Bearer ")) {
      token = token.slice(7);
      console.log(`[PROTECT MIDDLEWARE] Token format: Bearer token`);
    } else {
      console.log(
        `[PROTECT MIDDLEWARE] ⚠️ Token without Bearer prefix: ${token.substring(
          0,
          15
        )}...`
      );
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(
      `[PROTECT MIDDLEWARE] Token decoded. Role: ${decoded.role}, ID: ${decoded.id}`
    );

    // ENHANCED: Check for admin role
    if (decoded.role !== "admin" && decoded.role !== "user") {
      console.log(
        `[PROTECT MIDDLEWARE] ❌ Auth failed: Token role is not admin/user (${
          decoded.role || "undefined"
        })`
      );
      return res.status(403).json({
        status: "error",
        message: "Access denied. Admin privileges required.",
      });
    }

    // Get user from database
    const user = await User.findByPk(decoded.id);

    // Check if user exists
    if (!user) {
      console.log(`[PROTECT MIDDLEWARE] ❌ User not found: ${decoded.id}`);
      return res.status(401).json({
        status: "error",
        message: "The user associated with this token no longer exists",
      });
    }

    // Set user info on the request
    req.user = user;

    // Log successful authentication
    console.log(
      `[PROTECT MIDDLEWARE] ✅ Admin ${user.email} (${user.id}) authenticated successfully`
    );

    next();
  } catch (error) {
    console.error(
      `[PROTECT MIDDLEWARE] ❌ Authentication error:`,
      error.message
    );
    return res.status(401).json({
      status: "error",
      message: "Token is invalid or expired",
    });
  }
};

/**
 * Voter-only authentication middleware
 * This ensures only voter users can access the protected route
 */
exports.voterAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    let token = req.header("Authorization");

    // Add detailed logging
    console.log(`[VOTER AUTH] Request to ${req.originalUrl}`);
    console.log(`[VOTER AUTH] Auth header present: ${!!token}`);

    // Check if token exists
    if (!token) {
      console.log(`[VOTER AUTH] 🚫 No token provided for ${req.originalUrl}`);
      return res.status(401).json({
        status: "error",
        message: "No authentication token, access denied",
      });
    }

    // Remove Bearer prefix if present
    if (token.startsWith("Bearer ")) {
      token = token.slice(7);
      console.log(`[VOTER AUTH] Token format: Bearer token`);
    } else {
      console.log(
        `[VOTER AUTH] ⚠️ Token without Bearer prefix: ${token.substring(
          0,
          15
        )}...`
      );
    }

    // Log token preview for debugging
    console.log(`[VOTER AUTH] Token preview: ${token.substring(0, 15)}...`);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(
      `[VOTER AUTH] Token decoded. Role: ${decoded.role}, VoterId: ${decoded.voterId}`
    );

    // Check if this is a voter token
    if (decoded.role !== "voter") {
      console.log(
        `[VOTER AUTH] ❌ Token role is incorrect: expected "voter", got "${decoded.role}"`
      );
      return res.status(403).json({
        status: "error",
        message: "Access denied. Voter role required.",
      });
    }

    // Check if the voter exists in the database
    const voter = await Voter.findByPk(decoded.voterId);
    if (!voter) {
      console.log(
        `[VOTER AUTH] ❌ Voter ${decoded.voterId} not found in database`
      );
      return res.status(401).json({
        status: "error",
        message: "Invalid authentication, voter not found",
      });
    }

    // Set voter information on the request object
    req.voter = {
      id: voter.id,
      name: voter.name,
      email: voter.email,
      ballotId: voter.ballotId,
    };

    console.log(
      `[VOTER AUTH] ✅ Voter authenticated: ${voter.email} (${voter.id}) for ballot ${voter.ballotId}`
    );

    next();
  } catch (error) {
    console.error(`[VOTER AUTH] ❌ Error:`, error.message);
    return res.status(401).json({
      status: "error",
      message: "Authentication failed, invalid or expired voter token",
    });
  }
};

/**
 * Optional voter authentication middleware
 * This attempts to authenticate a voter but continues even if authentication fails
 */
exports.optionalVoterAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    let token = req.header("Authorization");

    // If no token is provided, continue without authentication
    if (!token) {
      console.log("No voter token provided, continuing as unauthenticated");
      return next();
    }

    // Remove Bearer prefix if present
    if (token.startsWith("Bearer ")) {
      token = token.slice(7);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if this is a voter token
    if (decoded.role !== "voter") {
      console.log(
        `Token role is not voter (${decoded.role}), continuing as unauthenticated`
      );
      return next();
    }

    // Check if the voter exists in the database
    const voter = await Voter.findByPk(decoded.voterId);
    if (!voter) {
      console.log(
        `Voter ${decoded.voterId} not found, continuing as unauthenticated`
      );
      return next();
    }

    // Set voter information on the request object
    req.voter = {
      id: voter.id,
      name: voter.name,
      email: voter.email,
      ballotId: voter.ballotId,
    };

    console.log(`Optional voter auth successful: ${voter.email} (${voter.id})`);

    next();
  } catch (error) {
    // If token verification fails, continue without authentication
    console.log("Optional voter auth failed, continuing as unauthenticated");
    next();
  }
};

/**
 * Restrict access to specific user roles
 * @param {...string} roles - Roles allowed to access the route
 * @returns {function} - Middleware function
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if user exists and has a role
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        status: "error",
        message:
          "Access denied. You don't have permission to access this resource.",
      });
    }

    // Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: `Access denied. ${req.user.role} role is not allowed to access this resource.`,
      });
    }

    // User has an allowed role, proceed to the next middleware
    next();
  };
};
