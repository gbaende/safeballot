import axios from "axios";

const API_URL = "http://localhost:8080/api";

// Create a configured axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    console.log("API Request to:", config.url);

    // List of public endpoints that don't need authentication
    const publicEndpoints = [
      "/health",
      "/login",
      "/register",
      "/refresh-token",
      "/verify-email",
      "/reset-password",
    ];

    // Check if the current request is to a public endpoint
    const isPublicEndpoint = publicEndpoints.some((endpoint) =>
      config.url.includes(endpoint)
    );

    // Only add auth token for non-public endpoints
    if (!isPublicEndpoint) {
      const token = localStorage.getItem("token");
      console.log(
        "Token in request interceptor:",
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
          "No token found for request to non-public endpoint:",
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
        "/login",
        "/register",
        "/refresh-token",
        "/verify-email",
        "/reset-password",
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
        // Set a flag to prevent multiple redirects
        localStorage.setItem("auth_redirect_in_progress", "true");

        // Clear local storage
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Redirect to login - use setTimeout to ensure this only happens once
        setTimeout(() => {
          window.location.href = "/login";
          // Remove the flag after navigation starts
          localStorage.removeItem("auth_redirect_in_progress");
        }, 100);
      } else if (isPublicEndpoint) {
        console.log("Ignoring 401 for public endpoint:", error.config.url);
      }
    }
    return Promise.reject(error);
  }
);

// Authentication services
export const authService = {
  login: (email, password) => api.post("/login", { email, password }),
  register: (userData) => api.post("/register", userData),
  refreshToken: (refreshToken) =>
    api.post("/refresh-token", { refresh_token: refreshToken }),
  verifyEmail: (verificationToken) =>
    api.post("/verify-email", { token: verificationToken }),
  requestPasswordReset: (email) =>
    api.post("/reset-password/request", { email }),
  confirmPasswordReset: (token, newPassword) =>
    api.post("/reset-password/confirm", { token, password: newPassword }),
  logout: () => api.post("/logout"),

  // Voter verification methods
  verifyIdentity: (userId) => api.post("/verify/identity", { user_id: userId }),
  verifyDocument: (documentData) => api.post("/verify/document", documentData),
  sendOTP: (email) => api.post("/verify/send-otp", { email }),
  verifyOTP: (email, code) => api.post("/verify/otp", { email, code }),
  generateDigitalKey: (email, ballotId) =>
    api.post("/verify/digital-key", { email, ballot_id: ballotId }),
};

// Ballot services
export const ballotService = {
  getBallots: () => api.get("/ballots"),
  getBallotById: (id) => api.get(`/ballots/${id}`),
  createBallot: (ballotData) => api.post("/ballots", ballotData),
  updateBallot: (id, ballotData) => api.put(`/ballots/${id}`, ballotData),
  deleteBallot: (id) => api.delete(`/ballots/${id}`),

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
