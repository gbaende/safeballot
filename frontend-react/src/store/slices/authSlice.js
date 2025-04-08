import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Update API URL to match the Express server port (3000)
const API_URL = "http://localhost:3000/api";

// Configure axios with better error logging
axios.interceptors.request.use(
  (config) => {
    console.log(
      `📤 Sending ${config.method?.toUpperCase()} request to: ${config.url}`,
      config.data
    );
    return config;
  },
  (error) => {
    console.error("📭 Request error:", error);
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    console.log(`📨 Response from ${response.config.url}:`, response.data);
    return response;
  },
  (error) => {
    console.error("📭 Response error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Async thunks
export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      console.error(
        "Login error details:",
        error.message,
        error.response?.data
      );
      return rejectWithValue(
        error.response?.data || {
          message: "Network error or server unavailable",
        }
      );
    }
  }
);

export const register = createAsyncThunk(
  "auth/register",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      console.log(`Attempting to register user with email: ${email}`);
      const response = await axios.post(`${API_URL}/register`, {
        email,
        password,
      });
      console.log("Registration successful:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "Registration error details:",
        error.message,
        error.response?.data
      );
      return rejectWithValue(
        error.response?.data || {
          message: "Network error or server unavailable",
        }
      );
    }
  }
);

export const verify = createAsyncThunk(
  "auth/verify",
  async (verificationData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/verify`, verificationData);
      return response.data;
    } catch (error) {
      console.error(
        "Verification error details:",
        error.message,
        error.response?.data
      );
      return rejectWithValue(
        error.response?.data || {
          message: "Network error or server unavailable",
        }
      );
    }
  }
);

// Initial state
const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  role: null,
  otp: null,
  loading: false,
  error: null,
  verificationStep: "unverified", // unverified, otp, voter-id, biometric, verified
};

// Auth slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.role = null;
      state.otp = null;
      state.verificationStep = "unverified";
    },
    setVerificationStep: (state, action) => {
      state.verificationStep = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.token = action.payload.data?.token;
      state.user = { email: action.payload.data?.email };
      state.role = action.payload.data?.role;
      state.otp = action.payload.data?.otp; // For demo purposes only
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message || "Login failed";
      console.error("Login rejected in Redux store:", state.error);
    });

    // Register
    builder.addCase(register.pending, (state) => {
      state.loading = true;
      state.error = null;
      console.log("Registration request pending...");
    });
    builder.addCase(register.fulfilled, (state, action) => {
      state.loading = false;
      state.error = null;
      // Automatically log in user after successful registration
      state.isAuthenticated = true;
      if (action.payload.data?.user) {
        state.user = action.payload.data.user;
      }
      console.log("Registration fulfilled in Redux store:", action.payload);
    });
    builder.addCase(register.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message || "Registration failed";
      console.error("Registration rejected in Redux store:", state.error);
    });

    // Verify
    builder.addCase(verify.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(verify.fulfilled, (state) => {
      state.loading = false;
      state.verificationStep = "verified";
    });
    builder.addCase(verify.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message || "Verification failed";
      console.error("Verification rejected in Redux store:", state.error);
    });
  },
});

export const { logout, setVerificationStep, clearError } = authSlice.actions;

export default authSlice.reducer;
