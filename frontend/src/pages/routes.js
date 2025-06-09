import React from "react";
import { Route, Navigate } from "react-router-dom";
import MainLayout from "../components/layouts/MainLayout";

// Auth pages
import Login from "./auth/Login";
import Register from "./auth/Register";

// Legacy imports (for backward compatibility)
import Dashboard from "./Dashboard/Dashboard";
import MyElections from "./Elections/MyElections";
import ElectionDashboard from "./Elections/ElectionDashboard";
import ElectionDetails from "./Elections/ElectionDetails";
import ManageVoters from "./Elections/ManageVoters";
import BallotBuilder from "./Elections/BallotBuilder";
import ElectionResults from "./Elections/ElectionResults";
import VotingPage from "./Ballot/VotingPage";
import PreRegistration from "./Verify/PreRegistration";
import VoterRegistration from "./Verify/VoterRegistration";
import ScanID from "./Verify/ScanID";

// New organized imports
import * as AdminPages from "./admin";
import * as VoterPages from "./voter";
import DirectVoterRegistration from "./voter/DirectVoterRegistration";

// Helper for creating the ScanID wrapper
const createScanIDWrapper = (ScanIDComponent) => {
  return ({ navigate, params }) => {
    const { id, slug } = params;

    return (
      <ScanIDComponent
        onComplete={(idData) => {
          navigate(`/verify-registration/${id}/${slug}`, {
            state: { fromScan: true, idData },
          });
        }}
        onBack={() => navigate(`/verify-identity/${id}/${slug}`)}
      />
    );
  };
};

// Routes configuration
const getRoutes = (isAuthenticated) => {
  const ScanIDWrapper = createScanIDWrapper(ScanID);

  return (
    <>
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
        element={<DirectVoterRegistration />}
      />
      <Route path="/preregister/:id/:slug" element={<PreRegistration />} />
      <Route
        path="/verify-identity/:id/:slug"
        element={<PreRegistration startAtStep={1} />}
      />
      <Route path="/scan-id/:id/:slug" element={<ScanIDWrapper />} />

      {/* Admin Flow Routes - Protected by Authentication */}
      <Route
        path="/"
        element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}
      >
        <Route index element={<Dashboard />} />
        <Route path="my-elections" element={<MyElections />} />
        <Route path="elections/:id" element={<ElectionDashboard />} />
        <Route path="elections/:id/details" element={<ElectionDetails />} />
        <Route path="elections/:id/voters" element={<ManageVoters />} />
        <Route path="elections/:id/results" element={<ElectionResults />} />
        <Route path="create-election" element={<BallotBuilder />} />
      </Route>
    </>
  );
};

export default getRoutes;
