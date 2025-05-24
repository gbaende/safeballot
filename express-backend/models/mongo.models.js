/**
 * MongoDB models for user authentication and OTP
 */

const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

/**
 * User schema for MongoDB authentication
 * Mirrors the SQL User model but stores in MongoDB
 */
const userSchema = new mongoose.Schema({
  // ID from SQL database or generated for MongoDB
  sqlId: {
    type: String,
    required: false,
    index: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "user", "voter"],
    default: "voter",
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  refreshToken: {
    type: String,
    required: false,
  },
  ballotId: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * OTP schema for storing verification codes
 * Uses MongoDB TTL index to automatically expire codes
 */
const otpSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    index: true,
  },
  code: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // Automatically expire after 5 minutes (300 seconds)
  },
});

// Create indexes
userSchema.index({ email: 1 }, { unique: true });
otpSchema.index({ userId: 1 }, { unique: true });
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

// Models
const MongoUser = mongoose.model("User", userSchema);
const OTP = mongoose.model("OTP", otpSchema);

module.exports = {
  MongoUser,
  OTP,
};
