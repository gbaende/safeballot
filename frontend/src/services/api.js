import axios from "axios";

// Hardcode the API URL to ensure it works
const API_URL = "http://localhost:8080/api";

// Cache to prevent duplicate API calls
const requestCache = new Map();
const cacheTimeout = 5000; // 5 seconds

// Create a configured axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Clear cache after timeout
const clearCacheAfterTimeout = (url, timeout) => {
  setTimeout(() => {
    requestCache.delete(url);
    console.log(`Cache cleared for ${url}`);
  }, timeout);
};

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    console.log("API Request to:", config.url);

    // List of public endpoints that don't need authentication
    const publicEndpoints = [
      "/health",
      "/auth/login",
      "/auth/register",
      "/auth/refresh-token",
      "/auth/verify-email",
      "/auth/reset-password",
    ];

    // Voter-specific endpoints that use voter tokens instead of admin tokens
    const voterEndpoints = ["/ballots/:id/vote", "/voter/"];

    // Check if the current request is to a public endpoint
    let isPublicEndpoint = publicEndpoints.some((endpoint) =>
      config.url.includes(endpoint)
    );

    // Check if this is a voter-specific endpoint
    let isVoterEndpoint = false;
    for (const endpoint of voterEndpoints) {
      if (config.url.includes(endpoint) || config.isVoterRequest) {
        isVoterEndpoint = true;
        isPublicEndpoint = false; // Not public, but uses different auth
        break;
      }
    }

    // Debug log to help trace authentication issues
    console.log(
      `Request to ${config.url} - isPublic: ${isPublicEndpoint}, isVoter: ${isVoterEndpoint}`
    );

    // Check for cached response for GET requests to prevent duplicates
    if (config.method === "get") {
      const cacheKey = `${config.url}`;
      if (requestCache.has(cacheKey)) {
        console.log(`Using cached response for ${config.url}`);
        // Mark this request as cached to handle in the adapter
        config.adapter = function (config) {
          return Promise.resolve({
            data: requestCache.get(cacheKey),
            status: 200,
            statusText: "OK",
            headers: {},
            config: config,
            request: {},
          });
        };
        return config;
      }
    }

    // For voter endpoints, use voter token instead of admin token
    if (isVoterEndpoint) {
      const voterToken = localStorage.getItem("voterToken");
      if (voterToken) {
        if (voterToken.startsWith("Bearer ")) {
          config.headers.Authorization = voterToken;
        } else {
          config.headers.Authorization = `Bearer ${voterToken}`;
        }
        console.log("Using voter token for endpoint");
      } else {
        // No voter token - let the request proceed, the backend will validate access
        console.log("No voter token available for endpoint");
      }
    }
    // For non-public, non-voter endpoints, use admin token
    else if (!isPublicEndpoint) {
      const token = localStorage.getItem("adminToken");
      console.log(
        "Admin token in request interceptor:",
        token ? `${token.substring(0, 15)}...` : "none"
      );

      if (token) {
        // Ensure proper Bearer format - check if token already has Bearer prefix
        if (token.startsWith("Bearer ")) {
          config.headers.Authorization = token; // Token already includes "Bearer "
          console.log("Using token with existing Bearer prefix");
        } else {
          config.headers.Authorization = `Bearer ${token}`;
          console.log("Added Bearer prefix to token");
        }

        // Log the formatted auth header (partially)
        const authHeader = config.headers.Authorization;
        if (authHeader && authHeader.length > 25) {
          console.log(
            "Authorization header format:",
            authHeader.substring(0, 10) +
              "..." +
              authHeader.substring(authHeader.length - 10)
          );
        }
      } else {
        console.warn(
          "No admin token found for request to non-public endpoint:",
          config.url
        );
      }
    } else {
      console.log("Public endpoint, not adding auth token:", config.url);
    }

    // Log the headers being sent (without showing full token)
    const headers = { ...config.headers };
    if (headers.Authorization) {
      headers.Authorization = headers.Authorization.substring(0, 20) + "...";
    }
    console.log("Request headers:", headers);

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log(
      `Response from ${response.config.url} - Status: ${response.status}`
    );

    // Add debugging for date fields
    if (response.data && response.data.data) {
      console.log("Response data type:", typeof response.data.data);

      // For ballots endpoint, check date fields
      if (response.config.url.includes("/ballots")) {
        if (
          Array.isArray(response.data.data) &&
          response.data.data.length > 0
        ) {
          const firstItem = response.data.data[0];
          console.log("First item date fields:", {
            startDate: firstItem.startDate,
            startDate_type: typeof firstItem.startDate,
            endDate: firstItem.endDate,
            endDate_type: typeof firstItem.endDate,
            createdAt: firstItem.createdAt,
            updatedAt: firstItem.updatedAt,
          });
        } else if (
          typeof response.data.data === "object" &&
          response.data.data !== null
        ) {
          // Single item response
          const item = response.data.data;
          console.log("Single item date fields:", {
            startDate: item.startDate,
            startDate_type: typeof item.startDate,
            endDate: item.endDate,
            endDate_type: typeof item.endDate,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          });
        }
      }
    }

    // Cache successful GET responses
    if (response.config.method === "get" && response.status === 200) {
      const cacheKey = `${response.config.url}`;
      requestCache.set(cacheKey, response.data);
      clearCacheAfterTimeout(cacheKey, cacheTimeout);
      console.log(`Cached response for ${response.config.url}`);
    }

    return response;
  },
  (error) => {
    console.error("API Error Response:", {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    });

    // Handle unauthorized errors (401)
    if (error.response && error.response.status === 401) {
      console.warn("401 Unauthorized - Token may be invalid or expired");

      // List of public endpoints that shouldn't trigger redirect
      const publicEndpoints = [
        "/health",
        "/auth/login",
        "/auth/register",
        "/auth/refresh-token",
        "/auth/verify-email",
        "/auth/reset-password",
      ];

      // Check if the current request is to a public endpoint
      const isPublicEndpoint = publicEndpoints.some((endpoint) =>
        error.config.url.includes(endpoint)
      );

      // Prevent infinite redirect loops by checking URL
      const isAuthEndpoint =
        error.config.url.includes("/login") ||
        error.config.url.includes("/register") ||
        error.config.url.includes("/refresh-token");

      // Only clear token and redirect if:
      // 1. Not a public endpoint
      // 2. Not already on an auth endpoint
      // 3. Not already redirected
      if (
        !isPublicEndpoint &&
        !isAuthEndpoint &&
        !localStorage.getItem("auth_redirect_in_progress") &&
        window.location.pathname !== "/login"
      ) {
        // To fix token issues, let's refresh the token instead of immediate logout
        console.log("Attempting to refresh authentication...");

        // Get token refresh in progress flag
        const isRefreshing = localStorage.getItem("token_refresh_in_progress");

        if (!isRefreshing) {
          // Set refresh in progress flag
          localStorage.setItem("token_refresh_in_progress", "true");

          // Clear it after 5 seconds to prevent deadlock
          setTimeout(() => {
            localStorage.removeItem("token_refresh_in_progress");
          }, 5000);

          // Try to refresh token or fallback to redirect
          const refreshToken = localStorage.getItem("refreshToken");
          if (refreshToken) {
            console.log("Using refresh token to get new access token");
            // Attempt token refresh logic here
            // On failure, proceed with logout redirect
          } else {
            // No refresh token available, proceed with logout
            handleLogout();
          }
        } else {
          console.log("Token refresh already in progress, waiting...");
        }
      } else if (isPublicEndpoint) {
        console.log("Ignoring 401 for public endpoint:", error.config.url);
      }
    }
    return Promise.reject(error);
  }
);

// Helper functions for token management
const setAuthToken = (token, user) => {
  if (user.role === "admin") {
    localStorage.setItem("adminToken", token);
    localStorage.setItem("adminUser", JSON.stringify(user));
    console.log("Admin token and user stored in localStorage");
  } else if (user.role === "voter") {
    localStorage.setItem("voterToken", token);
    localStorage.setItem("voterUser", JSON.stringify(user));
    console.log("Voter token and user stored in localStorage");
  }
};

const clearAuthToken = (role) => {
  if (role === "admin" || role === "all") {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    console.log("Admin token and user removed from localStorage");
  }

  if (role === "voter" || role === "all") {
    localStorage.removeItem("voterToken");
    localStorage.removeItem("voterUser");
    console.log("Voter token and user removed from localStorage");
  }
};

// Helper function for logout handling
const handleLogout = (role = "all") => {
  // Set a flag to prevent multiple redirects
  localStorage.setItem("auth_redirect_in_progress", "true");

  // Clear tokens based on role
  clearAuthToken(role);

  localStorage.removeItem("token_refresh_in_progress");

  // Redirect to login - use setTimeout to ensure this only happens once
  setTimeout(() => {
    if (role === "voter") {
      window.location.href = "/voter/login";
    } else {
      window.location.href = "/login";
    }
    // Remove the flag after navigation starts
    localStorage.removeItem("auth_redirect_in_progress");
  }, 100);
};

// Authentication services
export const authService = {
  // Admin authentication services
  adminLogin: (email, password) => {
    return api
      .post("/auth/login", { email, password, role: "admin" })
      .then((response) => {
        if (response.data && response.data.data) {
          const { token, user } = response.data.data;
          setAuthToken(token, user);
        }
        return response;
      });
  },
  adminRegister: (userData) => {
    return api
      .post("/auth/register", { ...userData, role: "admin" })
      .then((response) => {
        if (response.data && response.data.data) {
          const { token, user } = response.data.data;
          setAuthToken(token, user);
        }
        return response;
      });
  },
  adminLogout: () => {
    api.post("/auth/logout").finally(() => {
      handleLogout("admin");
    });
  },

  // Voter authentication services
  voterLogin: (email, password) => {
    return api
      .post("/auth/login", { email, password, role: "user" })
      .then((response) => {
        if (response.data && response.data.data) {
          const { token, user } = response.data.data;
          setAuthToken(token, user);
        }
        return response;
      });
  },
  // Enhanced voter registration with fallback to fetch
  voterRegister: async (userData) => {
    console.log("Voter registration payload:", userData);
    try {
      console.log("Attempting voter registration with Axios");
      // Try with Axios first
      const axiosResponse = await api.post("/auth/register", {
        ...userData,
        role: "user",
      });
      console.log("Axios voter registration successful:", axiosResponse);

      // Store token as voter token
      if (axiosResponse.data && axiosResponse.data.data) {
        const { token, user } = axiosResponse.data.data;
        setAuthToken(token, user);
      }

      return axiosResponse;
    } catch (axiosError) {
      console.error(
        "Axios voter registration failed, trying with fetch:",
        axiosError
      );

      // If Axios fails, try with direct fetch as backup
      try {
        console.log(
          "Attempting direct voter registration with fetch to:",
          `${API_URL}/auth/register`
        );
        const fetchResponse = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...userData, role: "user" }),
          credentials: "include",
        });

        const responseText = await fetchResponse.text();
        console.log("Raw fetch response:", responseText);

        let responseData;
        try {
          responseData = JSON.parse(responseText);

          // Store token as voter token
          if (responseData && responseData.data && responseData.data.token) {
            setAuthToken(responseData.data.token, responseData.data.user);
          }
        } catch (jsonError) {
          console.error("Failed to parse JSON response:", jsonError);
          responseData = { message: "Failed to parse server response" };
        }

        console.log("Direct fetch response status:", fetchResponse.status);
        console.log("Direct fetch response data:", responseData);

        if (!fetchResponse.ok) {
          console.error("Direct fetch registration failed:", responseData);
          console.error("Response status:", fetchResponse.status);
          throw new Error(
            `Registration failed: ${
              responseData.message || responseData.error || "Unknown error"
            }`
          );
        }

        return {
          status: fetchResponse.status,
          data: responseData,
        };
      } catch (fetchError) {
        console.error("Both Axios and fetch registration attempts failed");
        console.error("Fetch error details:", fetchError.message);
        throw fetchError;
      }
    }
  },
  voterLogout: () => {
    api.post("/auth/logout").finally(() => {
      handleLogout("voter");
    });
  },

  // Common auth services
  logout: () => {
    api.post("/auth/logout").finally(() => {
      handleLogout();
    });
  },

  // Standard auth services
  refreshToken: (refreshToken) =>
    api.post("/auth/refresh-token", { refresh_token: refreshToken }),
  verifyEmail: (verificationToken) =>
    api.post("/auth/verify-email", { token: verificationToken }),
  requestPasswordReset: (email) =>
    api.post("/auth/reset-password/request", { email }),
  confirmPasswordReset: (token, newPassword) =>
    api.post("/auth/reset-password/confirm", { token, password: newPassword }),

  // Legacy register - will be removed after migration
  register: (userData) => {
    console.warn(
      "Legacy register method used - update to adminRegister or voterRegister"
    );
    return api.post("/auth/register", userData).then((response) => {
      if (response.data && response.data.data) {
        const { token, user } = response.data.data;
        // Store token based on role
        setAuthToken(token, user);
      }
      return response;
    });
  },

  // Standard login method - defaults to admin login if role not specified
  login: (email, password, role = "admin") => {
    console.warn(
      "Legacy login method used - consider using adminLogin or voterLogin"
    );
    return api
      .post("/auth/login", { email, password, role })
      .then((response) => {
        if (response.data && response.data.data) {
          const { token, user } = response.data.data;
          setAuthToken(token, user);
        }
        return response;
      });
  },

  // Voter verification methods
  verifyIdentity: (userId) =>
    api.post("/auth/verify/identity", { user_id: userId }),
  verifyDocument: (documentData) =>
    api.post("/auth/verify/document", documentData),
  sendOTP: (email) => api.post("/auth/verify/send-otp", { email }),
  verifyOTP: (email, code) => api.post("/auth/verify/otp", { email, code }),
  generateDigitalKey: (email, ballotId) =>
    api.post("/auth/verify/digital-key", { email, ballot_id: ballotId }),
};

// Ballot services
export const ballotService = {
  getBallots: () => api.get("/ballots"),
  getBallotById: (id) => api.get(`/ballots/${id}`),
  createBallot: (ballotData) => {
    // Make sure date fields use camelCase naming (startDate, endDate)
    const formattedData = { ...ballotData };

    // Convert snake_case to camelCase if needed
    if (formattedData.start_date && !formattedData.startDate) {
      formattedData.startDate = formattedData.start_date;
      delete formattedData.start_date;
    }

    if (formattedData.end_date && !formattedData.endDate) {
      formattedData.endDate = formattedData.end_date;
      delete formattedData.end_date;
    }

    console.log(
      "Sending ballot data with properly formatted dates:",
      formattedData
    );
    return api.post("/ballots", formattedData);
  },
  updateBallot: (id, ballotData) => {
    // Make sure date fields use camelCase naming (startDate, endDate)
    const formattedData = { ...ballotData };

    // Convert snake_case to camelCase if needed
    if (formattedData.start_date && !formattedData.startDate) {
      formattedData.startDate = formattedData.start_date;
      delete formattedData.start_date;
    }

    if (formattedData.end_date && !formattedData.endDate) {
      formattedData.endDate = formattedData.end_date;
      delete formattedData.end_date;
    }

    return api.put(`/ballots/${id}`, formattedData);
  },
  deleteBallot: (id) => api.delete(`/ballots/${id}`),

  // Register the current user as a voter for a ballot
  registerVoter: (ballotId) => api.post(`/ballots/${ballotId}/register-voter`),

  // Ballot questions
  getQuestions: (ballotId) => api.get(`/ballots/${ballotId}/questions`),
  createQuestion: (ballotId, questionData) =>
    api.post(`/ballots/${ballotId}/questions`, questionData),

  // Ballot voters
  getVoters: (ballotId) => api.get(`/ballots/${ballotId}/voters`),
  addVoters: (ballotId, voterData) =>
    api.post(`/ballots/${ballotId}/voters`, voterData),
  removeVoter: (ballotId, voterId) =>
    api.delete(`/ballots/${ballotId}/voters/${voterId}`),

  // Voting
  castVote: (ballotId, voteData) =>
    api.post(`/ballots/${ballotId}/vote`, voteData),

  // Results
  getResults: (ballotId) => api.get(`/ballots/${ballotId}/results`),
};

// Election services
export const electionService = {
  getSummary: () => api.get("/elections/summary"),
  getRecentElections: () => api.get("/elections/recent"),
  getUpcomingElections: () => api.get("/elections/upcoming"),
  getElectionStatus: (id) => api.get(`/elections/status?id=${id}`),
  startElection: (id) => api.post(`/elections/start?id=${id}`),
  endElection: (id) => api.post(`/elections/end?id=${id}`),
};

// User services
export const userService = {
  getUsers: () => api.get("/users"),
  getProfile: () => api.get("/users/profile"),
  updateProfile: (userData) => api.put("/users/profile", userData),
  changePassword: (passwordData) =>
    api.post("/users/change-password", passwordData),
  createUser: (userData) => api.post("/users", userData),
  getUser: (id) => api.get(`/users/${id}`),
};

export default api;
