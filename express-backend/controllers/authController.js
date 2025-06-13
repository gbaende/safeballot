const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getDb } = require("../db/db");
const { sendEmail } = require("../utils/email");
const {
  saveOtp,
  getOtp,
  deleteOtp,
  generateOtpCode,
  incrementAttempts,
  getAttempts,
  OTP_TTL_MINUTES,
  MAX_ATTEMPTS,
} = require("../utils/otpStore");
const { MongoUser } = require("../models/mongo.models");
const { User } = require("../models/user.model");
const { Voter } = require("../models/ballot.model");

// Helper function to get the base URL for hosted assets
const getLogoUrl = () => {
  // In production, use the actual domain. In development, use localhost
  const baseUrl =
    process.env.BASE_URL || process.env.FRONTEND_URL || "http://localhost:3000";
  return `${baseUrl}/images/logo@2x.png`;
};

// JWT secret key - ideally this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
// JWT expiration time - default to 24 hours
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const issueJwtFor = (user) => {
  const payload = {
    id: user._id || user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * User sign-in handler for admin users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Email and password are required" });
    }

    // First check the SQL database for the user using the User model
    const { User } = require("../models/user.model");
    let sqlUser = null;

    try {
      sqlUser = await User.findOne({ where: { email } });
    } catch (sqlErr) {
      console.error("Error checking SQL database:", sqlErr);
    }

    if (!sqlUser) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    // Verify password against SQL user
    const isPasswordValid = await sqlUser.checkPassword(password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    // Get MongoDB user or create if not exists
    let mongoUser = await MongoUser.findOne({ email: email.toLowerCase() });

    if (!mongoUser) {
      mongoUser = new MongoUser({
        sqlId: sqlUser.id.toString(),
        email: sqlUser.email.toLowerCase(),
        name: sqlUser.name,
        password: sqlUser.password, // Already hashed in SQL
        role: sqlUser.role,
        isVerified: sqlUser.isVerified,
      });

      await mongoUser.save();
      console.log(`Created MongoDB user for ${email} from SQL data`);
    }

    // For non-voter roles, generate token directly
    const token = issueJwtFor(mongoUser);
    res.json({
      success: true,
      token,
      user: {
        id: mongoUser._id,
        email: mongoUser.email,
        name: mongoUser.name,
        role: mongoUser.role,
      },
    });
  } catch (error) {
    console.error("Sign-in error:", error);
    res.status(500).json({ success: false, error: "Authentication failed" });
  }
};

/**
 * Voter-specific sign-in handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.voterSignIn = async (req, res) => {
  try {
    console.log("Voter sign-in attempt for:", req.body.email);
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Email and password are required" });
    }

    // Check the SQL Voter model first
    let sqlVoter = null;
    try {
      console.log("Querying SQL Voter database for email:", email);
      sqlVoter = await Voter.findOne({ where: { email } });
      console.log("SQL Voter query result:", sqlVoter ? "Found" : "Not found");
    } catch (sqlErr) {
      console.error("Error checking SQL Voter database:", sqlErr);
    }

    // Check MongoDB user
    let mongoUser = null;
    try {
      console.log("Querying MongoDB for user with email:", email);
      mongoUser = await MongoUser.findOne({ email: email.toLowerCase() });
      console.log(
        "MongoDB user query result:",
        mongoUser ? "Found" : "Not found"
      );
    } catch (mongoErr) {
      console.error("Error checking MongoDB database:", mongoErr);
    }

    // If no MongoDB user but SQL voter exists, create MongoDB user
    if (!mongoUser && sqlVoter) {
      try {
        console.log("Creating MongoDB user from SQL voter data for:", email);
        // Hash password since we're creating a new user
        const hashedPassword = await bcrypt.hash(password, 12);

        mongoUser = new MongoUser({
          sqlId: sqlVoter.id.toString(),
          email: sqlVoter.email.toLowerCase(),
          name: sqlVoter.name,
          password: hashedPassword,
          role: "voter",
          ballotId: sqlVoter.ballotId,
        });

        await mongoUser.save();
        console.log(`Created MongoDB user for voter ${email} from SQL data`);
      } catch (createErr) {
        console.error("Error creating MongoDB user from SQL voter:", createErr);
        return res.status(500).json({
          success: false,
          error: "Failed to create user account",
          details: "Database error during account creation",
        });
      }
    }

    // If still no MongoDB user, check if there's a User record that might be a voter
    if (!mongoUser) {
      console.log("No MongoDB user found, checking SQL User table for:", email);
      let sqlUser = null;
      try {
        sqlUser = await User.findOne({ where: { email } });
        console.log("SQL User query result:", sqlUser ? "Found" : "Not found");
      } catch (sqlErr) {
        console.error("Error checking SQL User database:", sqlErr);
      }

      if (sqlUser) {
        try {
          // Verify password against SQL user
          console.log("Verifying password for SQL User");
          const isPasswordValid = await sqlUser.checkPassword(password);
          if (!isPasswordValid) {
            console.log("Invalid password for SQL User:", email);
            return res
              .status(401)
              .json({ success: false, error: "Invalid credentials" });
          }

          // Create MongoDB user from SQL User data
          console.log("Creating MongoDB user from SQL User data");
          mongoUser = new MongoUser({
            sqlId: sqlUser.id.toString(),
            email: sqlUser.email.toLowerCase(),
            name: sqlUser.name,
            password: sqlUser.password, // Already hashed
            role: "voter", // Force voter role for this endpoint
          });

          await mongoUser.save();
          console.log(
            `Created MongoDB voter user for ${email} from SQL User data`
          );
        } catch (processingErr) {
          console.error("Error processing SQL User data:", processingErr);
          return res.status(500).json({
            success: false,
            error: "Account processing error",
            details: processingErr.message,
          });
        }
      } else {
        console.log("No user found in either database for email:", email);
        return res.status(401).json({
          success: false,
          error: "Invalid credentials - voter not found",
        });
      }
    } else {
      // Verify password if MongoDB user exists
      try {
        console.log("Verifying password for existing MongoDB user");
        const isPasswordValid = await bcrypt.compare(
          password,
          mongoUser.password
        );
        if (!isPasswordValid) {
          console.log("Invalid password for MongoDB user:", email);
          return res.status(401).json({
            success: false,
            error: "Invalid credentials - password incorrect",
          });
        }
      } catch (passwordErr) {
        console.error("Error verifying password:", passwordErr);
        return res.status(500).json({
          success: false,
          error: "Authentication error",
          details: "Error during password verification",
        });
      }
    }

    // Update MongoDB user role to ensure it's 'voter'
    try {
      console.log("Updating MongoDB user role to 'voter'");
      mongoUser.role = "voter";
      await mongoUser.save();
    } catch (updateErr) {
      console.error("Error updating user role:", updateErr);
      // Continue with login even if role update fails
    }

    // Generate OTP for voter
    let code = "";
    try {
      console.log("Generating OTP for voter:", email);
      code = generateOtpCode();
      await saveOtp(mongoUser._id.toString(), code, mongoUser.email);
      console.log(`Generated OTP ${code} for voter ${email}`);

      // Send OTP via email
      try {
        const logoUrl = getLogoUrl();
        await sendEmail(
          mongoUser.email,
          "Your SafeBallot Verification Code",
          `Your 4-digit verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
          `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SafeBallot Verification Code</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    <div style="background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- SafeBallot Logo Header -->
        <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #080E1D;">
            <img
                src="${logoUrl}"
                alt="SafeBallot"
                width="44" height="56"
                style="display: block; margin: 0 auto 10px; line-height: 1; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;"
            />
            <div>
                <h1 style="margin: 0; color: #080E1D; font-size: 28px; font-weight: 700; letter-spacing: 1px;">SAFEBALLOT</h1>
                <p style="margin: 0; color: #6b7280; font-size: 12px; letter-spacing: 2px; font-weight: 500;">-VOTE OUTSIDE THE BOX-</p>
            </div>
        </div>

        <!-- Main Content -->
        <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #263C75; font-size: 24px; margin-bottom: 15px; font-weight: 600;">Verification Code</h2>
            <p style="font-size: 16px; color: #374151; margin-bottom: 30px;">
                Your 4-digit verification code is:
            </p>
            
            <!-- OTP Code Display -->
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 2px solid #080E1D;">
                <h3 style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace; color: #080E1D;">${code}</h3>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
                This code expires in <strong>${OTP_TTL_MINUTES} minutes</strong>
            </p>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                    <strong>Security Notice:</strong> If you didn't request this code, please ignore this email or contact our support team.
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #6b7280; text-align: center;">
            <p style="margin: 0 0 5px 0;">This verification code was sent to ${
              mongoUser.email
            }</p>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                    © ${new Date().getFullYear()} SafeBallot. Secure, transparent, and democratic voting platform.
                </p>
            </div>
        </div>
    </div>
</body>
</html>`
        );
        console.log("OTP email sent successfully");
      } catch (emailErr) {
        console.error("Error sending OTP email:", emailErr);

        // In development, continue anyway with the OTP code in logs
        if (process.env.NODE_ENV === "development") {
          console.log(
            "IN DEVELOPMENT MODE: Continuing login process despite email error"
          );
          console.log(`DEVELOPMENT OTP CODE for ${email}: ${code}`);
        } else {
          // In production, fail the request
          throw emailErr;
        }
      }
    } catch (otpErr) {
      console.error("Error during OTP generation or email sending:", otpErr);
      return res.status(500).json({
        success: false,
        error: "Failed to generate verification code",
        details: otpErr.message,
      });
    }

    // Return that OTP is required
    console.log("Login successful, OTP sent for voter:", email);
    return res.json({
      success: true,
      otpRequired: true,
      userId: mongoUser._id.toString(),
      email: mongoUser.email,
      ttlMinutes: OTP_TTL_MINUTES,
    });
  } catch (error) {
    console.error("Voter sign-in error:", error);
    // Log full error stack trace to help diagnose the issue
    console.error("Full error stack:", error.stack);

    // Return a detailed error response
    res.status(500).json({
      success: false,
      error: "Authentication failed",
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    });
  }
};

/**
 * Verify OTP handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        error: "User ID and verification code are required",
      });
    }

    // Check for too many attempts (5 max)
    const attempts = await getAttempts(userId);
    if (attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        error: "Too many failed attempts. Please try again in 1 minute.",
      });
    }

    // Get the stored OTP
    const correctCode = await getOtp(userId);
    if (!correctCode) {
      return res.status(401).json({
        success: false,
        error: "Verification code has expired. Please request a new one.",
      });
    }

    // Verify the OTP
    if (correctCode !== code) {
      // Increment failed attempts
      const newAttempts = await incrementAttempts(userId);
      const remainingAttempts = MAX_ATTEMPTS - newAttempts;

      return res.status(401).json({
        success: false,
        error: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
      });
    }

    // OTP is correct, delete it
    await deleteOtp(userId);

    // Get user from MongoDB database
    const user = await MongoUser.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Generate token
    const token = issueJwtFor(user);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ success: false, error: "Verification failed" });
  }
};

/**
 * Resend OTP handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.resendOtp = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, error: "User ID is required" });
    }

    // Get user from MongoDB database
    const user = await MongoUser.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Generate new OTP code
    const code = generateOtpCode();
    await saveOtp(userId, code, user.email);
    console.log(`Generated new OTP ${code} for user ${user.email}`);

    // Send OTP via email
    const logoUrl = getLogoUrl();
    await sendEmail(
      user.email,
      "Your SafeBallot Verification Code (Resent)",
      `Your 4-digit verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
      `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SafeBallot Verification Code</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    <div style="background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- SafeBallot Logo Header -->
        <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #080E1D;">
            <img
                src="${logoUrl}"
                alt="SafeBallot"
                width="44" height="56"
                style="display: block; margin: 0 auto 10px; line-height: 1; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;"
            />
            <div>
                <h1 style="margin: 0; color: #080E1D; font-size: 28px; font-weight: 700; letter-spacing: 1px;">SAFEBALLOT</h1>
                <p style="margin: 0; color: #6b7280; font-size: 12px; letter-spacing: 2px; font-weight: 500;">-VOTE OUTSIDE THE BOX-</p>
            </div>
        </div>

        <!-- Main Content -->
        <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #263C75; font-size: 24px; margin-bottom: 15px; font-weight: 600;">Verification Code</h2>
            <p style="font-size: 16px; color: #374151; margin-bottom: 30px;">
                Your 4-digit verification code is:
            </p>
            
            <!-- OTP Code Display -->
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 2px solid #080E1D;">
                <h3 style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace; color: #080E1D;">${code}</h3>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
                This code expires in <strong>${OTP_TTL_MINUTES} minutes</strong>
            </p>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                    <strong>Security Notice:</strong> If you didn't request this code, please ignore this email or contact our support team.
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #6b7280; text-align: center;">
            <p style="margin: 0 0 5px 0;">This verification code was sent to ${
              user.email
            }</p>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                    © ${new Date().getFullYear()} SafeBallot. Secure, transparent, and democratic voting platform.
                </p>
            </div>
        </div>
    </div>
</body>
</html>`
    );

    res.json({
      success: true,
      message: "Verification code resent",
      email: user.email,
      ttlMinutes: OTP_TTL_MINUTES,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to resend verification code" });
  }
};
