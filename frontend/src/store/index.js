import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import authReducer from "./authSlice";
import electionReducer from "./electionSlice";

// Migration function to handle auth state structure changes
const authMigration = (state) => {
  // If the persisted state is missing the new flow properties, initialize them
  if (state && typeof state === "object") {
    if (!state.registrationFlow) {
      state.registrationFlow = {
        loading: false,
        error: null,
        step: null, // 'identity', 'scan', 'confirm', 'verified'
        identityVerified: false,
        scanCompleted: false,
        confirmed: false,
      };
    }
    if (!state.loginFlow) {
      state.loginFlow = {
        loading: false,
        error: null,
        step: null, // 'scan', 'verified'
        identityVerified: false,
        scanCompleted: false,
      };
    }
  }
  return state;
};

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth"], // only auth will be persisted
  migrate: (state) => {
    return Promise.resolve().then(() => {
      try {
        if (state && state.auth) {
          return {
            ...state,
            auth: authMigration(state.auth),
          };
        }
        return state;
      } catch (error) {
        console.warn(
          "Redux Persist migration failed, using default state:",
          error
        );
        // Return a clean state if migration fails
        return undefined;
      }
    });
  },
  version: 1, // Increment this if you need future migrations
};

const rootReducer = combineReducers({
  auth: authReducer,
  elections: electionReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
          "persist/REGISTER",
        ],
        // Ignore these paths in the state for serialization checks
        ignoredPaths: [
          // Ignore any potential image data paths that might contain ImageData objects
          "auth.registrationFlow.scanData.faceImage.rawImage",
          "auth.registrationFlow.scanData.fullDocumentImage.rawImage",
          "auth.registrationFlow.scanData.signatureImage.rawImage",
          "auth.loginFlow.scanData.faceImage.rawImage",
          "auth.loginFlow.scanData.fullDocumentImage.rawImage",
          "auth.loginFlow.scanData.signatureImage.rawImage",
        ],
      },
    }),
});

export const persistor = persistStore(store);
