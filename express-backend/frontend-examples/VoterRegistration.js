import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api"; // Import the shared api instance with interceptor

/**
 * Voter Registration Component
 *
 * Parallel Session Strategy:
 * - Both admin and voter tokens can coexist in localStorage
 * - Tokens are kept separate as 'adminToken' and 'voterToken'
 * - API interceptor selects the appropriate token based on route patterns
 * - Voter routes always use voter token, admin routes always use admin token
 * - This allows users to be logged in as both admin and voter simultaneously
 */
function VoterRegistration() {
  const [accessKey, setAccessKey] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState(null);

  const navigate = useNavigate();

  // Step 1: Register with access key
  const registerWithAccessKey = async (accessKey, name, email) => {
    console.group("🔑 STEP 1: ACCESS KEY REGISTRATION");
    console.log(`Registering with access key: ${accessKey}`);

    try {
      // Use a direct fetch call to ensure we get the raw response
      const response = await fetch("/api/ballots/register-with-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessKey,
          name,
          email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Access key registration failed:", errorData);
        throw new Error(errorData.message || "Registration failed");
      }

      const data = await response.json();
      console.log("✅ Registration successful:", data);

      if (!data?.data?.token) {
        throw new Error("No token received in registration response");
      }

      const { token, ballot, voter } = data.data;

      // Store the token and get verification
      return await storeVoterToken(token, voter, ballot);
    } catch (error) {
      console.error("❌ Access key registration failed:", error);
      console.log("Error response:", error.response?.data);
      console.groupEnd();
      throw error;
    }
  };

  // Helper: Store voter token with verification
  const storeVoterToken = async (token, voter, ballot) => {
    console.log("🔐 Storing voter token in localStorage");

    // Only clear the voter token, preserve admin token for parallel sessions
    localStorage.removeItem("voterToken");

    // Store token directly - rely on backend for correct token role
    localStorage.setItem("voterToken", token);

    // Store voter info for future use
    localStorage.setItem(
      "voterInfo",
      JSON.stringify({
        id: voter.id,
        name: voter.name || name,
        email: voter.email || email,
        ballotId: ballot.id,
      })
    );

    // Add sufficient delay for localStorage operations
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify token was actually stored
    const storedToken = localStorage.getItem("voterToken");

    if (storedToken !== token) {
      console.error("⚠️ Token storage verification failed!");
      console.log(`Expected: ${token.substring(0, 15)}...`);
      console.log(
        `Actual: ${storedToken ? storedToken.substring(0, 15) + "..." : "null"}`
      );
      throw new Error("Token failed to store in localStorage");
    }

    console.log("✅ Token successfully stored and verified");
    console.groupEnd();

    return { token, ballot, voter };
  };

  // Step 2: Register voter with ballot
  const registerVoterWithBallot = async (ballotId) => {
    console.group("🗳️ STEP 2: BALLOT REGISTRATION");
    console.log(`Registering voter for ballot: ${ballotId}`);

    // Verify token exists before attempting request
    const voterToken = localStorage.getItem("voterToken");

    if (!voterToken) {
      console.error("❌ No voter token available for ballot registration!");
      console.groupEnd();
      throw new Error("Voter token missing - cannot register with ballot");
    }

    console.log(`🔑 Using token: ${voterToken.substring(0, 15)}...`);

    // Verify token format (but don't attempt to modify it)
    try {
      const tokenParts = voterToken.split(".");
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        if (payload.role !== "voter") {
          console.warn(
            `⚠️ Token has role '${payload.role}' instead of 'voter'`
          );
          console.log(
            "This may cause permission issues. Please check backend token generation."
          );
        } else {
          console.log("✅ Token has correct voter role");
        }
      }
    } catch (e) {
      console.error("❌ Error verifying token format:", e);
    }

    // Check if the interceptor will detect this URL correctly
    const requestUrl = `/ballots/${ballotId}/register-voter`;
    const interceptorRegex = /\/ballots\/[^\/]+\/register-voter/;
    const willBeDetected = interceptorRegex.test(requestUrl);

    console.log(`🔍 Request URL: ${requestUrl}`);
    console.log(
      `🔍 Will interceptor detect as voter route? ${
        willBeDetected ? "YES" : "NO"
      }`
    );

    try {
      // Log essential auth data right before making the request
      logAuthState();

      // Use the API instance that has the interceptor
      const response = await api.post(requestUrl);

      console.log("✅ Voter-ballot registration successful:", response.data);
      console.groupEnd();
      return response.data;
    } catch (error) {
      console.error("❌ Voter-ballot registration failed:", error);

      // Enhanced error logging
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log("Error data:", error.response.data);
        console.log("Request URL:", error.config.url);
        console.log("Request method:", error.config.method);
        console.log("Request headers:", error.config.headers);

        // Check if the error is due to using admin token
        if (
          error.response.status === 403 &&
          error.response.data?.message?.includes(
            "cannot register for own ballot"
          )
        ) {
          console.error(
            "🚨 Error: Request failed because admin token was used"
          );

          // Try explicit direct fetch with voter token as fallback
          console.log(
            "Attempting fallback with direct fetch and explicit voter token..."
          );
          return await registerVoterWithExplicitToken(ballotId, voterToken);
        }
      }

      // FALLBACK: Try with direct fetch as a last resort
      console.log("🔄 Attempting fallback with direct fetch...");
      try {
        const fallbackResponse = await fetch(`/api${requestUrl}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${voterToken}`,
          },
        });

        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          console.log("✅ Fallback successful:", data);
          console.groupEnd();
          return data;
        } else {
          console.log(`❌ Fallback also failed: ${fallbackResponse.status}`);
          const errorData = await fallbackResponse.json();
          console.log("Fallback error:", errorData);
        }
      } catch (fallbackError) {
        console.error("Fallback fetch error:", fallbackError);
      }

      console.groupEnd();
      throw error;
    }
  };

  // Helper function for direct API call with explicit token
  const registerVoterWithExplicitToken = async (ballotId, token) => {
    console.group("🚀 EXPLICIT TOKEN FALLBACK");
    console.log(
      `Making direct fetch call to register voter for ballot ${ballotId}`
    );

    try {
      const response = await fetch(`/api/ballots/${ballotId}/register-voter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          `❌ Explicit token call failed: ${response.status}`,
          errorData
        );
        console.groupEnd();
        throw new Error(errorData.message || "Failed to register with ballot");
      }

      const data = await response.json();
      console.log("✅ Explicit token call successful:", data);
      console.groupEnd();
      return data;
    } catch (error) {
      console.error("❌ Explicit token call error:", error);
      console.groupEnd();
      throw error;
    }
  };

  // Helper: Log essential authentication state (streamlined)
  const logAuthState = () => {
    console.group("🔐 AUTH STATE CHECK");

    // Check tokens
    const voterToken = localStorage.getItem("voterToken");
    const adminToken = localStorage.getItem("adminToken");

    console.log(`🔹 Voter token: ${voterToken ? "EXISTS" : "MISSING"}`);
    console.log(`🔹 Admin token: ${adminToken ? "EXISTS" : "MISSING"}`);

    // Note about parallel sessions
    if (voterToken && adminToken) {
      console.log(
        "ℹ️ Both voter and admin tokens exist - using parallel session strategy"
      );
    }

    // Decode and log voter token payload if available (don't log the full token)
    if (voterToken) {
      try {
        const parts = voterToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          console.log("🔹 Token role:", payload.role || "NOT SPECIFIED");
          console.log(
            "🔹 Token subject:",
            payload.sub || payload.id || "NOT SPECIFIED"
          );

          // Only log critical potential issues
          if (payload.role !== "voter") {
            console.warn(
              `⚠️ Note: Token role is '${payload.role}' not 'voter'`
            );
          }
        }
      } catch (e) {
        console.error("❌ Error parsing token:", e);
      }
    }

    console.groupEnd();
  };

  // Complete end-to-end registration flow
  const completeRegistration = async (accessKey, name, email) => {
    try {
      // Step 1: Register with access key
      const { ballot } = await registerWithAccessKey(accessKey, name, email);

      // Step 2: Register voter with ballot
      await registerVoterWithBallot(ballot.id);

      // If we got here, registration was successful
      return { success: true, ballotId: ballot.id };
    } catch (error) {
      console.error("❌ Complete registration flow failed:", error);

      // Collect debug info for display
      setDebugInfo({
        error: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        voterToken: localStorage.getItem("voterToken") ? "EXISTS" : "MISSING",
      });

      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setDebugInfo(null);

    try {
      const result = await completeRegistration(accessKey, name, email);

      if (result.success) {
        // Navigate to voting page
        navigate(`/vote/${result.ballotId}`);
      } else {
        setError(result.error || "Registration failed");
      }
    } catch (error) {
      setError(error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="voter-registration">
      <h2>Register to Vote</h2>

      {error && (
        <div className="error-message">
          {error}
          {debugInfo && (
            <div className="debug-info">
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="accessKey">Access Key</label>
          <input
            id="accessKey"
            type="text"
            value={accessKey}
            onChange={(e) => setAccessKey(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="name">Your Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register to Vote"}
        </button>
      </form>
    </div>
  );
}

export default VoterRegistration;
