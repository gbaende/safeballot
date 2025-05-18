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
      "/elections/",
      "/ballots/:id/public-vote",
      "/ballots/:id/public-register-voter",
    ];

    // Voter-specific endpoints that use voter tokens instead of admin tokens
    const voterEndpoints = [
      "/ballots/:id/vote",
      "/voter/",
      "/ballots/:id/voter-vote",
      "/elections/",
    ];

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

      // Skip cache for critical data endpoints or if bypass flag is set
      const skipCache =
        config.url.includes("/ballots") ||
        config.url.includes("/elections") ||
        config.url.includes("/voters") ||
        config.skipCache === true;

      if (!skipCache && requestCache.has(cacheKey)) {
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
      // Try multiple possible token sources
      const token =
        localStorage.getItem("adminToken") || localStorage.getItem("token");
      console.log(
        "Admin token in request interceptor:",
        token ? `${token.substring(0, 15)}...` : "none"
      );

      // Log all available tokens for debugging purposes
      console.log("Available tokens:", {
        adminToken:
          localStorage.getItem("adminToken")?.substring(0, 10) + "..." ||
          "none",
        regularToken:
          localStorage.getItem("token")?.substring(0, 10) + "..." || "none",
        voterToken:
          localStorage.getItem("voterToken")?.substring(0, 10) + "..." ||
          "none",
      });

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
          console.log("First item sample data:", {
            id: firstItem.id,
            title: firstItem.title,
            voters: firstItem.totalVoters || firstItem.total_voters || 0,
            votes: firstItem.ballotsReceived || firstItem.ballots_received || 0,
            startDate: firstItem.startDate,
            startDate_type: typeof firstItem.startDate,
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

    // Detailed error information for debugging
    console.error("Detailed API Error:", {
      request: {
        method: error.config?.method,
        url: error.config?.url,
        headers: error.config?.headers,
        data: error.config?.data,
      },
      response: error.response?.data,
      status: error.response?.status,
      message: error.message,
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

// Helper function to clear all ballot-related data from localStorage
const clearBallotCache = () => {
  console.log("Clearing all ballot data from localStorage");
  localStorage.removeItem("userBallots");
  // Clear any keys that might contain cached ballot data
  Object.keys(localStorage).forEach((key) => {
    if (
      key.includes("ballot") ||
      key.includes("Ballot") ||
      key.includes("election") ||
      key.includes("Election") ||
      key.includes("voter") ||
      key.includes("Voter")
    ) {
      console.log(`Removing cached data: ${key}`);
      localStorage.removeItem(key);
    }
  });
};

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
    // Clear existing ballot data to prevent data from previous sessions persisting
    clearBallotCache();

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
    // Clear existing ballot data to prevent data from previous sessions persisting
    clearBallotCache();

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
    clearBallotCache(); // Clear all ballot cache data
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
    clearBallotCache(); // Clear all ballot cache data
    api.post("/auth/logout").finally(() => {
      handleLogout("voter");
    });
  },

  // Common auth services
  logout: () => {
    clearBallotCache(); // Clear all ballot cache data
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

// Helper function to get auth headers for API requests
const authHeader = () => {
  // Try multiple possible token sources
  const token =
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("voterToken");

  // Return headers with Authorization if token exists
  if (token) {
    return {
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
    };
  }
  return {}; // Return empty object if no token
};

// Ballot services
export const ballotService = {
  getBallots: () => {
    console.log("Getting all ballots...");
    // Remove cached ballots to ensure fresh data
    localStorage.removeItem("userBallots");
    // Add timestamp to prevent caching
    return api.get(`/ballots?_=${Date.now()}`);
  },

  getBallotById: (id) => {
    console.log(`Getting ballot with ID: ${id}`);
    // Add timestamp to prevent caching
    return api.get(`/ballots/${id}?_=${Date.now()}`);
  },

  // Debug method to get detailed ballot voter and vote data for troubleshooting
  debugBallot: async (id) => {
    console.log(`Getting debug data for ballot with ID: ${id}`);
    try {
      // Add timestamp to prevent caching
      const response = await api.get(`/ballots/${id}/debug?_=${Date.now()}`);
      console.log(`Debug data response for ballot ${id}:`, {
        status: response.status,
        hasData: !!response.data,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching debug data for ballot ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get raw voter data without filtering (diagnostic endpoint)
   * @param {string} id - The ballot ID
   * @returns {Promise<Object>} - The raw voter data
   */
  async getRawVoters(id) {
    try {
      console.log(`API: Getting raw voter data for ballot ${id}`);
      // Add cache busting to prevent stale data
      const timestamp = Date.now();
      const response = await api.get(
        `/ballots/${id}/raw-voters?_=${timestamp}`
      );

      const hasData =
        response?.data?.data &&
        (response.data.data.voterData?.length > 0 ||
          response.data.data.rawVotes?.length > 0);

      console.log(`API: Raw voter data response:`, {
        status: response.status,
        hasData,
        voterCount: response.data?.data?.voterData?.length || 0,
        totalVotes: response.data?.data?.totalVotes || 0,
        orphanedCount: response.data?.data?.orphanedVoterIds?.length || 0,
        inconsistentCount: response.data?.data?.inconsistentVoterCount || 0,
      });

      // Enhanced logging for orphaned voters if they exist
      if (response.data?.data?.orphanedVoterIds?.length > 0) {
        console.warn(
          `API: Found ${response.data.data.orphanedVoterIds.length} orphaned voters!`
        );
      }

      return response.data;
    } catch (error) {
      console.error("API ERROR - getRawVoters:", error);
      throw error;
    }
  },

  // Repair ballot data to fix database inconsistencies
  repairBallot: async (id) => {
    console.log(`Repairing data for ballot with ID: ${id}`);
    try {
      // Add timestamp to prevent caching
      const response = await api.post(`/ballots/${id}/repair?_=${Date.now()}`);
      console.log(`Repair response for ballot ${id}:`, {
        status: response.status,
        hasData: !!response.data,
        stats: response.data?.repairStats,
      });
      return response.data;
    } catch (error) {
      console.error(`Error repairing ballot ${id}:`, error);
      throw error;
    }
  },

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

    // Make sure voterCount is passed through
    if (formattedData.voterCount) {
      console.log(`Using admin-set voter count: ${formattedData.voterCount}`);
    } else {
      // Default to 10 if not specified
      formattedData.voterCount = formattedData.voterCount || 10;
      console.log(`Using default voter count: ${formattedData.voterCount}`);
    }

    // Ensure questions structure is correct
    if (formattedData.questions) {
      formattedData.questions = formattedData.questions.map((q) => {
        // If there are options but no choices, convert options to choices
        if (q.options && !q.choices) {
          q.choices = q.options.map((option, index) => ({
            text: option,
            order: index,
          }));
          // Keep options for backward compatibility but prioritize choices
        }
        return q;
      });
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
  registerVoter: (ballotId) => {
    console.log(
      `[COMPATIBILITY] registerVoter being called for ballot: ${ballotId}`
    );
    console.log(
      `[COMPATIBILITY] This method is deprecated - using publicRegisterVoter instead`
    );

    // Try to get voter info from localStorage or session
    let voterInfo = null;

    // Try to find voter info from various sources
    try {
      // First check if we have a user object stored
      const userJson =
        localStorage.getItem("user") || localStorage.getItem("voterUser");
      if (userJson) {
        const user = JSON.parse(userJson);
        if (user && user.email) {
          voterInfo = {
            name: user.name || "Registered Voter",
            email: user.email,
          };
        }
      }

      // If no user info, check other storage locations
      if (!voterInfo) {
        const infoJson =
          localStorage.getItem(`voter_info_${ballotId}`) ||
          localStorage.getItem("voterInfo") ||
          sessionStorage.getItem("voterInfo");
        if (infoJson) {
          voterInfo = JSON.parse(infoJson);
        }
      }

      // Last resort - check for individual fields
      if (!voterInfo) {
        const name =
          localStorage.getItem(`verified_name_${ballotId}`) ||
          localStorage.getItem("voterName") ||
          "Registered Voter";
        const email =
          localStorage.getItem(`verified_email_${ballotId}`) ||
          localStorage.getItem("voterEmail") ||
          localStorage.getItem("email");

        if (email) {
          voterInfo = { name, email };
        }
      }
    } catch (e) {
      console.error("[COMPATIBILITY] Error getting voter info:", e);
    }

    // If we have voter info, use publicRegisterVoter
    if (voterInfo && voterInfo.email) {
      console.log(
        "[COMPATIBILITY] Using publicRegisterVoter with voter info:",
        {
          name: voterInfo.name,
          email: voterInfo.email.substring(0, 3) + "...",
        }
      );

      return ballotService.publicRegisterVoter(ballotId, voterInfo);
    }

    // Otherwise, log an error and try a fallback
    console.error(
      "[COMPATIBILITY] No voter info found for public registration - attempting fallback"
    );
    return api.post(`/ballots/${ballotId}/register-voter`);
  },

  // Ballot questions
  getQuestions: (ballotId) => api.get(`/ballots/${ballotId}/questions`),
  createQuestion: (ballotId, questionData) =>
    api.post(`/ballots/${ballotId}/questions`, questionData),

  // Ballot voters
  getVoters: async (ballotId, options = {}) => {
    console.log(`Calling API to get voters for ballot ${ballotId}`);

    try {
      // Build query parameters
      const queryParams = new URLSearchParams();

      // Add cache busting to prevent stale data
      queryParams.append("_", Date.now());

      // Add optional parameters
      if (options.includeAdmin === true)
        queryParams.append("includeAdmin", "true");
      if (options.includeAll === true) queryParams.append("includeAll", "true");
      if (options.debug === true) queryParams.append("debug", "true");

      // Construct the URL with query parameters
      const url = `/ballots/${ballotId}/voters?${queryParams.toString()}`;
      console.log(`Fetching voters with params: ${queryParams.toString()}`);

      const response = await api.get(url);

      console.log(`Got response from voters API for ballot ${ballotId}:`, {
        status: response.status,
        hasData: !!response.data,
        votersCount: response.data?.data?.voters?.length || 0,
      });

      return response;
    } catch (error) {
      console.error(`Error fetching voters for ballot ${ballotId}:`, error);
      throw error;
    }
  },
  addVoters: async (ballotId, voterData) => {
    try {
      // Standardize the input - we need an array of voter objects with email and name
      let voters = voterData;

      // Check if voterData is just an array of emails
      if (voterData.emails && Array.isArray(voterData.emails)) {
        console.log(
          "Converting simple emails array to voters array with names"
        );
        // Convert from {emails: ['a@b.com', 'c@d.com']} to [{email: 'a@b.com', name: 'A'}, {email: 'c@d.com', name: 'C'}]
        voters = voterData.emails.map((email) => {
          // Extract first part of email for name
          let name = email.split("@")[0];
          // Capitalize first letter and format nicely
          name =
            name.charAt(0).toUpperCase() + name.slice(1).replace(/[._-]/g, " ");
          return {
            email,
            name: name || "Registered Voter",
          };
        });
      } else if (!Array.isArray(voters)) {
        // If not array, ensure it's properly formatted
        voters = [voterData];
      }

      // Ensure all voters have names
      voters = voters.map((voter) => ({
        ...voter,
        name:
          voter.name ||
          voter.email.split("@")[0].replace(/[._-]/g, " ") ||
          "Registered Voter",
      }));

      console.log("Sending voters with names:", voters);

      const response = await api.post(`/ballots/${ballotId}/voters`, {
        voters,
      });
      return response;
    } catch (error) {
      console.error("Error in addVoters:", error);
      throw error;
    }
  },
  removeVoter: (ballotId, voterId) =>
    api.delete(`/ballots/${ballotId}/voters/${voterId}`),

  // Voting
  castVote: (ballotId, voteData) => {
    console.log(
      `Submitting vote for ballot ${ballotId}:`,
      JSON.stringify(voteData, null, 2)
    );

    // Ensure voter information is included
    if (
      !voteData.voterInfo ||
      !voteData.voterInfo.name ||
      !voteData.voterInfo.email
    ) {
      // Try to get complete voter information from all available sources
      try {
        // First check voter_info specifically for this ballot
        const ballotVoterInfo = localStorage.getItem(`voter_info_${ballotId}`);
        if (ballotVoterInfo) {
          const parsedInfo = JSON.parse(ballotVoterInfo);
          if (parsedInfo && parsedInfo.name && parsedInfo.email) {
            voteData.voterInfo = parsedInfo;
            console.log("Using ballot-specific voter info:", {
              name: parsedInfo.name,
              emailStart: parsedInfo.email.substring(0, 3) + "...",
            });
          }
        }

        // If still missing info, check voterUser as a second source
        if (
          !voteData.voterInfo ||
          !voteData.voterInfo.name ||
          !voteData.voterInfo.email
        ) {
          const voterUser = localStorage.getItem("voterUser");
          if (voterUser) {
            const userData = JSON.parse(voterUser);
            if (userData.name && userData.email) {
              voteData.voterInfo = {
                name: userData.name,
                email: userData.email,
              };
              console.log("Using voterUser for voter information");
            }
          }
        }

        // As a fallback, check for individual fields
        if (
          !voteData.voterInfo ||
          !voteData.voterInfo.name ||
          !voteData.voterInfo.email
        ) {
          const name =
            localStorage.getItem(`verified_name_${ballotId}`) ||
            localStorage.getItem("voterName");
          const email =
            localStorage.getItem(`verified_email_${ballotId}`) ||
            localStorage.getItem("voterEmail");

          if (name || email) {
            voteData.voterInfo = {
              name: name || "Registered Voter",
              email: email,
            };
            console.log("Constructed voter info from separate fields");
          }
        }
      } catch (e) {
        console.warn("Error completing voter info:", e);
      }
    }

    // CRITICAL: Log the final voter info being sent
    if (voteData.voterInfo) {
      console.log("FINAL VOTER INFO BEING SENT:", {
        name: voteData.voterInfo.name,
        hasEmail: !!voteData.voterInfo.email,
        emailStart: voteData.voterInfo.email
          ? voteData.voterInfo.email.substring(0, 3) + "..."
          : "none",
      });
    } else {
      console.error("NO VOTER INFO AVAILABLE - Vote will be anonymous!");
    }

    // CRITICAL FIX: Ensure we're using the correct choice IDs directly from the questions data
    // We should never use hardcoded or derived IDs that don't match the database
    if (voteData.questionsData && voteData.userSelections) {
      console.log("Using direct question/choice mapping for vote submission");

      // Create a properly formatted rankings or votes structure
      const formattedVotes = [];

      voteData.userSelections.forEach((selectedIndex, questionIndex) => {
        if (
          selectedIndex !== null &&
          selectedIndex !== undefined &&
          voteData.questionsData[questionIndex]
        ) {
          const question = voteData.questionsData[questionIndex];
          // Ensure the selectedIndex is within bounds of the available choices
          if (question.choices && question.choices.length > selectedIndex) {
            const choice = question.choices[selectedIndex];
            formattedVotes.push({
              questionId: question.id,
              choiceId: choice.id, // Use the exact ID from the database
              rank: 1,
            });

            console.log(
              `Mapped question ${questionIndex} selection ${selectedIndex} to actual IDs:`,
              {
                questionId: question.id,
                choiceId: choice.id,
              }
            );
          } else {
            console.error(
              `Invalid selection for question ${questionIndex}: selected ${selectedIndex} but only have ${
                question.choices?.length || 0
              } choices`
            );
          }
        }
      });

      // Use the properly formatted votes
      if (formattedVotes.length > 0) {
        voteData.votes = formattedVotes;

        // Also format as rankings for newer API format
        const rankings = {};
        voteData.userSelections.forEach((selectedIndex, questionIndex) => {
          if (selectedIndex !== null && selectedIndex !== undefined) {
            rankings[questionIndex] = { index: selectedIndex };
          }
        });
        voteData.rankings = rankings;
      }
    } else {
      console.warn(
        "No questionsData or userSelections provided - using existing vote format if available"
      );

      // Log the format we're using to help with debugging
      if (voteData.votes) {
        console.log("Using provided votes array:", voteData.votes);
      } else if (voteData.rankings) {
        console.log("Using provided rankings object:", voteData.rankings);
      } else {
        console.error(
          "WARNING: No votes or rankings data found in the payload!"
        );
      }
    }

    // Final validation - log the complete payload
    console.log(
      "FINAL VOTE PAYLOAD:",
      JSON.stringify(
        {
          rankings: voteData.rankings,
          votes: voteData.votes,
          voter: voteData.voterInfo,
        },
        null,
        2
      )
    );

    // Prepare the payload for the public vote endpoint
    const publicVotePayload = {
      rankings: voteData.rankings || {},
      votes: voteData.votes || [],
      voter: voteData.voterInfo || voteData.voter,
    };

    // Use the public vote endpoint
    return api
      .post(`/ballots/${ballotId}/public-vote`, publicVotePayload)
      .then((response) => {
        console.log(`Vote API response (${response.status}):`, response.data);

        // Store that this user has voted on this ballot
        localStorage.setItem(`hasVoted_${ballotId}`, "true");

        return response;
      });
  },

  // Results
  getResults: (ballotId) => api.get(`/ballots/${ballotId}/results`),

  // Emergency direct database access (bypass normal authentication)
  getDirectDatabaseBallots: async () => {
    try {
      console.log("EMERGENCY: Attempting direct database access for ballots");
      // Direct fetch approach to bypass normal authentication
      const response = await fetch(
        "http://localhost:8080/api/admin/direct-data?type=ballots",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Emergency-Access": "true",
          },
        }
      );

      if (!response.ok) {
        // Try fallback with any available tokens
        const token =
          localStorage.getItem("adminToken") ||
          localStorage.getItem("token") ||
          localStorage.getItem("voterToken");

        const authResponse = await fetch(
          "http://localhost:8080/api/ballots?emergency=true",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: token
                ? token.startsWith("Bearer ")
                  ? token
                  : `Bearer ${token}`
                : "",
              "X-Emergency-Access": "true",
            },
          }
        );

        const data = await authResponse.json();
        return { data, status: authResponse.status };
      }

      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      console.error("Emergency database access failed:", error);
      throw error;
    }
  },

  // Repair anonymous voters by updating with real names from emails
  repairAnonymousVoters: async (ballotId) => {
    try {
      console.log(`Repairing anonymous voters for ballot ${ballotId}...`);
      const response = await api.post(`/ballots/${ballotId}/repair-voters`);

      console.log("Repair response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error repairing anonymous voters:", error);
      throw error;
    }
  },

  // Create a direct voter record with explicit information
  createDirectVoter: async (ballotId, voterData) => {
    try {
      console.log(`Creating direct voter for ballot ${ballotId}:`, {
        name: voterData.name,
        email: voterData.email
          ? `${voterData.email.substring(0, 3)}...`
          : "none",
      });

      const response = await api.post(
        `/ballots/${ballotId}/create-direct-voter`,
        {
          voter: voterData,
        }
      );

      console.log("Direct voter creation response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error creating direct voter:", error);
      throw error;
    }
  },

  // Register a voter for a ballot publicly without requiring authentication
  publicRegisterVoter: async (ballotId, voterData) => {
    try {
      console.log(`Publicly registering voter for ballot ${ballotId}:`, {
        name: voterData.name,
        email: voterData.email
          ? `${voterData.email.substring(0, 3)}...`
          : "none",
      });

      // Use the restored public-register-voter endpoint
      const response = await fetch(
        `${API_URL}/ballots/${ballotId}/public-register-voter`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            voter: voterData,
          }),
        }
      );

      const data = await response.json();
      console.log("Public voter registration response:", data);

      // If successful, store the voter ID and any token in localStorage
      if (response.ok && data?.data?.voter) {
        // Store voter ID for this ballot
        localStorage.setItem(`voter_id_${ballotId}`, data.data.voter.id);
        console.log(
          `Stored voter ID ${data.data.voter.id} for ballot ${ballotId}`
        );

        // If a token was provided, store it (for JWT-based authentication)
        if (data.data.token) {
          localStorage.setItem("voterToken", data.data.token);
          console.log("Stored voter token for authenticated requests");

          // Also store voter info in a format our interceptor can use
          localStorage.setItem(
            "voterUser",
            JSON.stringify({
              id: data.data.voter.id,
              name: data.data.voter.name,
              email: data.data.voter.email,
              role: "voter",
            })
          );
        }

        // Store useful voter information for future use
        localStorage.setItem(
          `voter_info_${ballotId}`,
          JSON.stringify(voterData)
        );
        localStorage.setItem(`verified_name_${ballotId}`, voterData.name);
        localStorage.setItem(`verified_email_${ballotId}`, voterData.email);
        localStorage.setItem("voterName", voterData.name);
        localStorage.setItem("voterEmail", voterData.email);
        localStorage.setItem("email", voterData.email);

        return data.data;
      }

      return { error: data.message || "Registration failed" };
    } catch (error) {
      console.error("Error publicly registering voter:", error);

      // Still store voter info in localStorage as a fallback
      try {
        localStorage.setItem(
          `voter_info_${ballotId}`,
          JSON.stringify(voterData)
        );
        localStorage.setItem(`verified_name_${ballotId}`, voterData.name);
        localStorage.setItem(`verified_email_${ballotId}`, voterData.email);
        localStorage.setItem("voterName", voterData.name);
        localStorage.setItem("voterEmail", voterData.email);
        localStorage.setItem("email", voterData.email);
      } catch (storageError) {
        console.error(
          "Error storing voter info in localStorage:",
          storageError
        );
      }

      throw error;
    }
  },

  /**
   * Generate an access key for a ballot
   * @param {string} ballotId - The ballot ID
   * @param {object} options - Options for the access key
   * @returns {Promise<Object>} - The response with the access key
   */
  generateAccessKey: async (ballotId, options = {}) => {
    try {
      console.log(`Generating access key for ballot ${ballotId}`);
      const response = await api.post(
        `/ballots/${ballotId}/generate-access-key`,
        options
      );
      return response.data;
    } catch (error) {
      console.error("Error generating access key:", error);
      throw error;
    }
  },

  /**
   * Validate a ballot access key and get basic ballot info
   * @param {string} accessKey - The access key to validate
   * @returns {Promise<Object>} - The response with the ballot info
   */
  validateAccessKey: async (accessKey) => {
    try {
      console.log(`Validating access key: ${accessKey.substring(0, 8)}...`);
      const response = await api.get(`/ballots/access/${accessKey}`);
      return response.data;
    } catch (error) {
      console.error("Error validating access key:", error);
      throw error;
    }
  },

  /**
   * Register a voter using a ballot access key
   * @param {object} data - Registration data including accessKey, name, email, password
   * @returns {Promise<Object>} - The response with voter token and info
   */
  registerWithAccessKey: async (data) => {
    try {
      console.log(
        `Registering voter with access key: ${data.accessKey.substring(
          0,
          8
        )}...`
      );
      const response = await api.post("/ballots/register-with-key", data);

      // If successful, store the voter token and info
      if (response.data && response.data.status === "success") {
        const { token, voter, ballot } = response.data.data;

        // Store the voter token
        localStorage.setItem("voterToken", token);

        // Store voter information
        localStorage.setItem("voter", JSON.stringify(voter));

        // Store ballot-specific voter info
        localStorage.setItem(
          `voter_info_${ballot.id}`,
          JSON.stringify({
            name: voter.name,
            email: voter.email,
          })
        );

        // Store verified name and email
        localStorage.setItem(`verified_name_${ballot.id}`, voter.name);
        localStorage.setItem(`verified_email_${ballot.id}`, voter.email);

        // Store voter ID
        localStorage.setItem(`voter_id_${ballot.id}`, voter.id);

        console.log(
          `Voter registered successfully: ${voter.name} (${voter.id}) for ballot ${ballot.id}`
        );
      }

      return response.data;
    } catch (error) {
      console.error("Error registering with access key:", error);
      throw error;
    }
  },

  // Created a specific castVoteWithToken method for the token-based flow
  // This is still useful for users who have a token and want to use it
  castVoteWithToken: async (ballotId, voteData) => {
    try {
      console.log(`Casting vote for ballot ${ballotId} with voter token`);

      // Get the voter token
      const voterToken = localStorage.getItem("voterToken");
      if (!voterToken) {
        console.log(
          "No voter token found, falling back to public voting endpoint"
        );
        // Fall back to regular castVote which uses the public-vote endpoint
        return ballotService.castVote(ballotId, voteData);
      }

      // Log vote data being sent
      console.log("Vote data being sent:", {
        hasVotes: !!voteData.votes,
        hasVoterInfo: !!voteData.voterInfo,
      });

      // Prepare the vote payload similar to castVote
      const votePayload = {
        rankings: voteData.rankings || voteData.votes,
        votes: voteData.votes,
        voter: voteData.voterInfo || voteData.voter,
      };

      // Use the api instance which will automatically use the voterToken
      // from localStorage through the interceptor
      const response = await api.post(
        `/ballots/${ballotId}/voter-vote`,
        votePayload
      );

      console.log("Vote cast successfully:", response.data);

      // Store that this user has voted
      localStorage.setItem(`hasVoted_${ballotId}`, "true");

      return response.data;
    } catch (error) {
      console.error("Error casting vote with token:", error);

      // If we get a 401 Unauthorized, fall back to public voting
      if (error.response && error.response.status === 401) {
        console.log(
          "Voter token rejected, falling back to public voting endpoint"
        );
        return ballotService.castVote(ballotId, voteData);
      }

      throw error;
    }
  },
};

// Add a utility function to normalize ballot data and update local storage
const normalizeAndCacheBallots = (ballots) => {
  try {
    // Process each ballot to ensure consistent voter data fields
    const normalizedBallots = ballots.map((ballot) => {
      // 1. Ensure each ballot has the allowedVoters field properly set
      if (!ballot.allowedVoters || ballot.allowedVoters <= 0) {
        const sourceValue =
          ballot.voterCount ||
          ballot.maxVoters ||
          ballot.totalVoters ||
          ballot.total_voters ||
          10;
        console.log(
          `API Utils: Setting allowedVoters=${sourceValue} for ballot ${ballot.id}`
        );
        ballot.allowedVoters = sourceValue;
      }

      // 2. Ensure all related fields are consistent with allowedVoters
      ballot.voterCount = ballot.allowedVoters;
      ballot.maxVoters = ballot.allowedVoters;

      return ballot;
    });

    // Update localStorage to ensure consistent data
    localStorage.setItem("userBallots", JSON.stringify(normalizedBallots));
    console.log(
      `API Utils: Updated localStorage with ${normalizedBallots.length} normalized ballots`
    );

    return normalizedBallots;
  } catch (error) {
    console.error("Error normalizing ballots:", error);
    return ballots; // Return original ballots if error
  }
};

// Election services
export const electionService = {
  getSummary: () => api.get("/elections/summary"),

  // Add cache busting and process data consistently
  getRecentElections: async () => {
    // Clear API cache first
    localStorage.removeItem("api_cache_/elections/recent");

    // Add timestamp to prevent caching
    const response = await api.get(`/elections/recent?_=${Date.now()}`);

    // Process the data before returning to ensure consistency
    if (response.data && response.data.data) {
      response.data.data = response.data.data.map((ballot) => {
        // Ensure allowedVoters is properly set for all elections
        if (!ballot.allowedVoters || ballot.allowedVoters <= 0) {
          console.log(
            `API Processor: Setting default allowedVoters for ${ballot.id}`
          );
          ballot.allowedVoters = Math.max(
            ballot.voterCount || ballot.totalVoters || 0,
            10
          );
        }

        // Ensure all voter count fields are consistent
        ballot.voterCount = ballot.allowedVoters;
        ballot.maxVoters = ballot.allowedVoters;

        console.log(
          `API Processor: Processed ballot ${ballot.id} with allowedVoters=${ballot.allowedVoters}`
        );
        return ballot;
      });

      // Update local storage with this normalized data
      normalizeAndCacheBallots(response.data.data);
    }

    return response;
  },

  // Add cache busting and process data consistently for upcoming
  getUpcomingElections: async () => {
    // Clear API cache first
    localStorage.removeItem("api_cache_/elections/upcoming");

    // Add timestamp to prevent caching
    const response = await api.get(`/elections/upcoming?_=${Date.now()}`);

    // Process the data before returning to ensure consistency
    if (response.data && response.data.data) {
      response.data.data = response.data.data.map((ballot) => {
        // Ensure allowedVoters is properly set for all elections
        if (!ballot.allowedVoters || ballot.allowedVoters <= 0) {
          console.log(
            `API Processor: Setting default allowedVoters for ${ballot.id}`
          );
          ballot.allowedVoters = Math.max(
            ballot.voterCount || ballot.totalVoters || 0,
            10
          );
        }

        // Ensure all voter count fields are consistent
        ballot.voterCount = ballot.allowedVoters;
        ballot.maxVoters = ballot.allowedVoters;

        console.log(
          `API Processor: Processed ballot ${ballot.id} with allowedVoters=${ballot.allowedVoters}`
        );
        return ballot;
      });

      // Update local storage with this normalized data too
      const existingBallots = JSON.parse(
        localStorage.getItem("userBallots") || "[]"
      );
      const upcomingIds = response.data.data.map((b) => b.id);

      // Filter out upcoming ballots from existing data
      const filteredBallots = existingBallots.filter(
        (b) => !upcomingIds.includes(b.id)
      );

      // Add the normalized upcoming ballots
      const updatedBallots = [...filteredBallots, ...response.data.data];

      // Save to localStorage
      localStorage.setItem("userBallots", JSON.stringify(updatedBallots));
      console.log(
        `API Utils: Updated localStorage with upcoming elections, total: ${updatedBallots.length} ballots`
      );
    }

    return response;
  },

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

// Onfido Identity Verification services
export const onfidoService = {
  getOnfidoToken: async (userId) => {
    const response = await api.post("/auth/onfido/token", { userId });
    return response.data;
  },

  submitVerification: async (verificationData) => {
    const response = await api.post("/auth/onfido/submit", verificationData);
    return response.data;
  },

  getVerificationStatus: async (userId) => {
    const response = await api.get(`/auth/onfido/status/${userId}`);
    return response.data;
  },

  extractDocumentData: async (documentId) => {
    const response = await api.get(`/auth/onfido/extract/${documentId}`);
    return response.data;
  },
};

// Payment services using Stripe
export const paymentService = {
  // Create a payment intent
  createPaymentIntent: async (paymentData) => {
    const response = await api.post("/payment/create-intent", paymentData);
    return response.data;
  },

  // Confirm a payment
  confirmPayment: async (paymentIntentId) => {
    const response = await api.post("/payment/confirm", { paymentIntentId });
    return response.data;
  },

  // Get saved payment methods
  getPaymentMethods: async () => {
    const response = await api.get("/payment/methods");
    return response.data;
  },

  // Create a setup intent for saving payment method
  createSetupIntent: async () => {
    const response = await api.post("/payment/setup-intent");
    return response.data;
  },
};

// Service functions for voter-specific operations
export const voterService = {
  /**
   * Check if there's a valid voter token
   * @returns {boolean} - True if a valid voter token exists
   */
  hasValidVoterToken: () => {
    const token = localStorage.getItem("voterToken");
    return !!token;
  },

  /**
   * Get voter information from localStorage
   * @returns {object|null} - The voter information or null if not found
   */
  getVoterInfo: () => {
    const voterJson = localStorage.getItem("voter");
    if (!voterJson) return null;

    try {
      return JSON.parse(voterJson);
    } catch (e) {
      console.error("Error parsing voter info:", e);
      return null;
    }
  },

  /**
   * Log out the voter
   */
  logoutVoter: () => {
    // Remove voter token and info
    localStorage.removeItem("voterToken");
    localStorage.removeItem("voter");

    // Don't clear ballot-specific data to prevent data loss
    console.log("Voter logged out successfully");
  },
};

export default api;

/**
 * Complete reset function to clear all localStorage data and cache.
 * This can be used from the browser console to troubleshoot authentication issues.
 * Usage: window.resetSafeBallotState()
 */
const resetSafeBallotState = () => {
  console.log("🧹 Performing complete SafeBallot state reset...");

  // Clear all cache
  requestCache.clear();

  // Clear all localStorage items
  localStorage.clear();

  console.log(
    "✅ All state has been cleared. Please refresh the page and log in again."
  );

  // Optional: refresh the page automatically
  // window.location.href = "/login";

  return "Reset complete. Please refresh the page.";
};

// Make the function available in the global scope for debugging
window.resetSafeBallotState = resetSafeBallotState;
