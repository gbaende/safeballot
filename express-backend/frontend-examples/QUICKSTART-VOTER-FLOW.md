# Quick Start Guide for Voter Registration Flow

This guide provides step-by-step instructions for implementing the fixed voter registration and authentication flow.

## Overview of the Problem

The previous implementation had these issues:

- The voter JWT token wasn't properly stored after registration
- The token wasn't attached to subsequent API calls
- This caused 401 errors when trying to access protected endpoints

## Implementation Steps

### 1. Configure API with Token Interceptor

First, make sure you're using the API instance that properly handles tokens:

```javascript
// In your API configuration file
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  // These routes should use the voter token
  const voterRoutes = ["/register-voter", "/voter-vote", "/ballots/vote"];
  const isVoterRoute = voterRoutes.some((route) => config.url.includes(route));

  // Get tokens from storage
  const voterToken = localStorage.getItem("voterToken");
  const adminToken = localStorage.getItem("adminToken");

  // Determine which token to use
  let token = null;
  if (isVoterRoute && voterToken) {
    token = voterToken;
    console.log(`Using voter token for ${config.url}`);
  } else if (adminToken) {
    token = adminToken;
  }

  // Attach token if available
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
```

### 2. Update Voter Registration Component

Make these key changes in your voter registration component:

```javascript
import api from "../utils/api"; // Use the configured API

// Store token immediately after receiving it
async function handleRegistration() {
  try {
    // First call to register with access key
    const response = await api.post("/ballots/register-with-key", {
      accessKey,
      name,
      email,
    });

    const { token, voter, ballot } = response.data.data;

    // CRUCIAL STEP: Store the token immediately
    localStorage.setItem("voterToken", token);

    // Also store voter info
    localStorage.setItem(
      "voterInfo",
      JSON.stringify({
        name: voter.name,
        email: voter.email,
        voterId: voter.id,
        ballotId: ballot.id,
      })
    );

    console.log("Token stored:", token.substring(0, 15) + "...");

    // Make sure to pause briefly before the next call
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Now call the register-voter endpoint
    await api.post(`/ballots/${ballot.id}/register-voter`);

    // Continue to the voting page
    navigate(`/vote/${ballot.id}`);
  } catch (error) {
    console.error("Registration error:", error);
  }
}
```

### 3. Debugging the Token Flow

Add this code to debug token issues:

```javascript
// Add to the voter registration component
function debugTokens() {
  const voterToken = localStorage.getItem("voterToken");
  const adminToken = localStorage.getItem("adminToken");

  console.group("Token Debug");
  console.log(
    "Voter Token:",
    voterToken ? `exists (${voterToken.substring(0, 10)}...)` : "missing"
  );
  console.log(
    "Admin Token:",
    adminToken ? `exists (${adminToken.substring(0, 10)}...)` : "missing"
  );
  console.groupEnd();
}

// Call this before making the register-voter call
debugTokens();
```

### 4. Test the Registration Flow

To fully test the registration flow:

1. Clear your browser localStorage:

   ```javascript
   localStorage.clear();
   ```

2. Register with the access key form

3. Before submitting, add these debug statements:

   ```javascript
   // After registration success
   console.log(
     "Token immediately after storage:",
     localStorage.getItem("voterToken")
   );

   // Before register-voter call
   console.log(
     "Token before protected call:",
     localStorage.getItem("voterToken")
   );
   ```

4. Check the Network tab in DevTools:
   - Verify the /register-with-key request succeeds
   - Verify the token is stored in localStorage
   - Verify the /register-voter request includes the Authorization header
   - Verify the /register-voter request succeeds (200 status)

### 5. Manual Fallback (If Needed)

If you still have issues, try this manual approach:

```javascript
// After storing the token
const token = localStorage.getItem("voterToken");

// Make direct call with explicit token
const response = await fetch(`/api/ballots/${ballotId}/register-voter`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
});
```

## Troubleshooting

If you still encounter 401 errors:

1. Verify the token is stored in localStorage:

   ```javascript
   console.log("Voter token:", localStorage.getItem("voterToken"));
   ```

2. Check the request headers in the Network tab:

   - Look for the Authorization header with "Bearer [token]"

3. Verify the token is valid by testing:

   ```javascript
   const token = localStorage.getItem("voterToken");
   const response = await fetch("/api/auth/validate-token", {
     headers: {
       Authorization: `Bearer ${token}`,
     },
   });
   const data = await response.json();
   console.log("Token validity:", data);
   ```

4. Add a small delay after token storage:

   ```javascript
   // Add a small delay to ensure storage completes
   await new Promise((resolve) => setTimeout(resolve, 100));
   ```

5. If all else fails, add a manual retry mechanism:
   ```javascript
   async function registerVoterWithRetry(ballotId, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         const token = localStorage.getItem("voterToken");
         if (!token) {
           console.error(`Attempt ${i + 1}: No token available`);
           await new Promise((resolve) => setTimeout(resolve, 500));
           continue;
         }

         console.log(`Attempt ${i + 1}: Making request with token`);
         const response = await api.post(`/ballots/${ballotId}/register-voter`);
         console.log("Success!");
         return response;
       } catch (error) {
         console.error(`Attempt ${i + 1} failed:`, error);
         await new Promise((resolve) => setTimeout(resolve, 500));
       }
     }
     throw new Error(`Failed after ${maxRetries} attempts`);
   }
   ```
