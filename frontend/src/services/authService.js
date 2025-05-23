/**
 * Get the authentication header for API requests
 * @returns {Promise<Object>} The authentication header
 */
export const getAuthHeader = async () => {
  // Try multiple token sources in order of priority
  const token =
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("voterToken");

  if (!token) {
    console.warn("No authentication token found");
    return null;
  }

  // Make sure token is properly formatted
  const authHeader = token.startsWith("Bearer ")
    ? { Authorization: token }
    : { Authorization: `Bearer ${token}` };

  return authHeader;
};
