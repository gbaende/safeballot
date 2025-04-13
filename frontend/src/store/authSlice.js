import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.loading = false;
      state.error = null;
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    },
    registerRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    registerSuccess: (state) => {
      state.loading = false;
    },
    registerFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearErrors: (state) => {
      state.error = null;
    },
  },
});

export const {
  loginRequest,
  loginSuccess,
  loginFailure,
  logout,
  registerRequest,
  registerSuccess,
  registerFailure,
  clearErrors,
} = authSlice.actions;

// For demonstration - in production, these would call actual API endpoints
export const login = (credentials) => async (dispatch) => {
  try {
    dispatch(loginRequest());
    // Mock successful login
    setTimeout(() => {
      const userData = {
        user: {
          id: "1",
          email: credentials.email,
          // Don't set a name so it will be generated from email
          organization: "SafeBallot Inc.",
        },
        token: "mock-jwt-token",
      };

      // Store user data in localStorage for MainLayout component
      localStorage.setItem("user", JSON.stringify(userData.user));
      localStorage.setItem("userEmail", credentials.email);
      localStorage.setItem("token", userData.token);

      dispatch(loginSuccess(userData));
    }, 1000);
  } catch (error) {
    dispatch(loginFailure(error.message));
  }
};

export const register = (userData) => async (dispatch) => {
  try {
    dispatch(registerRequest());
    // Mock successful registration
    setTimeout(() => {
      // Create user data object
      const user = {
        id: "1",
        email: userData.email,
        // Don't set name field so it will be generated from email
        organization: userData.organization || "SafeBallot",
      };

      const loginData = {
        user,
        token: "mock-jwt-token",
      };

      // Store user data in localStorage for MainLayout component
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("userEmail", userData.email);
      localStorage.setItem("token", loginData.token);

      dispatch(registerSuccess());
      dispatch(loginSuccess(loginData));
    }, 1000);
  } catch (error) {
    dispatch(registerFailure(error.message));
  }
};

export default authSlice.reducer;
