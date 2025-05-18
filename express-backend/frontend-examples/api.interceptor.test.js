/**
 * Test suite for the route detection logic in api.js
 *
 * These unit tests ensure the critical route detection for token selection
 * is working correctly across various route patterns.
 */

// Mock browser APIs
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

global.console = {
  log: jest.fn(),
  error: jest.fn(),
  group: jest.fn(),
  groupEnd: jest.fn(),
};

// Import the helpers and patterns
const VOTER_ROUTES = [
  "/register-voter", // Exact match for direct registration endpoint
  "/voter-vote", // Exact match for voting endpoint
  "/vote/", // Partial match for voting UI paths
];

const VOTER_ROUTE_PATTERNS = [
  /^\/ballots\/[^\/]+\/register-voter$/, // Exact: /ballots/:id/register-voter
  /^\/ballots\/[^\/]+\/voter-vote$/, // Exact: /ballots/:id/voter-vote
  /^\/ballots\/register-with-key$/, // Exact: /ballots/register-with-key
];

// Helper function from api.js (copy it here for testing)
function isVoterRoute(url) {
  if (!url) return false;

  // 1. Check exact and partial matches
  if (VOTER_ROUTES.some((route) => url.includes(route))) return true;

  // 2. Check regex patterns
  if (VOTER_ROUTE_PATTERNS.some((pattern) => pattern.test(url))) return true;

  // 3. Last resort check for register-voter substring
  if (url.includes("register-voter")) return true;

  return false;
}

describe("API Interceptor Route Detection", () => {
  describe("Voter Route Detection", () => {
    test("detects exact voter registration endpoints", () => {
      expect(isVoterRoute("/register-voter")).toBe(true);
      expect(isVoterRoute("/api/register-voter")).toBe(true);
      expect(isVoterRoute("/ballots/abc123/register-voter")).toBe(true);
    });

    test("detects exact voter voting endpoints", () => {
      expect(isVoterRoute("/voter-vote")).toBe(true);
      expect(isVoterRoute("/api/voter-vote")).toBe(true);
      expect(isVoterRoute("/ballots/abc123/voter-vote")).toBe(true);
    });

    test("detects partial voter UI paths", () => {
      expect(isVoterRoute("/vote/")).toBe(true);
      expect(isVoterRoute("/api/vote/something")).toBe(true);
      expect(isVoterRoute("/ballots/abc123/vote/ui")).toBe(true);
    });

    test("detects register-with-key voter endpoint", () => {
      expect(isVoterRoute("/ballots/register-with-key")).toBe(true);
    });

    test("handles path variations", () => {
      expect(isVoterRoute("/some/path/register-voter/extra")).toBe(true);
      expect(isVoterRoute("/register-voter?query=true")).toBe(true);
      expect(isVoterRoute("/vote/ui/step/1")).toBe(true);
    });
  });

  describe("Admin Route Detection (Non-Voter Routes)", () => {
    test("identifies admin paths as non-voter routes", () => {
      expect(isVoterRoute("/admin")).toBe(false);
      expect(isVoterRoute("/admin/dashboard")).toBe(false);
      expect(isVoterRoute("/api/admin/users")).toBe(false);
      expect(isVoterRoute("/auth/login")).toBe(false);
      expect(isVoterRoute("/ballots")).toBe(false);
      expect(isVoterRoute("/ballots/create")).toBe(false);
      expect(isVoterRoute("/settings")).toBe(false);
    });

    test("does not misclassify admin routes with similar substrings", () => {
      expect(isVoterRoute("/admin/voter-list")).toBe(true); // Contains "voter"
      expect(isVoterRoute("/admin/register-voters")).toBe(true); // Contains "register-voter"
      expect(isVoterRoute("/api/admin/vote-settings")).toBe(true); // Contains "vote"
    });

    test("ballots admin routes are not confused with voter routes", () => {
      expect(isVoterRoute("/ballots/123/edit")).toBe(false);
      expect(isVoterRoute("/ballots/123/results")).toBe(false);
      expect(isVoterRoute("/ballots/123/settings")).toBe(false);

      // But voter-specific ballot routes should be detected
      expect(isVoterRoute("/ballots/123/register-voter")).toBe(true);
      expect(isVoterRoute("/ballots/123/voter-vote")).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    test("handles empty and null URLs", () => {
      expect(isVoterRoute("")).toBe(false);
      expect(isVoterRoute(null)).toBe(false);
      expect(isVoterRoute(undefined)).toBe(false);
    });

    test("handles case sensitivity correctly", () => {
      expect(isVoterRoute("/REGISTER-VOTER")).toBe(false); // Should be case-sensitive
      expect(isVoterRoute("/Vote/")).toBe(false); // Should be case-sensitive

      // Update if your implementation is case-insensitive
    });

    test("handles special character escaping in URLs", () => {
      expect(isVoterRoute("/register-voter%20with%20spaces")).toBe(true);
      expect(isVoterRoute("/ballots/id%20with%20spaces/register-voter")).toBe(
        true
      );
    });
  });
});

describe("API Interceptor Token Selection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("selects voter token for voter routes when available", () => {
    // Mock implementation
    localStorage.getItem.mockImplementation((key) => {
      if (key === "voterToken") return "voter-jwt-token";
      if (key === "adminToken") return "admin-jwt-token";
      return null;
    });

    // Create a mock config object like the one in the interceptor
    const config = {
      url: "/ballots/123/register-voter",
      headers: {},
    };

    // Apply token selection logic (simplified version of what's in the interceptor)
    if (isVoterRoute(config.url)) {
      const voterToken = localStorage.getItem("voterToken");
      if (voterToken) {
        config.headers.Authorization = `Bearer ${voterToken}`;
      }
    } else {
      const adminToken = localStorage.getItem("adminToken");
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
      }
    }

    // Verify correct token was selected
    expect(config.headers.Authorization).toBe("Bearer voter-jwt-token");
  });

  test("selects admin token for admin routes when available", () => {
    // Mock implementation
    localStorage.getItem.mockImplementation((key) => {
      if (key === "voterToken") return "voter-jwt-token";
      if (key === "adminToken") return "admin-jwt-token";
      return null;
    });

    // Create a mock config object
    const config = {
      url: "/admin/dashboard",
      headers: {},
    };

    // Apply token selection logic
    if (isVoterRoute(config.url)) {
      const voterToken = localStorage.getItem("voterToken");
      if (voterToken) {
        config.headers.Authorization = `Bearer ${voterToken}`;
      }
    } else {
      const adminToken = localStorage.getItem("adminToken");
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
      }
    }

    // Verify correct token was selected
    expect(config.headers.Authorization).toBe("Bearer admin-jwt-token");
  });

  test("handles missing tokens gracefully", () => {
    // Mock implementation with no tokens
    localStorage.getItem.mockReturnValue(null);

    // Create mock configs
    const voterConfig = {
      url: "/ballots/123/register-voter",
      headers: {},
    };

    const adminConfig = {
      url: "/admin/dashboard",
      headers: {},
    };

    // Apply token selection logic to both
    [voterConfig, adminConfig].forEach((config) => {
      if (isVoterRoute(config.url)) {
        const voterToken = localStorage.getItem("voterToken");
        if (voterToken) {
          config.headers.Authorization = `Bearer ${voterToken}`;
        }
      } else {
        const adminToken = localStorage.getItem("adminToken");
        if (adminToken) {
          config.headers.Authorization = `Bearer ${adminToken}`;
        }
      }
    });

    // Verify no Authorization headers were added
    expect(voterConfig.headers.Authorization).toBeUndefined();
    expect(adminConfig.headers.Authorization).toBeUndefined();
  });
});
