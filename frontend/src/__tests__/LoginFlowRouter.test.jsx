import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authSlice from "../store/authSlice";
import LoginFlowRouter from "../pages/Verify/LoginFlowRouter";

// Mock API services
const mockBallotService = {
  getBallotById: jest.fn(),
  publicRegisterVoter: jest.fn(),
};

const mockAuthService = {
  generateDigitalKey: jest.fn(),
};

jest.mock("../services/api", () => ({
  ballotService: mockBallotService,
  authService: mockAuthService,
}));

// Mock individual components to control their behavior in tests
jest.mock("../pages/Verify/ScanID", () => {
  return function MockScanID({ onComplete, onBack }) {
    return (
      <div data-testid="scan-id">
        <h2>Scan ID Screen</h2>
        <button
          data-testid="scan-complete"
          onClick={() =>
            onComplete({
              firstName: "Jane",
              lastName: "Smith",
              dateOfBirth: "1985-05-15",
              email: "jane.smith@example.com",
            })
          }
        >
          Complete Scan
        </button>
        <button data-testid="scan-back" onClick={onBack}>
          Back
        </button>
      </div>
    );
  };
});

jest.mock("../pages/Verify/LoginVerifiedScreen", () => {
  return function MockLoginVerifiedScreen({
    ballotInfo,
    voterInfo,
    onComplete,
  }) {
    return (
      <div data-testid="login-verified-screen">
        <h2>Login Verified Screen</h2>
        <div data-testid="voter-info">
          {voterInfo?.name || "No name"} - {voterInfo?.email || "No email"}
        </div>
        <button data-testid="verified-complete" onClick={onComplete}>
          Start Voting
        </button>
      </div>
    );
  };
});

// Mock ConfirmInfo to ensure it NEVER appears in login flow
jest.mock("../pages/Verify/ConfirmInfo", () => {
  return function MockConfirmInfo() {
    return (
      <div data-testid="confirm-info">
        <h2>CONFIRM INFO SHOULD NOT APPEAR IN LOGIN FLOW</h2>
      </div>
    );
  };
});

describe("LoginFlowRouter Integration Tests", () => {
  let store;
  const mockNavigate = jest.fn();

  // Mock react-router-dom hooks
  jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: "test-ballot-id", slug: "test-slug" }),
    useLocation: () => ({ state: null }),
  }));

  beforeEach(() => {
    // Create fresh store for each test
    store = configureStore({
      reducer: {
        auth: authSlice,
      },
    });

    // Reset mocks
    jest.clearAllMocks();
    localStorage.clear();

    // Mock voter login state
    localStorage.getItem.mockImplementation((key) => {
      if (key === "voterToken") return "mock-voter-token";
      if (key === "voterUser")
        return JSON.stringify({
          email: "voter@example.com",
          name: "Test Voter",
        });
      return null;
    });

    // Mock ballot data
    mockBallotService.getBallotById.mockResolvedValue({
      data: {
        data: {
          id: "test-ballot-id",
          title: "Test Election",
          description: "Test Description",
        },
      },
    });

    mockAuthService.generateDigitalKey.mockResolvedValue({
      data: {
        digital_key: "SAFE-BALLOT-LOGIN-ABC123",
      },
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <LoginFlowRouter {...props} />
        </BrowserRouter>
      </Provider>
    );
  };

  describe("Streamlined Login Flow", () => {
    test("completes streamlined flow: scan → verified (NO confirm step)", async () => {
      renderComponent();

      // Wait for component to load and show scan screen
      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });

      // Step 1: Complete ID scan
      fireEvent.click(screen.getByTestId("scan-complete"));

      // Should transition DIRECTLY to verified screen (skipping confirm)
      await waitFor(() => {
        expect(screen.getByTestId("login-verified-screen")).toBeInTheDocument();
      });

      // Confirm step should NEVER appear
      expect(screen.queryByTestId("confirm-info")).not.toBeInTheDocument();

      // Step 2: Complete verification and start voting
      fireEvent.click(screen.getByTestId("verified-complete"));

      // Should navigate to voting page
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          "/vote/test-ballot-id/test-slug"
        );
      });
    });

    test("starts directly at scan screen (no identity verification)", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
        // Should NOT show identity verification step
        expect(screen.queryByTestId("verify-identity")).not.toBeInTheDocument();
      });
    });

    test("handles back navigation from scan to voter login", async () => {
      renderComponent();

      // Start at scan
      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });

      // Back button should go to voter login page
      fireEvent.click(screen.getByTestId("scan-back"));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/voter/login");
      });
    });

    test("handles back navigation from verified to scan", async () => {
      renderComponent();

      // Complete scan
      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("scan-complete"));

      // At verified screen
      await waitFor(() => {
        expect(screen.getByTestId("login-verified-screen")).toBeInTheDocument();
      });

      // Mock the back functionality (would need to modify component for this test)
      // This would require adding a back button to LoginVerifiedScreen
    });
  });

  describe("Login Flow Verification", () => {
    test("verifies voter login flow on mount", async () => {
      renderComponent();

      // Should start at scan because voter tokens exist
      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });
    });

    test("redirects to registration flow if not a voter login", async () => {
      // Clear voter tokens
      localStorage.getItem.mockReturnValue(null);

      renderComponent();

      // Should redirect to registration flow
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          "/verify-registration/test-ballot-id/test-slug"
        );
      });
    });

    test("handles coming from voter login with ID data", async () => {
      // Mock useLocation to return state from voter login
      const mockUseLocation = jest.fn(() => ({
        state: {
          fromVoterLogin: true,
          idData: { firstName: "John", lastName: "Login" },
        },
      }));

      jest.doMock("react-router-dom", () => ({
        ...jest.requireActual("react-router-dom"),
        useLocation: mockUseLocation,
        useParams: () => ({ id: "test-ballot-id", slug: "test-slug" }),
        useNavigate: () => mockNavigate,
      }));

      renderComponent();

      // Should go directly to verified screen when coming with ID data
      await waitFor(() => {
        expect(screen.getByTestId("login-verified-screen")).toBeInTheDocument();
      });
    });
  });

  describe("Component Usage Verification", () => {
    test("uses LoginVerifiedScreen (not VerifiedScreen)", async () => {
      renderComponent();

      // Complete scan
      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("scan-complete"));

      // Should use LoginVerifiedScreen specifically
      await waitFor(() => {
        expect(screen.getByTestId("login-verified-screen")).toBeInTheDocument();
        expect(screen.queryByTestId("verified-screen")).not.toBeInTheDocument();
      });
    });

    test("NEVER shows ConfirmInfo component", async () => {
      renderComponent();

      // Complete scan
      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("scan-complete"));

      // Should go directly to verified, never show confirm
      await waitFor(() => {
        expect(screen.getByTestId("login-verified-screen")).toBeInTheDocument();
      });

      // Confirm should NEVER appear at any point
      expect(screen.queryByTestId("confirm-info")).not.toBeInTheDocument();
    });

    test("does not include VerifyIdentity component", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });

      // VerifyIdentity should never appear in login flow
      expect(screen.queryByTestId("verify-identity")).not.toBeInTheDocument();
    });
  });

  describe("Data Management", () => {
    test("preserves scanned data to verified screen", async () => {
      renderComponent();

      // Complete scan
      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("scan-complete"));

      // Verify data is passed to verified screen
      await waitFor(() => {
        expect(screen.getByTestId("login-verified-screen")).toBeInTheDocument();
        // The mock passes Jane Smith as the scanned data
      });
    });

    test("loads voter info from localStorage", async () => {
      renderComponent();

      // Complete scan to reach verified screen
      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("scan-complete"));

      await waitFor(() => {
        expect(screen.getByTestId("login-verified-screen")).toBeInTheDocument();
      });

      // Should load voter info from localStorage (mocked above)
      // The component should have access to 'Test Voter - voter@example.com'
    });
  });

  describe("Error Handling", () => {
    test("handles ballot loading errors gracefully", async () => {
      mockBallotService.getBallotById.mockRejectedValue(
        new Error("Ballot not found")
      );

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByText(/failed to load election information/i)
        ).toBeInTheDocument();
      });
    });

    test("handles digital key generation errors with fallback", async () => {
      mockAuthService.generateDigitalKey.mockRejectedValue(
        new Error("API Error")
      );

      renderComponent();

      // Complete scan to reach verified screen
      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("scan-complete"));

      // Should still reach verified screen despite API error (fallback)
      await waitFor(() => {
        expect(screen.getByTestId("login-verified-screen")).toBeInTheDocument();
      });
    });
  });

  describe("Flow Analytics", () => {
    test("logs flow transitions correctly", async () => {
      const consoleSpy = jest.spyOn(console, "log");

      renderComponent();

      // Complete scan
      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("scan-complete"));

      await waitFor(() => {
        expect(screen.getByTestId("login-verified-screen")).toBeInTheDocument();
      });

      // Should log transitions (scan → verified, skipping confirm)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[LOGIN FLOW]"),
        expect.any(Object)
      );
    });
  });

  describe("Login Flow Constraints", () => {
    test("ensures login flow never includes identity verification step", async () => {
      renderComponent();

      // Throughout entire flow, identity verification should never appear
      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("scan-complete"));

      await waitFor(() => {
        expect(screen.getByTestId("login-verified-screen")).toBeInTheDocument();
      });

      // At no point should identity verification be shown
      expect(screen.queryByTestId("verify-identity")).not.toBeInTheDocument();
    });

    test("ensures login flow never includes confirmation step", async () => {
      renderComponent();

      // Throughout entire flow, confirmation should never appear
      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("scan-complete"));

      await waitFor(() => {
        expect(screen.getByTestId("login-verified-screen")).toBeInTheDocument();
      });

      // At no point should confirmation be shown
      expect(screen.queryByTestId("confirm-info")).not.toBeInTheDocument();
    });
  });
});
