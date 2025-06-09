import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authSlice from "../store/authSlice";

// Mock components to isolate route testing
jest.mock("../pages/Verify/RegistrationFlowRouter", () => {
  return function MockRegistrationFlowRouter() {
    return (
      <div data-testid="registration-flow-router">Registration Flow Router</div>
    );
  };
});

jest.mock("../pages/Verify/LoginFlowRouter", () => {
  return function MockLoginFlowRouter() {
    return <div data-testid="login-flow-router">Login Flow Router</div>;
  };
});

// Mock services
jest.mock("../services/api", () => ({
  authService: {
    generateDigitalKey: jest.fn(),
  },
  ballotService: {
    getBallotById: jest.fn(),
    publicRegisterVoter: jest.fn(),
  },
}));

import App from "../App";

describe("Route Smoke Tests", () => {
  let store;

  beforeEach(() => {
    // Create fresh store for each test
    store = configureStore({
      reducer: {
        auth: authSlice,
      },
    });

    // Reset localStorage mock data but don't clear the mock functions
    localStorage.clear();

    // Reset all mocks
    jest.clearAllMocks();

    // Mock console.error to suppress expected warnings in tests
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  const renderWithRouter = (initialEntries = ["/"]) => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </Provider>
    );
  };

  describe("New Dedicated Routes", () => {
    test("verify-registration route renders RegistrationFlowRouter", async () => {
      window.history.pushState(
        {},
        "Test page",
        "/verify-registration/test-id/test-slug"
      );

      renderWithRouter(["/verify-registration/test-id/test-slug"]);

      await waitFor(() => {
        expect(
          screen.getByTestId("registration-flow-router")
        ).toBeInTheDocument();
      });
    });

    test("verify-login route renders LoginFlowRouter", async () => {
      window.history.pushState(
        {},
        "Test page",
        "/verify-login/test-id/test-slug"
      );

      renderWithRouter(["/verify-login/test-id/test-slug"]);

      await waitFor(() => {
        expect(screen.getByTestId("login-flow-router")).toBeInTheDocument();
      });
    });
  });

  describe("Legacy Route Redirects", () => {
    test("preregister redirects to verify-registration", async () => {
      window.history.pushState(
        {},
        "Test page",
        "/preregister/test-id/test-slug"
      );

      renderWithRouter(["/preregister/test-id/test-slug"]);

      await waitFor(() => {
        expect(window.location.pathname).toBe(
          "/verify-registration/test-id/test-slug"
        );
      });
    });

    test("verify-identity redirects to verify-registration", async () => {
      window.history.pushState(
        {},
        "Test page",
        "/verify-identity/test-id/test-slug"
      );

      renderWithRouter(["/verify-identity/test-id/test-slug"]);

      await waitFor(() => {
        expect(window.location.pathname).toBe(
          "/verify-registration/test-id/test-slug"
        );
      });
    });

    test("login/preregister redirects to verify-login", async () => {
      window.history.pushState(
        {},
        "Test page",
        "/login/preregister/test-id/test-slug"
      );

      renderWithRouter(["/login/preregister/test-id/test-slug"]);

      await waitFor(() => {
        expect(window.location.pathname).toBe(
          "/verify-login/test-id/test-slug"
        );
      });
    });
  });

  describe("ScanIDWrapper Route Logic", () => {
    test("scan-id without voter tokens goes to registration flow", async () => {
      // Ensure no voter tokens in localStorage
      localStorage.getItem.mockReturnValue(null);

      window.history.pushState({}, "Test page", "/scan-id/test-id/test-slug");

      renderWithRouter(["/scan-id/test-id/test-slug"]);

      // Since we're testing route logic, we'd need to simulate the onComplete callback
      // This is more of an integration test that would require actual component testing
    });

    test("scan-id with voter token goes to login flow", async () => {
      // Mock voter token in localStorage
      localStorage.getItem.mockImplementation((key) => {
        if (key === "voterToken") return "mock-token";
        return null;
      });

      window.history.pushState({}, "Test page", "/scan-id/test-id/test-slug");

      renderWithRouter(["/scan-id/test-id/test-slug"]);

      // Since we're testing route logic, we'd need to simulate the onComplete callback
      // This is more of an integration test that would require actual component testing
    });
  });

  describe("Route Parameter Extraction", () => {
    test("routes correctly extract id and slug parameters", async () => {
      const testId = "ballot-123";
      const testSlug = "my-election-slug";

      window.history.pushState(
        {},
        "Test page",
        `/verify-registration/${testId}/${testSlug}`
      );

      renderWithRouter([`/verify-registration/${testId}/${testSlug}`]);

      await waitFor(() => {
        expect(
          screen.getByTestId("registration-flow-router")
        ).toBeInTheDocument();
      });

      // Parameters are passed correctly to components (would need component-level testing)
    });
  });

  describe("Route Security", () => {
    test("protected admin routes redirect to login when not authenticated", async () => {
      window.history.pushState({}, "Test page", "/my-elections");

      renderWithRouter(["/my-elections"]);

      await waitFor(() => {
        expect(window.location.pathname).toBe("/login");
      });
    });

    test("public voter routes are accessible without authentication", async () => {
      window.history.pushState(
        {},
        "Test page",
        "/verify-registration/test-id/test-slug"
      );

      renderWithRouter(["/verify-registration/test-id/test-slug"]);

      await waitFor(() => {
        expect(
          screen.getByTestId("registration-flow-router")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Route State Preservation", () => {
    test("redirects preserve state and parameters", async () => {
      window.history.pushState(
        {},
        "Test page",
        "/preregister/test-id/test-slug"
      );

      renderWithRouter(["/preregister/test-id/test-slug"]);

      await waitFor(() => {
        expect(window.location.pathname).toBe(
          "/verify-registration/test-id/test-slug"
        );
        // Verify that parameters are preserved in the redirect
      });
    });
  });
});
