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

// Regular pages (maintain backward compatibility)
import Dashboard from "./pages/Dashboard/Dashboard";
import VotingPage from "./pages/Ballot/VotingPage";
import PreRegistration from "./pages/Verify/PreRegistration";
import VoterRegistration from "./pages/Verify/VoterRegistration";
import ScanID from "./pages/Verify/ScanID";

// Admin (Election Host) pages
import MyElections from "./pages/Elections/MyElections";
import ElectionDashboard from "./pages/Elections/ElectionDashboard";
import ElectionDetails from "./pages/Elections/ElectionDetails";
import ManageVoters from "./pages/Elections/ManageVoters";
import BallotBuilder from "./pages/Elections/BallotBuilder";

// Wrapper component for ScanID route
const ScanIDWrapper = () => {
  const navigate = useNavigate();
  const { id, slug } = useParams();

  return (
    <ScanID
      onComplete={(idData) => {
        // Navigate to the confirmation page in the PreRegistration component
        navigate(`/preregister/${id}/${slug}`, {
          state: { fromScan: true, idData },
        });
      }}
      onBack={() => navigate(`/verify-identity/${id}/${slug}`)}
    />
  );
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

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Router>
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

          {/* Voter Flow Routes */}
          <Route path="/vote/:id/:slug" element={<VotingPage />} />
          <Route path="/register/:id/:slug" element={<VotingPage />} />
          <Route
            path="/voter-registration/:id/:slug"
            element={<VoterRegistration />}
          />
          <Route path="/preregister/:id/:slug" element={<PreRegistration />} />
          <Route
            path="/verify-identity/:id/:slug"
            element={<PreRegistration startAtStep={1} />}
          />
          <Route path="/scan-id/:id/:slug" element={<ScanIDWrapper />} />

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
            <Route path="create-election" element={<BallotBuilder />} />
            <Route path="ballot-builder" element={<BallotBuilder />} />
          </Route>
        </Routes>
      </Router>
    </LocalizationProvider>
  );
}

export default App;
