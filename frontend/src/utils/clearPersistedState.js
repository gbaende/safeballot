/**
 * Utility function to clear persisted Redux state
 * Use this if you encounter issues with state structure changes
 */

export const clearPersistedState = () => {
  try {
    // Clear the main Redux persist key
    localStorage.removeItem("persist:root");

    // Clear any other auth-related keys that might cause conflicts
    const keysToRemove = [
      "token",
      "user",
      "voterToken",
      "voterUser",
      "authState",
      "redux-persist",
    ];

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });

    console.log("[PERSIST] Cleared persisted Redux state successfully");
    console.log("[PERSIST] Please refresh the page for changes to take effect");

    return true;
  } catch (error) {
    console.error("[PERSIST] Error clearing persisted state:", error);
    return false;
  }
};

/**
 * Check if the current persisted auth state has the correct structure
 */
export const checkAuthStateStructure = () => {
  try {
    const persistedState = localStorage.getItem("persist:root");
    if (!persistedState) {
      console.log("[PERSIST] No persisted state found");
      return { isValid: true, message: "No persisted state (fresh start)" };
    }

    const parsed = JSON.parse(persistedState);
    if (!parsed.auth) {
      console.log("[PERSIST] No auth state in persisted data");
      return { isValid: true, message: "No auth state persisted" };
    }

    const authState = JSON.parse(parsed.auth);
    const hasRegistrationFlow =
      authState.registrationFlow &&
      typeof authState.registrationFlow === "object";
    const hasLoginFlow =
      authState.loginFlow && typeof authState.loginFlow === "object";

    if (!hasRegistrationFlow || !hasLoginFlow) {
      console.warn("[PERSIST] Auth state is missing flow properties");
      return {
        isValid: false,
        message: "Missing registrationFlow or loginFlow in persisted state",
        hasRegistrationFlow,
        hasLoginFlow,
      };
    }

    console.log("[PERSIST] Auth state structure is valid");
    return { isValid: true, message: "Auth state structure is correct" };
  } catch (error) {
    console.error("[PERSIST] Error checking auth state structure:", error);
    return { isValid: false, message: "Error parsing persisted state" };
  }
};

// Development helper - run this in browser console if needed
if (typeof window !== "undefined") {
  window.clearPersistedState = clearPersistedState;
  window.checkAuthStateStructure = checkAuthStateStructure;
}
