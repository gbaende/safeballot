# SafeBallot Authentication System

This document provides a comprehensive overview of the authentication system implemented in SafeBallot, focusing on its security, token handling, and session management.

## Table of Contents

1. [Key Authentication Concepts](#key-authentication-concepts)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [Session Isolation](#session-isolation)
5. [Directory Structure](#directory-structure)
6. [Testing Authentication](#testing-authentication)

## Key Authentication Concepts

SafeBallot implements a role-based authentication system using JSON Web Tokens (JWT) with two distinct user roles:

- **Admin**: Users who create and manage ballots, invite voters, and view results.
- **Voter**: Temporary users who access the system only to vote on a specific ballot.

Key aspects:

1. **Separate Token Stores**: Admin and voter tokens are stored in different localStorage keys to prevent collisions.
2. **JWT-Based Authentication**: All authentication uses JWTs for stateless verification.
3. **Role-Embedded Tokens**: Each token includes a role claim to identify access level.
4. **Backend Middleware**: Role-specific middleware ensures proper authorization.

## Backend Implementation

### Admin Authentication Flow

1. Admin registers or logs in via `/auth/register` or `/auth/login`
2. On success, backend generates a JWT token containing admin role and ID
3. Token is sent to frontend and must be included in all admin requests

### Voter Authentication Flow

1. Voter receives access key from admin
2. Voter exchanges key for JWT token via `/ballots/register-with-key`
3. Voter completes registration with personal info via `/ballots/:id/register-voter`
4. Token must be included in all subsequent voter-related requests

### Token Structure

#### Admin Token

```
{
  "userId": "<admin-user-id>",
  "email": "admin@example.com",
  "role": "admin",
  "iat": 1625097600,
  "exp": 1625184000
}
```

#### Voter Token

```
{
  "voterId": "<voter-id>",
  "ballotId": "<ballot-id>",
  "role": "voter",
  "iat": 1625097600,
  "exp": 1625184000
}
```

### Authentication Middleware

The backend implements three main middleware functions:

1. **`protect`**: Verifies token validity and user existence
2. **`adminAccess`**: Ensures the user has admin role
3. **`voterAuth`**: Validates voter tokens specifically for ballot access

## Frontend Implementation

### Parallel Session Strategy

SafeBallot supports concurrent admin and voter sessions in different browser tabs through a route-based token selection strategy:

1. **Token Storage**:

   - Admin tokens are stored in `localStorage.getItem('adminToken')`
   - Voter tokens are stored in `localStorage.getItem('voterToken')`

2. **API Interceptor**:

   - Analyzes each request URL to determine if it's a voter or admin route
   - Automatically selects and attaches the appropriate token
   - Allows parallel sessions without interference

3. **Token Refresh Flow**:
   - Handles 401 responses by attempting to refresh tokens
   - Maintains separate refresh tokens for admin and voter sessions
   - Transparently retries failed requests with refreshed tokens

### Route Detection Logic

The API interceptor uses precise pattern matching to determine which token to use:

```javascript
// Voter routes are detected using these patterns
const VOTER_ROUTE_PATTERNS = [
  /^\/ballots\/[^\/]+\/register-voter$/,
  /^\/ballots\/[^\/]+\/voter-vote$/,
  /^\/ballots\/register-with-key$/,
];

// And these route keywords
const VOTER_ROUTES = ["/register-voter", "/voter-vote", "/vote/"];
```

### Implementation Guidelines

1. **Use Axios Interceptors**: Configure interceptors to handle authentication headers automatically.
2. **Store Tokens Immediately**: When receiving tokens from login/registration endpoints, store them immediately.
3. **Implement Role Checks**: Verify the current role before rendering sensitive components.
4. **Handle Token Expiration**: Implement token refresh mechanisms for long sessions.
5. **Clear on Logout**: Remove appropriate tokens based on which role is logging out.

## Session Isolation

SafeBallot provides complete isolation between admin and voter sessions:

1. **Token Independence**: Admin and voter tokens are stored and managed independently
2. **Route-Based Selection**: The authentication strategy automatically selects the proper token based on the route
3. **Multi-Tab Support**: An admin and voter session can be active simultaneously in different tabs
4. **No Token Clearing**: Tokens are only cleared during explicit logout, not when switching contexts

### Logout Handling

For maximum security, the logout functionality clears all authentication data:

```javascript
export async function logout() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("voterToken");
  localStorage.removeItem("voterInfo");
  localStorage.removeItem("adminRefreshToken");
  localStorage.removeItem("voterRefreshToken");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("authState");

  return { success: true };
}
```

## Directory Structure

```
express-backend/
├── middleware/
│   └── auth.middleware.js  # Authentication middleware
├── controllers/
│   ├── auth.controller.js  # Admin auth endpoints
│   └── voter.controller.js # Voter auth endpoints
├── models/
│   ├── user.model.js       # Admin user model
│   └── voter.model.js      # Voter model
└── frontend-examples/      # Reference implementation examples
    ├── api.js              # API with token interceptor
    ├── authUtils.js        # Authentication utilities
    ├── VoterRegistration.js # Voter flow example
    └── api.interceptor.test.js # Route detection tests
```

## Testing Authentication

### Admin Authentication

```bash
# Register admin
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@example.com","password":"securepassword"}'

# Login admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"securepassword"}'

# Access protected admin endpoint
curl -X GET http://localhost:5000/api/ballots \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### Voter Authentication

```bash
# Exchange access key for voter token
curl -X POST http://localhost:5000/api/ballots/register-with-key \
  -H "Content-Type: application/json" \
  -d '{"accessKey":"AB12CD34"}'

# Complete voter registration
curl -X POST http://localhost:5000/api/ballots/123/register-voter \
  -H "Authorization: Bearer <VOTER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Voter Name","email":"voter@example.com"}'

# Access protected voter endpoint
curl -X GET http://localhost:5000/api/ballots/123/voter-vote \
  -H "Authorization: Bearer <VOTER_TOKEN>"
```

### Testing Parallel Sessions

To verify the parallel session support:

1. Open your application in two different browser tabs
2. Log in as admin in the first tab
3. Register as a voter in the second tab
4. Verify both sessions remain active and functional
5. Confirm requests use the correct token based on context

For more detailed implementation examples, refer to the frontend example files in `express-backend/frontend-examples/`.
