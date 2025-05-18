/**
 * This file provides examples of authentication utilities for the frontend
 * to implement proper token and session management.
 */

import axios from "axios";
import api from "./api";

// Setup axios interceptors for role-based token handling
export const setupAuthInterceptors = () => {
  axios.interceptors.request.use((config) => {
    // Determine route type using the getAuthTokenForRequest helper
    const token = getAuthTokenForRequest(config.url);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`🔑 Auth token set for ${config.url}`);
    }

    return config;
  });
};

/**
 * Global logout function that cleans up all auth tokens
 * This ensures a clean slate regardless of which role was active
 */
export function logout() {
  // Clear all tokens and related data
  localStorage.removeItem("adminToken");
  localStorage.removeItem("voterToken");
  localStorage.removeItem("voterInfo");

  // Also clear any refresh tokens
  localStorage.removeItem("adminRefreshToken");
  localStorage.removeItem("voterRefreshToken");

  // Clear any other auth-related data
  localStorage.removeItem("currentUser");
  localStorage.removeItem("authState");

  console.log("All authentication tokens cleared");

  // Return promise for async compatibility
  return Promise.resolve({ success: true });
}

/**
 * Role-specific logout functions
 * These still clear all tokens to prevent stale credentials
 */
export function logoutAdmin() {
  console.log("Admin logout requested");
  return logout().then(() => {
    // Additional admin-specific cleanup if needed
    return { success: true, role: "admin" };
  });
}

export function logoutVoter() {
  console.log("Voter logout requested");
  return logout().then(() => {
    // Additional voter-specific cleanup if needed
    return { success: true, role: "voter" };
  });
}

/**
 * Login as admin user
 */
export async function loginAdmin(email, password) {
  try {
    const response = await api.post("/auth/login", {
      email,
      password,
      role: "admin",
    });

    if (response.data.status === "success") {
      // Store the token
      localStorage.setItem("adminToken", response.data.data.token);

      // Store refresh token if available
      if (response.data.data.refreshToken) {
        localStorage.setItem(
          "adminRefreshToken",
          response.data.data.refreshToken
        );
      }

      console.log("Admin login successful");
      return { success: true, user: response.data.data.user };
    }

    return { success: false, error: "Login failed" };
  } catch (error) {
    console.error("Admin login error:", error);
    return {
      success: false,
      error: error.response?.data?.message || "Login failed",
    };
  }
}

/**
 * Register as voter with access key
 */
export async function registerVoter(accessKey, name, email) {
  try {
    const response = await api.post("/ballots/register-with-key", {
      accessKey,
      name,
      email,
    });

    if (response.data.status === "success") {
      // Store the token
      localStorage.setItem("voterToken", response.data.data.token);

      // Store voter info
      localStorage.setItem(
        "voterInfo",
        JSON.stringify({
          id: response.data.data.voter.id,
          name: response.data.data.voter.name,
          email: response.data.data.voter.email,
          ballotId: response.data.data.ballot.id,
        })
      );

      console.log("Voter registration successful");
      return {
        success: true,
        voter: response.data.data.voter,
        ballot: response.data.data.ballot,
      };
    }

    return { success: false, error: "Registration failed" };
  } catch (error) {
    console.error("Voter registration error:", error);
    return {
      success: false,
      error: error.response?.data?.message || "Registration failed",
    };
  }
}

/**
 * Check which role is currently active based on tokens
 */
export function checkActiveRole() {
  const hasAdminToken = !!localStorage.getItem("adminToken");
  const hasVoterToken = !!localStorage.getItem("voterToken");

  if (hasAdminToken && hasVoterToken) {
    return { hasMultipleRoles: true, roles: ["admin", "voter"] };
  } else if (hasAdminToken) {
    return { role: "admin" };
  } else if (hasVoterToken) {
    return { role: "voter" };
  }

  return { role: "guest" };
}

/**
 * Add token refresh capability
 */
export async function refreshToken(tokenType = "admin") {
  const refreshToken = localStorage.getItem(`${tokenType}RefreshToken`);
  if (!refreshToken) {
    console.error(`No refresh token found for ${tokenType}`);
    return false;
  }

  try {
    // Determine the correct endpoint
    const endpoint =
      tokenType === "voter"
        ? "/auth/refresh-voter-token"
        : "/auth/refresh-token";

    const response = await api.post(endpoint, {
      refresh_token: refreshToken,
    });

    if (response.data.status === "success") {
      // Store the new tokens
      localStorage.setItem(`${tokenType}Token`, response.data.data.token);
      localStorage.setItem(
        `${tokenType}RefreshToken`,
        response.data.data.refreshToken
      );

      console.log(`${tokenType} token refreshed successfully`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Failed to refresh ${tokenType} token:`, error);
    return false;
  }
}

/**
 * Gets the appropriate auth token based on the request URL
 * @param {string} url - The API endpoint URL
 * @returns {string|null} The appropriate auth token or null if none found
 */
export function getAuthTokenForRequest(url) {
  // Define route patterns that should use voter token
  const voterRoutePatterns = [
    "/register-voter",
    "/voter-vote",
    "/ballots/vote",
    "/vote/",
    "/preregister",
    "/ballot/access",
  ];

  // Check if the URL matches any voter routes
  const isVoterRoute = voterRoutePatterns.some((pattern) =>
    url.includes(pattern)
  );

  // Get tokens from storage
  const voterToken = localStorage.getItem("voterToken");
  const adminToken = localStorage.getItem("adminToken");

  // Determine which token to use
  if (isVoterRoute && voterToken) {
    console.log(`🗳️ Using voter token for route: ${url}`);
    return voterToken;
  } else if (adminToken) {
    console.log(`👑 Using admin token for route: ${url}`);
    return adminToken;
  }

  // Log warning if trying to access protected route without token
  if (isVoterRoute) {
    console.warn(`⚠️ Voter route ${url} but NO VOTER TOKEN available!`);
  }

  // Return null if no appropriate token found
  return null;
}

/**
 * Check if voter is authenticated
 * @returns {boolean} True if voter is authenticated
 */
export function isVoterAuthenticated() {
  return !!localStorage.getItem("voterToken");
}

/**
 * Check if admin is authenticated
 * @returns {boolean} True if admin is authenticated
 */
export function isAdminAuthenticated() {
  return !!localStorage.getItem("adminToken");
}

/**
 * Get voter information
 * @returns {Object|null} Voter info object or null if not authenticated
 */
export function getVoterInfo() {
  const infoString = localStorage.getItem("voterInfo");
  try {
    return infoString ? JSON.parse(infoString) : null;
  } catch (e) {
    console.error("Error parsing voter info:", e);
    return null;
  }
}

// Debug function to check token in localStorage
export function logTokenStatus() {
  const voterToken = localStorage.getItem("voterToken");
  const adminToken = localStorage.getItem("adminToken");
  const voterInfo = localStorage.getItem("voterInfo");

  console.group("🔍 Token Status Check");
  console.log(`Voter Token: ${voterToken ? "Present" : "Missing"}`);
  if (voterToken) {
    console.log(`- Token preview: ${voterToken.substring(0, 15)}...`);
  }

  console.log(`Admin Token: ${adminToken ? "Present" : "Missing"}`);
  if (adminToken) {
    console.log(`- Token preview: ${adminToken.substring(0, 15)}...`);
  }

  console.log(`Voter Info: ${voterInfo ? "Present" : "Missing"}`);
  if (voterInfo) {
    try {
      const info = JSON.parse(voterInfo);
      console.log(`- Name: ${info.name}`);
      console.log(`- Email: ${info.email}`);
      console.log(`- Voter ID: ${info.voterId}`);
      console.log(`- Ballot ID: ${info.ballotId}`);
    } catch (e) {
      console.error("Error parsing voter info JSON:", e);
    }
  }
  console.groupEnd();

  return {
    hasVoterToken: !!voterToken,
    hasAdminToken: !!adminToken,
    hasVoterInfo: !!voterInfo,
  };
}
