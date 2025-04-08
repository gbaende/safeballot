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
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle unauthorized errors (401)
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Authentication services
export const authService = {
  login: (email, password) => api.post("/login", { email, password }),
  register: (email, password) => api.post("/register", { email, password }),
  verify: (verificationData) => api.post("/verify", verificationData),
};

// Ballot services
export const ballotService = {
  getBallots: () => api.get("/ballots"),
  getBallotById: (id) => api.get(`/ballot?id=${id}`),
  createBallot: (ballotData) => api.post("/ballot", ballotData),
  vote: (voteData) => api.post("/vote", voteData),
};

// User services
export const userService = {
  getUsers: () => api.get("/users"),
  getUserById: (id) => api.get(`/user?id=${id}`),
};

export default api;
