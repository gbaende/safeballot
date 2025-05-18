/**
 * Debug utilities for token and authentication issues
 */

import axios from "axios";

/**
 * Log the current state of all tokens in localStorage
 */
export function debugTokens() {
  console.group("🔍 TOKEN DEBUG");

  // Check for voter token
  const voterToken = localStorage.getItem("voterToken");
  console.log(
    "Voter Token:",
    voterToken ? `${voterToken.substring(0, 15)}...` : "NOT FOUND"
  );

  // Check for admin token
  const adminToken = localStorage.getItem("adminToken");
  console.log(
    "Admin Token:",
    adminToken ? `${adminToken.substring(0, 15)}...` : "NOT FOUND"
  );

  // Check for other relevant keys
  console.log("All localStorage keys:");
  Object.keys(localStorage).forEach((key) => {
    console.log(`- ${key}: ${key.includes("Token") ? "TOKEN DATA" : "Found"}`);
  });

  console.groupEnd();
}

/**
 * Verify that a token is valid by testing it against the validate-token endpoint
 * @param {string} tokenType - 'voter' or 'admin'
 * @returns {Promise<boolean>} True if token is valid
 */
export async function verifyToken(tokenType = "voter") {
  const tokenKey = tokenType === "voter" ? "voterToken" : "adminToken";
  const token = localStorage.getItem(tokenKey);

  if (!token) {
    console.error(`⛔ No ${tokenType} token found in localStorage`);
    return false;
  }

  console.log(`🔍 Verifying ${tokenType} token: ${token.substring(0, 10)}...`);

  try {
    const response = await axios.get("/api/auth/validate-token", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data.status === "success") {
      console.log(`✅ ${tokenType} token is valid:`, response.data.data);
      return true;
    } else {
      console.error(`❌ ${tokenType} token validation failed:`, response.data);
      return false;
    }
  } catch (error) {
    console.error(
      `❌ ${tokenType} token validation error:`,
      error.response?.data || error.message
    );
    return false;
  }
}

/**
 * Perform a test request to a protected endpoint to verify token usage
 * @param {string} url - URL to test
 * @param {string} tokenType - 'voter' or 'admin'
 * @returns {Promise<object>} Response data or error
 */
export async function testProtectedRequest(url, tokenType = "voter") {
  console.log(`🧪 Testing protected request to ${url} with ${tokenType} token`);

  const tokenKey = tokenType === "voter" ? "voterToken" : "adminToken";
  const token = localStorage.getItem(tokenKey);

  if (!token) {
    console.error(`⛔ No ${tokenType} token available for test`);
    return { success: false, error: "No token available" };
  }

  try {
    console.log(`📤 Sending request with token: ${token.substring(0, 10)}...`);

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`✅ Request succeeded:`, response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`❌ Request failed:`, error.response?.data || error.message);

    // Show header info for debugging
    if (error.config) {
      console.log("Request headers:", error.config.headers);
    }

    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status,
    };
  }
}

/**
 * Check and repair token issues
 * @returns {Promise<boolean>} True if repairs were made
 */
export async function checkAndRepairTokens() {
  console.group("🔧 TOKEN REPAIR");
  let repairsNeeded = false;

  // Check for voter token
  const voterToken = localStorage.getItem("voterToken");
  const voterInfo = localStorage.getItem("voterInfo");

  // If we have voterInfo but no token, something's wrong
  if (!voterToken && voterInfo) {
    console.warn(
      "⚠️ Found voter info but no voter token - possible inconsistency"
    );
    repairsNeeded = true;

    // Try to validate token stored elsewhere
    const voterInfoObj = JSON.parse(voterInfo);
    const ballotSpecificInfo = localStorage.getItem(
      `voter_info_${voterInfoObj.ballotId}`
    );

    if (ballotSpecificInfo) {
      console.log("🔍 Found ballot-specific voter info");
    }
  }

  // Look for other potential token locations
  ["token", "jwt", "auth", "access"].forEach((key) => {
    const potentialToken = localStorage.getItem(key);
    if (
      potentialToken &&
      (potentialToken.startsWith("ey") || potentialToken.includes("."))
    ) {
      console.log(`🔍 Found possible token in key: ${key}`);
      console.log(`Token: ${potentialToken.substring(0, 15)}...`);
      repairsNeeded = true;
    }
  });

  // Check for admin/voter role confusion
  if (voterToken && localStorage.getItem("adminToken")) {
    console.log(
      "⚠️ Both voter and admin tokens present - potential role confusion"
    );
  }

  // Check URL to see which token should be used
  const currentPath = window.location.pathname;
  if (currentPath.includes("/vote") && !voterToken) {
    console.warn("⚠️ On voter path but no voter token found");
    repairsNeeded = true;
  }

  console.log(`🔧 Repairs needed: ${repairsNeeded ? "YES" : "NO"}`);
  console.groupEnd();
  return repairsNeeded;
}

/**
 * Monitor localStorage changes
 * @param {Array<string>} keysToWatch - Keys to monitor
 */
export function monitorLocalStorage(
  keysToWatch = ["voterToken", "adminToken", "voterInfo"]
) {
  console.log(
    `🔍 Starting localStorage monitoring for keys: ${keysToWatch.join(", ")}`
  );

  // Store initial values
  const initialValues = {};
  keysToWatch.forEach((key) => {
    initialValues[key] = localStorage.getItem(key);
  });

  // Check for changes every second
  const intervalId = setInterval(() => {
    let changes = false;

    keysToWatch.forEach((key) => {
      const currentValue = localStorage.getItem(key);
      if (currentValue !== initialValues[key]) {
        const action = currentValue
          ? initialValues[key]
            ? "CHANGED"
            : "ADDED"
          : "REMOVED";
        console.log(`⚡ ${key}: ${action}`);

        if (currentValue && (key.includes("Token") || key.includes("token"))) {
          console.log(`New value: ${currentValue.substring(0, 15)}...`);
        } else if (currentValue) {
          console.log(`New value exists (length: ${currentValue.length})`);
        }

        initialValues[key] = currentValue;
        changes = true;
      }
    });

    if (changes) {
      console.log("📦 localStorage updated at", new Date().toISOString());
    }
  }, 1000);

  // Return function to stop monitoring
  return () => {
    clearInterval(intervalId);
    console.log("🛑 localStorage monitoring stopped");
  };
}

/**
 * Token Validation Debug Utility
 * Call directly from browser console for debugging token issues
 */

// Validate a token's format and try to decode it
function validateToken(token) {
  if (!token) {
    console.error("❌ No token provided");
    return { valid: false, reason: "Token is null or undefined" };
  }

  // Check if the token has the correct format (3 parts separated by dots)
  const parts = token.split(".");
  if (parts.length !== 3) {
    console.error(
      "❌ Invalid token format: Not a standard JWT (should have 3 parts)"
    );
    return { valid: false, reason: "Not a valid JWT format" };
  }

  try {
    // Try to decode the payload (middle part)
    const payload = JSON.parse(atob(parts[1]));
    console.log("✅ Token successfully decoded:", payload);

    // Check for critical fields
    if (!payload.sub) console.warn("⚠️ Token missing subject (sub) claim");
    if (!payload.exp) console.warn("⚠️ Token missing expiration (exp) claim");
    if (!payload.role) console.warn("⚠️ Token missing role claim");

    // Check if the token has expired
    if (payload.exp && payload.exp < Date.now() / 1000) {
      console.error("❌ Token has expired", new Date(payload.exp * 1000));
      return { valid: false, reason: "Token expired", payload };
    }

    return { valid: true, payload };
  } catch (error) {
    console.error("❌ Error decoding token:", error);
    return { valid: false, reason: "Error decoding token payload", error };
  }
}

// Test a request with the current voter token
async function testVoterRequest(url = "/api/ballots/1/register-voter") {
  console.group("🧪 Testing voter request to: " + url);

  const voterToken = localStorage.getItem("voterToken");
  if (!voterToken) {
    console.error("❌ No voter token in localStorage!");
    console.groupEnd();
    return { success: false, error: "No voter token found" };
  }

  console.log(`🔑 Using token: ${voterToken.substring(0, 15)}...`);

  // Validate token first
  const validation = validateToken(voterToken);
  if (!validation.valid) {
    console.error("❌ Token validation failed:", validation.reason);
    console.groupEnd();
    return { success: false, error: "Invalid token", details: validation };
  }

  try {
    // Make a test request with explicit authorization header
    const response = await fetch(url, {
      method: "GET", // Use GET for testing as it's safer
      headers: {
        Authorization: `Bearer ${voterToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`📡 Response status: ${response.status}`);

    if (response.ok) {
      console.log("✅ Request succeeded!");
      const data = await response.json();
      console.log("📦 Response data:", data);
      console.groupEnd();
      return { success: true, data };
    } else {
      console.error("❌ Request failed with status:", response.status);
      try {
        const errorData = await response.json();
        console.error("Error details:", errorData);
        console.groupEnd();
        return { success: false, status: response.status, error: errorData };
      } catch (e) {
        console.error("Could not parse error response");
        console.groupEnd();
        return { success: false, status: response.status };
      }
    }
  } catch (error) {
    console.error("❌ Request error:", error);
    console.groupEnd();
    return { success: false, error: error.message };
  }
}

// Temporarily make these functions available globally for console debugging
window.validateToken = validateToken;
window.testVoterRequest = testVoterRequest;
window.debugVoterToken = () => {
  const token = localStorage.getItem("voterToken");
  validateToken(token);
  return token ? token.substring(0, 20) + "..." : "No token found";
};
