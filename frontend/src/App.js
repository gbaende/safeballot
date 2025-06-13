import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { loginSuccess } from "./store/authSlice";
import MainLayout from "./components/layouts/MainLayout";

// Date picker components
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

// Auth pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import VoterLogin from "./pages/Verify/VoterLogin";
import OtpEntry from "./components/Auth/OtpEntry";
import VoterIdVerification from "./components/Auth/VoterIdVerification";

// Regular pages (maintain backward compatibility)
import Dashboard from "./pages/Dashboard/Dashboard";
import VotingPage from "./pages/Ballot/VotingPage";
import VoterRegistration from "./pages/Verify/VoterRegistration";
import ScanID from "./pages/Verify/ScanID";
import RegistrationFlowRouter from "./pages/Verify/RegistrationFlowRouter";
import LoginFlowRouter from "./pages/Verify/LoginFlowRouter";

// Admin (Election Host) pages
import MyElections from "./pages/Elections/MyElections";
import ElectionDashboard from "./pages/Elections/ElectionDashboard";
import ElectionDetails from "./pages/Elections/ElectionDetails";
import ElectionResults from "./pages/Elections/ElectionResults";
import ManageVoters from "./pages/Elections/ManageVoters";
import BallotBuilder from "./pages/Elections/BallotBuilder";
import BallotDebug from "./pages/Elections/BallotDebug";

// Add the PaymentSuccess import with the other component imports
import PaymentSuccess from "./pages/PaymentSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";

// Import the new AccessKeyRegistration component
import AccessKeyRegistration from "./pages/voter/AccessKeyRegistration";

// Import RegistrationSuccess component
import RegistrationSuccess from "./components/RegistrationSuccess";

// Import BlinkIDTest component
import BlinkIDTest from "./components/BlinkIDTest";

// Wrapper component for ScanID route
const ScanIDWrapper = () => {
  const navigate = useNavigate();
  const { id, slug } = useParams();

  return (
    <ScanID
      onComplete={(idData) => {
        // Check if this is from voter login flow
        const voterToken = localStorage.getItem("voterToken");
        const voterUser = localStorage.getItem("voterUser");
        const isFromVoterLogin = voterToken || voterUser;

        console.log("ScanIDWrapper - checking voter login:", {
          voterToken: !!voterToken,
          voterUser: !!voterUser,
          isFromVoterLogin: !!isFromVoterLogin,
        });

        if (isFromVoterLogin) {
          // For voter login flow, go to login flow router
          navigate(`/verify-login/${id}/${slug}`, {
            state: { fromVoterLogin: true, idData },
          });
        } else {
          // For registration flow, go to registration flow router
          navigate(`/verify-registration/${id}/${slug}`, {
            state: { fromScan: true, idData },
          });
        }
      }}
      onBack={() => navigate(`/verify-identity/${id}/${slug}`)}
    />
  );
};

// Redirect components for legacy routes
const LegacyPreregisterRedirect = () => {
  const { id, slug } = useParams();
  return <Navigate to={`/verify-registration/${id}/${slug}`} replace />;
};

const LegacyVerifyIdentityRedirect = () => {
  const { id, slug } = useParams();
  return <Navigate to={`/verify-registration/${id}/${slug}`} replace />;
};

const LegacyLoginPreregisterRedirect = () => {
  const { id, slug } = useParams();
  return <Navigate to={`/verify-login/${id}/${slug}`} replace />;
};

function App() {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Check for saved token on app load
  useEffect(() => {
    console.log("App mounted - checking for saved auth token");
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    console.log("Token in localStorage:", token ? "Present" : "Missing");
    console.log("User data in localStorage:", userStr ? "Present" : "Missing");

    if (token && userStr) {
      try {
        console.log("Attempting to restore authentication state");
        const user = JSON.parse(userStr);
        console.log("User data parsed successfully");
        dispatch(loginSuccess({ user, token }));
        console.log("Authentication state restored");
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    } else {
      console.log("No saved authentication state found");
    }
  }, [dispatch]);

  // Add this useEffect to clear API caches when the app starts
  useEffect(() => {
    // Clear API caches for election data
    console.log("App startup: Clearing election data caches");
    localStorage.removeItem("api_cache_/elections/recent");
    localStorage.removeItem("api_cache_/elections/upcoming");
    localStorage.removeItem("api_cache_/elections/summary");

    // Normalize any existing ballot data in localStorage
    try {
      const existingBallots = JSON.parse(
        localStorage.getItem("userBallots") || "[]"
      );

      if (existingBallots.length > 0) {
        console.log(
          `App startup: Normalizing ${existingBallots.length} ballots in localStorage`
        );

        // Process each ballot to ensure consistent voter data fields
        const normalizedBallots = existingBallots.map((ballot) => {
          // Skip if no valid ID
          if (!ballot.id) return ballot;

          // Ensure each ballot has the allowedVoters field properly set
          if (!ballot.allowedVoters || ballot.allowedVoters <= 0) {
            const sourceValue =
              ballot.voterCount ||
              ballot.maxVoters ||
              ballot.totalVoters ||
              ballot.total_voters ||
              10;
            console.log(
              `App startup: Setting allowedVoters=${sourceValue} for ballot ${ballot.id}`
            );
            ballot.allowedVoters = sourceValue;
          }

          // Ensure all related fields are consistent with allowedVoters
          ballot.voterCount = ballot.allowedVoters;
          ballot.maxVoters = ballot.allowedVoters;

          return ballot;
        });

        // Save normalized data back to localStorage
        localStorage.setItem("userBallots", JSON.stringify(normalizedBallots));
        console.log(
          "App startup: Successfully normalized ballot data in localStorage"
        );
      }
    } catch (error) {
      console.error("App startup: Error normalizing ballot data:", error);
    }
  }, []); // Empty dependency array means this runs once on app startup

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Authentication Routes */}
          <Route
            path="/login"
            element={!isAuthenticated ? <Login /> : <Navigate to="/" />}
          />
          <Route
            path="/register"
            element={!isAuthenticated ? <Register /> : <Navigate to="/" />}
          />
          <Route path="/voter/login" element={<VoterLogin />} />
          <Route path="/verify-otp" element={<OtpEntry />} />
          <Route path="/verify-voter-id" element={<VoterIdVerification />} />

          {/* Voter Flow Routes */}
          <Route path="/vote/:id/:slug" element={<VotingPage />} />
          <Route
            path="/voter-registration/:id/:slug"
            element={<VoterRegistration />}
          />
          <Route
            path="/voter/register/:id/:slug"
            element={<VoterRegistration />}
          />

          {/* New Dedicated Verified Routes */}
          {/* Registration Flow - Full process with confirmation */}
          <Route
            path="/verify-registration/:id/:slug"
            element={<RegistrationFlowRouter />}
          />
          {/* Login Flow - Streamlined process without confirmation */}
          <Route path="/verify-login/:id/:slug" element={<LoginFlowRouter />} />

          {/* Legacy Routes - Redirects to new dedicated routes */}
          <Route
            path="/preregister/:id/:slug"
            element={<LegacyPreregisterRedirect />}
          />
          <Route
            path="/verify-identity/:id/:slug"
            element={<LegacyVerifyIdentityRedirect />}
          />
          <Route
            path="/login/preregister/:id/:slug"
            element={<LegacyLoginPreregisterRedirect />}
          />
          <Route path="/scan-id/:id/:slug" element={<ScanIDWrapper />} />

          {/* Public Election Results Route */}
          <Route path="/elections/:id/results" element={<ElectionResults />} />

          {/* BlinkID Test Route */}
          <Route path="/blinkid-test" element={<BlinkIDTest />} />

          {/* Registration Success Route */}
          <Route
            path="/registration-success"
            element={<RegistrationSuccess />}
          />

          {/* Payment Success Route */}
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/checkout/cancel" element={<CheckoutCancel />} />

          {/* Access key routes */}
          <Route
            path="/ballot/access/:accessKey"
            element={<AccessKeyRegistration />}
          />
          <Route path="/ballot/key" element={<AccessKeyRegistration />} />

          {/* Admin (Election Host) Routes - Protected by Authentication */}
          <Route
            path="/"
            element={
              isAuthenticated ? <MainLayout /> : <Navigate to="/login" />
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="my-elections" element={<MyElections />} />
            <Route path="elections/:id" element={<ElectionDashboard />} />
            <Route path="elections/:id/details" element={<ElectionDetails />} />
            <Route path="elections/:id/voters" element={<ManageVoters />} />
            <Route path="elections/:id/results" element={<ElectionResults />} />
            <Route path="create-election" element={<BallotBuilder />} />
            <Route path="ballot-builder" element={<BallotBuilder />} />
            <Route path="elections/:id/debug" element={<BallotDebug />} />
          </Route>
        </Routes>
      </Router>
    </LocalizationProvider>
  );
}

export default App;
