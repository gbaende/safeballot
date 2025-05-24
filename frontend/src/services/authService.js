import api from "./api";

/**
 * Get the authentication header for API requests
 * @returns {Promise<Object>} The authentication header
 */
export const getAuthHeader = async () => {
  // Try multiple token sources in order of priority
  const token =
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("voterToken");

  if (!token) {
    console.warn("No authentication token found");
    return null;
  }

  // Make sure token is properly formatted
  const authHeader = token.startsWith("Bearer ")
    ? { Authorization: token }
    : { Authorization: `Bearer ${token}` };

  return authHeader;
};

/**
 * Sign in user with email and password, which may trigger OTP flow
 * @param {string} email User email
 * @param {string} password User password
 * @returns {Promise<Object>} Response with token or OTP info
 */
export const signIn = async (email, password) => {
  try {
    const response = await api.post("/auth/sign-in", { email, password });

    // If OTP is not required, store token directly
    if (response.data.success && !response.data.otpRequired) {
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    }

    return response.data;
  } catch (error) {
    console.error("Sign-in error:", error);
    throw error;
  }
};

/**
 * Voter-specific login with email and password
 * @param {string} email Voter email
 * @param {string} password Voter password
 * @returns {Promise<Object>} Response with token or OTP info
 */
export const voterLogin = async (email, password) => {
  try {
    console.log("Calling voter sign-in endpoint with:", { email });
    const response = await api.post("/auth/voter/sign-in", {
      email,
      password,
    });

    console.log("Voter sign-in response:", response.data);

    // If OTP is not required, store voter token directly
    if (response.data.success && !response.data.otpRequired) {
      const { token, voter } = response.data;
      localStorage.setItem("voterToken", token);
      localStorage.setItem("voter", JSON.stringify(voter));
    }

    return response.data;
  } catch (error) {
    console.error("Voter login error:", error);
    throw error;
  }
};

/**
 * Verify OTP code
 * @param {string} userId User ID
 * @param {string} code 4-digit OTP code
 * @returns {Promise<Object>} Response with token and user info
 */
export const verifyOtp = async (userId, code) => {
  try {
    const response = await api.post("/auth/verify-otp", {
      userId,
      code,
    });

    return response.data;
  } catch (error) {
    console.error("OTP verification error:", error);
    throw error;
  }
};

/**
 * Resend OTP code
 * @param {string} userId User ID
 * @returns {Promise<Object>} Response with success status
 */
export const resendOtp = async (userId) => {
  try {
    const response = await api.post("/auth/resend-otp", { userId });
    return response.data;
  } catch (error) {
    console.error("Resend OTP error:", error);
    throw error;
  }
};
