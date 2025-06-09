import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
  // Separate states for registration and login identity verification
  registrationFlow: {
    loading: false,
    error: null,
    step: null, // 'identity', 'scan', 'confirm', 'verified'
    identityVerified: false,
    scanCompleted: false,
    confirmed: false,
  },
  loginFlow: {
    loading: false,
    error: null,
    step: null, // 'scan', 'verified'
    identityVerified: false,
    scanCompleted: false,
  },
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
      // Reset flow states
      state.registrationFlow = initialState.registrationFlow;
      state.loginFlow = initialState.loginFlow;
      // Clear localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
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

    // Registration Flow Actions
    verifyRegistrationIdentityRequest: (state) => {
      // Defensive guard to ensure registrationFlow exists
      if (!state.registrationFlow) {
        state.registrationFlow = { ...initialState.registrationFlow };
      }
      state.registrationFlow.loading = true;
      state.registrationFlow.error = null;
      state.registrationFlow.step = "identity";
    },
    verifyRegistrationIdentitySuccess: (state, action) => {
      if (!state.registrationFlow) {
        state.registrationFlow = { ...initialState.registrationFlow };
      }
      state.registrationFlow.loading = false;
      state.registrationFlow.identityVerified = true;
      state.registrationFlow.step = "scan";
      state.registrationFlow.error = null;
    },
    verifyRegistrationIdentityFailure: (state, action) => {
      if (!state.registrationFlow) {
        state.registrationFlow = { ...initialState.registrationFlow };
      }
      state.registrationFlow.loading = false;
      state.registrationFlow.error = action.payload;
    },

    registrationScanRequest: (state) => {
      if (!state.registrationFlow) {
        state.registrationFlow = { ...initialState.registrationFlow };
      }
      state.registrationFlow.loading = true;
      state.registrationFlow.error = null;
    },
    registrationScanSuccess: (state, action) => {
      if (!state.registrationFlow) {
        state.registrationFlow = { ...initialState.registrationFlow };
      }
      state.registrationFlow.loading = false;
      state.registrationFlow.scanCompleted = true;
      state.registrationFlow.step = "confirm";
      state.registrationFlow.error = null;
    },
    registrationScanFailure: (state, action) => {
      if (!state.registrationFlow) {
        state.registrationFlow = { ...initialState.registrationFlow };
      }
      state.registrationFlow.loading = false;
      state.registrationFlow.error = action.payload;
    },

    registrationConfirmRequest: (state) => {
      if (!state.registrationFlow) {
        state.registrationFlow = { ...initialState.registrationFlow };
      }
      state.registrationFlow.loading = true;
      state.registrationFlow.error = null;
    },
    registrationConfirmSuccess: (state, action) => {
      if (!state.registrationFlow) {
        state.registrationFlow = { ...initialState.registrationFlow };
      }
      state.registrationFlow.loading = false;
      state.registrationFlow.confirmed = true;
      state.registrationFlow.step = "verified";
      state.registrationFlow.error = null;
    },
    registrationConfirmFailure: (state, action) => {
      if (!state.registrationFlow) {
        state.registrationFlow = { ...initialState.registrationFlow };
      }
      state.registrationFlow.loading = false;
      state.registrationFlow.error = action.payload;
    },

    // Login Flow Actions
    verifyLoginIdentityRequest: (state) => {
      if (!state.loginFlow) {
        state.loginFlow = { ...initialState.loginFlow };
      }
      state.loginFlow.loading = true;
      state.loginFlow.error = null;
      state.loginFlow.step = "scan";
    },
    verifyLoginIdentitySuccess: (state, action) => {
      if (!state.loginFlow) {
        state.loginFlow = { ...initialState.loginFlow };
      }
      state.loginFlow.loading = false;
      state.loginFlow.identityVerified = true;
      state.loginFlow.scanCompleted = true;
      state.loginFlow.step = "verified";
      state.loginFlow.error = null;
    },
    verifyLoginIdentityFailure: (state, action) => {
      if (!state.loginFlow) {
        state.loginFlow = { ...initialState.loginFlow };
      }
      state.loginFlow.loading = false;
      state.loginFlow.error = action.payload;
    },

    // Reset flow states
    resetRegistrationFlow: (state) => {
      state.registrationFlow = initialState.registrationFlow;
    },
    resetLoginFlow: (state) => {
      state.loginFlow = initialState.loginFlow;
    },

    clearErrors: (state) => {
      state.error = null;
      state.registrationFlow.error = null;
      state.loginFlow.error = null;
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

  // Registration Flow Actions
  verifyRegistrationIdentityRequest,
  verifyRegistrationIdentitySuccess,
  verifyRegistrationIdentityFailure,
  registrationScanRequest,
  registrationScanSuccess,
  registrationScanFailure,
  registrationConfirmRequest,
  registrationConfirmSuccess,
  registrationConfirmFailure,

  // Login Flow Actions
  verifyLoginIdentityRequest,
  verifyLoginIdentitySuccess,
  verifyLoginIdentityFailure,

  // Reset Actions
  resetRegistrationFlow,
  resetLoginFlow,
  clearErrors,
} = authSlice.actions;

export default authSlice.reducer;
