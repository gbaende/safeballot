# Session Management Guidelines

This document provides instructions for implementing proper role-based session management in the frontend to avoid token collisions between admin and voter roles.

## Overview

The application supports two distinct user roles:

- **Admin** - Users who create and manage ballots
- **Voter** - Users who register to vote on a specific ballot

Each role uses a separate authentication flow and should maintain isolated session information.

## Token Storage Structure

### Admin Session

```javascript
// When an admin logs in:
localStorage.setItem("adminToken", token);
localStorage.setItem("adminEmail", user.email);
localStorage.setItem("adminName", user.name);
```

### Voter Session

```javascript
// When a voter registers:
localStorage.setItem("voterToken", token);
localStorage.setItem(
  `voter_info_${ballotId}`,
  JSON.stringify({
    name,
    email,
    voterId,
  })
);
```

## Axios Interceptor Implementation

The following Axios interceptor should be used to automatically select the appropriate token:

```javascript
axios.interceptors.request.use((config) => {
  const path = window.location.pathname;

  const isAdminRoute =
    path.startsWith("/admin") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/elections");

  const isVoterRoute =
    path.startsWith("/vote") ||
    path.startsWith("/ballot/access") ||
    path.startsWith("/preregister");

  const token = isAdminRoute
    ? localStorage.getItem("adminToken")
    : isVoterRoute
    ? localStorage.getItem("voterToken")
    : null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
```

## Login & Logout Handlers

### Admin Login

```javascript
const loginAdmin = async (email, password) => {
  try {
    const response = await axios.post("/api/auth/login", { email, password });
    const { token, user } = response.data.data;

    localStorage.setItem("adminToken", token);
    localStorage.setItem("adminEmail", user.email);
    localStorage.setItem("adminName", user.name);

    // Do NOT touch voterToken or voter info

    return { success: true, user };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || "Login failed",
    };
  }
};
```

### Voter Registration

```javascript
const registerVoter = async (accessKey, name, email) => {
  try {
    const response = await axios.post("/api/ballots/register-with-key", {
      accessKey,
      name,
      email,
    });

    const { token, voter, ballot } = response.data.data;

    localStorage.setItem("voterToken", token);
    localStorage.setItem(
      `voter_info_${ballot.id}`,
      JSON.stringify({
        name: voter.name,
        email: voter.email,
        voterId: voter.id,
        ballotId: ballot.id,
      })
    );

    // Do NOT touch adminToken or admin info

    return { success: true, voter, ballot };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || "Registration failed",
    };
  }
};
```

### Admin Logout

```javascript
const logoutAdmin = () => {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminEmail");
  localStorage.removeItem("adminName");

  // Do NOT remove voter session data
};
```

### Voter Logout

```javascript
const logoutVoter = () => {
  localStorage.removeItem("voterToken");

  // Clear all voter-related data
  Object.keys(localStorage).forEach((key) => {
    if (
      key.startsWith("voter_info_") ||
      key.startsWith("verified_") ||
      key.startsWith("voter_id_")
    ) {
      localStorage.removeItem(key);
    }
  });

  // Do NOT remove admin session data
};
```

## Route Guards

Implement route guards to prevent role confusion:

```javascript
useEffect(() => {
  const path = window.location.pathname;
  const adminToken = localStorage.getItem("adminToken");
  const voterToken = localStorage.getItem("voterToken");

  // Protect admin routes
  if (
    path.startsWith("/admin") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/elections")
  ) {
    if (!adminToken) {
      navigate("/login");
    }
  }

  // Protect voter routes
  if (path.startsWith("/vote")) {
    if (!voterToken) {
      navigate("/ballot/access");
    }
  }
}, []);
```

## Best Practices

1. **Never mix tokens** - Do not allow voter authentication data to influence admin authentication, and vice versa
2. **Route-specific token usage** - Always use the correct token for the appropriate route
3. **Role-aware UI** - Adjust the UI based on the current authenticated role
4. **Clean logout flows** - When logging out one role, do not affect the other role's session
5. **Ballot-specific voter data** - Store voter information keyed by the ballot ID to allow voting in multiple ballots

This approach ensures admin and voter sessions remain completely isolated, preventing any token collisions or session conflicts.
