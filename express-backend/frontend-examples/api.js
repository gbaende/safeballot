import axios from "axios";

/**
 * API Module with Route-Based Token Selection
 *
 * Parallel Session Strategy:
 * - Admin tokens in localStorage as 'adminToken'
 * - Voter tokens in localStorage as 'voterToken'
 * - Route patterns decide which token to attach
 * - No token-clearing between contexts
 * - Supports simultaneous admin & voter tabs
 */

// Create API instance
const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Keywords to identify any voter-related endpoint
const VOTER_KEYWORDS = [
  "/ballots/register-with-key",
  "/register-voter",
  "/voter-vote",
];

// Toggle detailed logging
const DEBUG = true;

/**
 * Returns true if the URL belongs to a voter flow
 */
function isVoterRoute(url) {
  return VOTER_KEYWORDS.some((kw) => url.includes(kw));
}

// REQUEST INTERCEPTOR: attach the correct token based on route
api.interceptors.request.use(
  (config) => {
    if (DEBUG)
      console.group(
        `📡 Request: ${config.method?.toUpperCase()} ${config.url}`
      );

    // Show exactly what we're matching
    const rawUrl = config.url || "";
    const base = api.defaults.baseURL || "";
    const path = rawUrl.startsWith(base) ? rawUrl.slice(base.length) : rawUrl;

    console.log("→ Interceptor sees rawUrl:", rawUrl);
    console.log("→ Normalized path:", path);

    // Decide context
    const routeIsVoter = isVoterRoute(path);
    console.log(`🔍 Route type: ${routeIsVoter ? "VOTER" : "ADMIN/OTHER"}`);

    // Grab tokens
    const voterToken = localStorage.getItem("voterToken");
    const adminToken = localStorage.getItem("adminToken");
    console.log(`🔑 Voter token: ${voterToken ? "FOUND" : "NONE"}`);
    console.log(`👑 Admin token: ${adminToken ? "FOUND" : "NONE"}`);

    let token, tokenSource;

    if (routeIsVoter) {
      if (voterToken) {
        token = voterToken;
        tokenSource = "voter";
        console.log("✅ Using VOTER token for voter route");
      } else {
        console.error(`🚨 NO VOTER TOKEN available for voter route: ${path}`);
      }
    } else if (adminToken) {
      token = adminToken;
      tokenSource = "admin";
      console.log("👑 Using ADMIN token for admin/other route");
    } else {
      console.log(`ℹ️ No token needed or available for route: ${path}`);
    }

    // Attach or remove header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`🔐 Applied ${tokenSource} token`);
      if (DEBUG) {
        console.log(`🔑 Token preview: ${token.substring(0, 15)}...`);
        const parts = token.split(".");
        if (parts.length === 3) {
          try {
            const payload = JSON.parse(atob(parts[1]));
            console.log(`📄 Payload keys: ${Object.keys(payload).join(", ")}`);
            console.log(`🧩 Role: ${payload.role || "unspecified"}`);
          } catch {
            console.error("❌ Could not decode token payload");
          }
        }
      }
    } else if (config.headers.Authorization) {
      console.log("⚠️ Removing Authorization header (no valid token)");
      delete config.headers.Authorization;
    }

    if (DEBUG) {
      console.log("📝 Final request config:", {
        url: config.baseURL + config.url,
        method: config.method?.toUpperCase(),
        headers: {
          ...config.headers,
          Authorization: config.headers.Authorization
            ? `${config.headers.Authorization.substring(0, 20)}...`
            : undefined,
        },
      });
      console.groupEnd();
    }

    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// RESPONSE INTERCEPTOR: handle 401, refresh token, retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.group("🔄 Token refresh flow");
      const rawUrl = originalRequest.url || "";
      const base = api.defaults.baseURL || "";
      const path = rawUrl.startsWith(base) ? rawUrl.slice(base.length) : rawUrl;
      console.log("Original rawUrl:", rawUrl);
      console.log("Normalized path:", path);

      originalRequest._retry = true;
      const routeIsVoter = isVoterRoute(path);
      const tokenType = routeIsVoter ? "voter" : "admin";
      console.log("Refreshing token type:", tokenType);

      try {
        const refreshed = await window.refreshToken?.(tokenType);
        if (refreshed) {
          console.log(`✅ ${tokenType} token refreshed`);
          const newToken = localStorage.getItem(`${tokenType}Token`);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          console.log("🔄 Retrying original request");
          console.groupEnd();
          return api(originalRequest);
        } else {
          console.log("❌ Token refresh failed");
          if (routeIsVoter) {
            console.log("⚠️ Redirect to voter registration");
          } else {
            console.log("⚠️ Redirect to admin login");
          }
        }
      } catch (refreshError) {
        console.error("❌ Refresh error:", refreshError);
      }

      console.groupEnd();
    }
    return Promise.reject(error);
  }
);

export default api;
