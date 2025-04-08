import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useSelector } from "react-redux";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Verify from "./pages/Verify";
import OTP from "./pages/OTP";
import VoterID from "./pages/VoterID";
import Biometric from "./pages/Biometric";
import Dashboard from "./pages/Dashboard";
import Elections from "./pages/Elections";
import BallotBuilder from "./pages/Elections/BallotBuilder";
import ElectionDetail from "./pages/Elections/ElectionDetail";
import ElectionResults from "./pages/Elections/ElectionResults";
import ManageVoters from "./pages/Elections/ManageVoters";
import Ballot from "./pages/Ballot";
import BallotConfirm from "./pages/Ballot/BallotConfirm";
import BallotSuccess from "./pages/Ballot/BallotSuccess";
import BallotSummary from "./pages/Ballot/BallotSummary";
import VerifyConfirm from "./pages/Verify/VerifyConfirm";
import VerifySuccess from "./pages/Verify/VerifySuccess";

// Components
// import WelcomeScreen from "./components/Common/WelcomeScreen";

// Theme
import theme from "./styles/theme";

// Auth Guard Component
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Landing Page - Register Screen */}
          <Route path="/" element={<Register />} />

          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/verify"
            element={
              <PrivateRoute>
                <Verify />
              </PrivateRoute>
            }
          />
          <Route
            path="/verify/confirm"
            element={
              <PrivateRoute>
                <VerifyConfirm />
              </PrivateRoute>
            }
          />
          <Route
            path="/verify/success"
            element={
              <PrivateRoute>
                <VerifySuccess />
              </PrivateRoute>
            }
          />
          <Route
            path="/otp"
            element={
              <PrivateRoute>
                <OTP />
              </PrivateRoute>
            }
          />
          <Route
            path="/voter-id"
            element={
              <PrivateRoute>
                <VoterID />
              </PrivateRoute>
            }
          />
          <Route
            path="/biometric"
            element={
              <PrivateRoute>
                <Biometric />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/elections"
            element={
              <PrivateRoute>
                <Elections />
              </PrivateRoute>
            }
          />
          <Route
            path="/election/:id"
            element={
              <PrivateRoute>
                <ElectionDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/election/:id/results"
            element={
              <PrivateRoute>
                <ElectionResults />
              </PrivateRoute>
            }
          />
          <Route
            path="/election/:id/voters"
            element={
              <PrivateRoute>
                <ManageVoters />
              </PrivateRoute>
            }
          />
          <Route
            path="/ballot/new"
            element={
              <PrivateRoute>
                <BallotBuilder />
              </PrivateRoute>
            }
          />
          <Route
            path="/ballot/:id"
            element={
              <PrivateRoute>
                <Ballot />
              </PrivateRoute>
            }
          />
          <Route
            path="/ballot/:id/confirm"
            element={
              <PrivateRoute>
                <BallotConfirm />
              </PrivateRoute>
            }
          />
          <Route
            path="/ballot/:id/summary"
            element={
              <PrivateRoute>
                <BallotSummary />
              </PrivateRoute>
            }
          />
          <Route
            path="/ballot/:id/success"
            element={
              <PrivateRoute>
                <BallotSuccess />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
