import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useSelector } from "react-redux";
import MainLayout from "./components/layouts/MainLayout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/Dashboard/Dashboard";
import MyElections from "./pages/Elections/MyElections";
import ElectionDashboard from "./pages/Elections/ElectionDashboard";
import ElectionDetails from "./pages/Elections/ElectionDetails";
import ManageVoters from "./pages/Elections/ManageVoters";
import BallotBuilder from "./pages/Elections/BallotBuilder";

function App() {
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={!isAuthenticated ? <Login /> : <Navigate to="/" />}
        />
        <Route
          path="/register"
          element={!isAuthenticated ? <Register /> : <Navigate to="/" />}
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}
        >
          <Route index element={<Dashboard />} />
          <Route path="my-elections" element={<MyElections />} />
          <Route path="elections/:id" element={<ElectionDashboard />} />
          <Route path="elections/:id/details" element={<ElectionDetails />} />
          <Route path="elections/:id/voters" element={<ManageVoters />} />
          <Route path="create-election" element={<BallotBuilder />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
