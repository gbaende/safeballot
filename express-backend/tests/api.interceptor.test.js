/**
 * Unit tests for API interceptor route detection logic
 */

describe("API Interceptor Route Detection", () => {
  // Import the patterns from your api.js or recreate them here
  const VOTER_ROUTES = ["/register-voter", "/voter-vote", "/vote/"];
  const VOTER_ROUTE_PATTERNS = [
    /^\/ballots\/[^\/]+\/register-voter$/,
    /^\/ballots\/[^\/]+\/voter-vote$/,
    /^\/ballots\/register-with-key$/,
  ];

  // Helper function to replicate your interceptor's detection logic
  function isVoterRoute(url) {
    if (VOTER_ROUTES.some((route) => url.includes(route))) return true;
    if (VOTER_ROUTE_PATTERNS.some((pattern) => pattern.test(url))) return true;
    if (url.includes("register-voter")) return true;
    return false;
  }

  // Valid voter routes
  test("detects voter routes correctly", () => {
    expect(isVoterRoute("/ballots/123/register-voter")).toBeTruthy();
    expect(isVoterRoute("/ballots/abc-def/voter-vote")).toBeTruthy();
    expect(isVoterRoute("/ballots/register-with-key")).toBeTruthy();
    expect(isVoterRoute("/vote/123")).toBeTruthy();
  });

  // Admin routes that should not match
  test("does not match admin routes", () => {
    expect(isVoterRoute("/ballots")).toBeFalsy();
    expect(isVoterRoute("/ballots/123")).toBeFalsy();
    expect(isVoterRoute("/api/elections/recent")).toBeFalsy();
    expect(isVoterRoute("/admin/dashboard")).toBeFalsy();
    expect(isVoterRoute("/ballots/123/voters")).toBeFalsy();
  });

  // Edge cases
  test("handles edge cases correctly", () => {
    expect(isVoterRoute("/ballots/123/register-voter/extra")).toBeFalsy(); // Extra path segment
    expect(isVoterRoute("/marketing/vote-today")).toBeFalsy(); // Contains "vote" but not at path boundary
    expect(isVoterRoute("/something/register-voters")).toBeFalsy(); // Plural form
  });
});
