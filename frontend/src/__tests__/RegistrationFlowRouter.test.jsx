import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authSlice from "../store/authSlice";
import RegistrationFlowRouter from "../pages/Verify/RegistrationFlowRouter";

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
jest.mock("../pages/Verify/VerifyIdentity", () => {
  return function MockVerifyIdentity({ onComplete, onBack }) {
    return (
      <div data-testid="verify-identity">
        <h2>Verify Identity Screen</h2>
        <button data-testid="identity-complete" onClick={() => onComplete({})}>
          Complete Identity
        </button>
        <button data-testid="identity-back" onClick={onBack}>
          Back
        </button>
      </div>
    );
  };
});

jest.mock("../pages/Verify/ScanID", () => {
  return function MockScanID({ onComplete, onBack }) {
    return (
      <div data-testid="scan-id">
        <h2>Scan ID Screen</h2>
        <button
          data-testid="scan-complete"
          onClick={() =>
            onComplete({
              firstName: "John",
              lastName: "Doe",
              dateOfBirth: "1990-01-01",
              email: "john.doe@example.com",
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

jest.mock("../pages/Verify/ConfirmInfo", () => {
  return function MockConfirmInfo({ scannedIdData, onConfirm, onBack }) {
    return (
      <div data-testid="confirm-info">
        <h2>Confirm Info Screen</h2>
        <div data-testid="scanned-data">
          {scannedIdData?.firstName} {scannedIdData?.lastName}
        </div>
        <button data-testid="confirm-complete" onClick={() => onConfirm({})}>
          Confirm
        </button>
        <button data-testid="confirm-back" onClick={onBack}>
          Back
        </button>
      </div>
    );
  };
});

jest.mock("../pages/Verify/VerifiedScreen", () => {
  return function MockVerifiedScreen({ ballotInfo, voterInfo, onComplete }) {
    return (
      <div data-testid="verified-screen">
        <h2>Verified Screen</h2>
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

describe("RegistrationFlowRouter Integration Tests", () => {
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
        digital_key: "SAFE-BALLOT-ABC123-DEF456",
      },
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <RegistrationFlowRouter {...props} />
        </BrowserRouter>
      </Provider>
    );
  };

  describe("Full Registration Flow", () => {
    test("completes full flow: identity → scan → confirm → verified", async () => {
      renderComponent();

      // Wait for component to load and show identity screen
      await waitFor(() => {
        expect(screen.getByTestId("verify-identity")).toBeInTheDocument();
      });

      // Step 1: Complete identity verification
      fireEvent.click(screen.getByTestId("identity-complete"));

      // Should transition to scan screen
      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });

      // Step 2: Complete ID scan
      fireEvent.click(screen.getByTestId("scan-complete"));

      // Should transition to confirm screen
      await waitFor(() => {
        expect(screen.getByTestId("confirm-info")).toBeInTheDocument();
        expect(screen.getByTestId("scanned-data")).toHaveTextContent(
          "John Doe"
        );
      });

      // Step 3: Confirm information
      fireEvent.click(screen.getByTestId("confirm-complete"));

      // Should transition to verified screen
      await waitFor(() => {
        expect(screen.getByTestId("verified-screen")).toBeInTheDocument();
      });

      // Step 4: Complete verification and start voting
      fireEvent.click(screen.getByTestId("verified-complete"));

      // Should navigate to voting page
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          "/vote/test-ballot-id/test-slug"
        );
      });
    });

    test("handles back navigation correctly through flow", async () => {
      renderComponent();

      // Start at identity
      await waitFor(() => {
        expect(screen.getByTestId("verify-identity")).toBeInTheDocument();
      });

      // Go to scan
      fireEvent.click(screen.getByTestId("identity-complete"));
      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });

      // Go to confirm
      fireEvent.click(screen.getByTestId("scan-complete"));
      await waitFor(() => {
        expect(screen.getByTestId("confirm-info")).toBeInTheDocument();
      });

      // Back to scan
      fireEvent.click(screen.getByTestId("confirm-back"));
      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });

      // Back to identity
      fireEvent.click(screen.getByTestId("scan-back"));
      await waitFor(() => {
        expect(screen.getByTestId("verify-identity")).toBeInTheDocument();
      });
    });
  });

  describe("Screen Transitions", () => {
    test("identity screen appears first by default", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("verify-identity")).toBeInTheDocument();
        expect(screen.queryByTestId("scan-id")).not.toBeInTheDocument();
        expect(screen.queryByTestId("confirm-info")).not.toBeInTheDocument();
        expect(screen.queryByTestId("verified-screen")).not.toBeInTheDocument();
      });
    });

    test("can start from scan screen when coming from navigation state", async () => {
      // Mock useLocation to return state indicating we're coming from scan
      const mockUseLocation = jest.fn(() => ({
        state: {
          fromScan: true,
          idData: { firstName: "Jane", lastName: "Smith" },
        },
      }));

      jest.doMock("react-router-dom", () => ({
        ...jest.requireActual("react-router-dom"),
        useLocation: mockUseLocation,
        useParams: () => ({ id: "test-ballot-id", slug: "test-slug" }),
        useNavigate: () => mockNavigate,
      }));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("confirm-info")).toBeInTheDocument();
        expect(screen.getByTestId("scanned-data")).toHaveTextContent(
          "Jane Smith"
        );
      });
    });
  });

  describe("Data Management", () => {
    test("preserves scanned data through confirm step", async () => {
      renderComponent();

      // Navigate to scan
      await waitFor(() => {
        expect(screen.getByTestId("verify-identity")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("identity-complete"));

      // Complete scan
      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("scan-complete"));

      // Verify data is passed to confirm screen
      await waitFor(() => {
        expect(screen.getByTestId("confirm-info")).toBeInTheDocument();
        expect(screen.getByTestId("scanned-data")).toHaveTextContent(
          "John Doe"
        );
      });
    });

    test("stores verification status in localStorage", async () => {
      renderComponent();

      // Complete full flow
      await waitFor(() => {
        expect(screen.getByTestId("verify-identity")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("identity-complete"));

      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("scan-complete"));

      await waitFor(() => {
        expect(screen.getByTestId("confirm-info")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("confirm-complete"));

      await waitFor(() => {
        expect(screen.getByTestId("verified-screen")).toBeInTheDocument();
      });

      // Verify localStorage was called to store verification status
      expect(localStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining("verified_"),
        "true"
      );
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

      // Complete flow to verified screen
      await waitFor(() => {
        expect(screen.getByTestId("verify-identity")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("identity-complete"));

      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("scan-complete"));

      await waitFor(() => {
        expect(screen.getByTestId("confirm-info")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("confirm-complete"));

      // Should still reach verified screen despite API error (fallback)
      await waitFor(() => {
        expect(screen.getByTestId("verified-screen")).toBeInTheDocument();
      });
    });
  });

  describe("Registration Flow Specifics", () => {
    test("always includes ConfirmInfo step in registration flow", async () => {
      renderComponent();

      // Go through identity and scan
      await waitFor(() => {
        expect(screen.getByTestId("verify-identity")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("identity-complete"));

      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("scan-complete"));

      // Should ALWAYS show confirm step in registration flow
      await waitFor(() => {
        expect(screen.getByTestId("confirm-info")).toBeInTheDocument();
      });

      // ConfirmInfo should be present and functional
      expect(screen.getByTestId("confirm-complete")).toBeInTheDocument();
      expect(screen.getByTestId("confirm-back")).toBeInTheDocument();
    });

    test("uses VerifiedScreen component for final step", async () => {
      renderComponent();

      // Complete full flow
      await waitFor(() => {
        expect(screen.getByTestId("verify-identity")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("identity-complete"));

      await waitFor(() => {
        expect(screen.getByTestId("scan-id")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("scan-complete"));

      await waitFor(() => {
        expect(screen.getByTestId("confirm-info")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("confirm-complete"));

      // Should use VerifiedScreen (not LoginVerifiedScreen)
      await waitFor(() => {
        expect(screen.getByTestId("verified-screen")).toBeInTheDocument();
      });
    });
  });
});
