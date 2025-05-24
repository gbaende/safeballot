const { OTP } = require("../models/mongo.models");
require("dotenv").config();

// OTP configuration
const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES) || 5;
const MAX_ATTEMPTS = 5;

/**
 * Save OTP code for a user in MongoDB
 * @param {string} userId - User ID
 * @param {string} code - OTP code
 * @param {string} email - User email
 */
const saveOtp = async (userId, code, email) => {
  try {
    // Delete any existing OTP for this user
    await OTP.deleteOne({ userId });

    // Create new OTP document
    const otp = new OTP({
      userId,
      email,
      code,
      attempts: 0,
      createdAt: new Date(),
    });

    await otp.save();
    console.log(`OTP saved for user ${userId} with email ${email}`);
    return true;
  } catch (err) {
    console.error(`Error saving OTP for user ${userId}:`, err);
    return false;
  }
};

/**
 * Get stored OTP for a user
 * @param {string} userId - User ID
 * @returns {string|null} The OTP code or null if expired
 */
const getOtp = async (userId) => {
  try {
    const otp = await OTP.findOne({ userId });
    return otp ? otp.code : null;
  } catch (err) {
    console.error(`Error getting OTP for user ${userId}:`, err);
    return null;
  }
};

/**
 * Delete OTP for a user
 * @param {string} userId - User ID
 */
const deleteOtp = async (userId) => {
  try {
    await OTP.deleteOne({ userId });
    return true;
  } catch (err) {
    console.error(`Error deleting OTP for user ${userId}:`, err);
    return false;
  }
};

/**
 * Track failed attempts
 * @param {string} userId - User ID
 * @returns {number} Number of attempts
 */
const incrementAttempts = async (userId) => {
  try {
    const otp = await OTP.findOne({ userId });
    if (!otp) return MAX_ATTEMPTS; // If no OTP found, return max attempts

    otp.attempts += 1;
    await otp.save();
    return otp.attempts;
  } catch (err) {
    console.error(`Error incrementing attempts for user ${userId}:`, err);
    return MAX_ATTEMPTS; // Return max attempts on error
  }
};

/**
 * Get number of failed attempts
 * @param {string} userId - User ID
 * @returns {number} Number of attempts
 */
const getAttempts = async (userId) => {
  try {
    const otp = await OTP.findOne({ userId });
    return otp ? otp.attempts : 0;
  } catch (err) {
    console.error(`Error getting attempts for user ${userId}:`, err);
    return 0;
  }
};

/**
 * Reset failed attempts counter
 * @param {string} userId - User ID
 */
const resetAttempts = async (userId) => {
  try {
    const otp = await OTP.findOne({ userId });
    if (otp) {
      otp.attempts = 0;
      await otp.save();
    }
    return true;
  } catch (err) {
    console.error(`Error resetting attempts for user ${userId}:`, err);
    return false;
  }
};

/**
 * Generate a random 4-digit OTP code
 * @returns {string} 4-digit code
 */
const generateOtpCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

module.exports = {
  saveOtp,
  getOtp,
  deleteOtp,
  generateOtpCode,
  incrementAttempts,
  getAttempts,
  resetAttempts,
  OTP_TTL_MINUTES,
  MAX_ATTEMPTS,
};
