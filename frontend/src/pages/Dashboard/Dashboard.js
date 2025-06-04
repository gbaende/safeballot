// src/pages/Dashboard/Dashboard.js

import React, { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  TableSortLabel,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import useFetchBallots from "../../hooks/useFetchBallots";

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Greeting name
  const [userDisplayName, setUserDisplayName] = useState("Guest");
  const getUserDisplayName = useCallback(() => {
    try {
      if (user) {
        if (user.name) return user.name;
        if (user.email) return user.email.split("@")[0];
      }
      const admin = JSON.parse(localStorage.getItem("adminUser") || "{}");
      if (admin.name) return admin.name;
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      if (stored.name) return stored.name;
      const standalone =
        localStorage.getItem("adminName") ||
        localStorage.getItem("userName") ||
        localStorage.getItem("name");
      if (standalone) return standalone;
      const fallbackEmail =
        localStorage.getItem("adminEmail") ||
        localStorage.getItem("userEmail") ||
        localStorage.getItem("email");
      if (fallbackEmail) return fallbackEmail.split("@")[0];
      return "Guest";
    } catch {
      return "Guest";
    }
  }, [user]);

  useEffect(() => {
    setUserDisplayName(getUserDisplayName());
  }, [getUserDisplayName]);

  // Fetch the same elections/ballots as MyElections.js
  const { elections, loading, error } = useFetchBallots();

  // Derive the first active/live election
  const activeElection = elections.find(
    (e) => e.status === "active" || e.status === "live"
  );

  // Helper: format remaining time for active election
  const formatTimeRemaining = (election) => {
    if (!election) return "N/A";
    const endString =
      election._endDate || election.endDate || election.end_date;
    if (!endString) return "N/A";
    const endDate = new Date(endString);
    if (isNaN(endDate.getTime())) return "N/A";
    const now = new Date();
    if (endDate <= now) return "Ended";
    const diff = endDate - now;
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}s`;
  };

  // Helper: normalize status values
  const formatStatus = (status) => {
    if (!status) return "Draft";
    switch (status.toLowerCase()) {
      case "active":
      case "live":
        return "Live";
      case "completed":
        return "Completed";
      case "scheduled":
        return "Registration";
      case "draft":
        return "Draft";
      default:
        return status;
    }
  };

  // Helper: human-readable date
  const formatDateDisplay = (dateString) => {
    if (!dateString) return "Date unavailable";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "Invalid date";
    return d.toLocaleDateString();
  };

  // Helper: detailed time info for table rows
  const formatTimeInfo = (e) => {
    const start = e._startDate || e.startDate || e.start_date;
    const end = e._endDate || e.endDate || e.end_date;
    if (!start || !end) return "Date information not available";
    const now = new Date();
    const sd = new Date(start);
    const ed = new Date(end);
    if (sd > now) {
      return `Election starts ${sd.toLocaleString()}`;
    } else if (ed > now) {
      const diff = ed - now;
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}s remaining`;
    } else {
      return "Completed";
    }
  };

  // Helper: ensure allowedVoters is populated
  const getMaxVoterCount = (e) => {
    if (!e.allowedVoters || e.allowedVoters <= 0) {
      const src =
        e.voterCount || e.maxVoters || e.totalVoters || e.total_voters || 10;
      e.allowedVoters = src;
    }
    return e.allowedVoters;
  };

  // Helper: calculate ballots-received percentage
  const calculatePercentage = (e) => {
    const received = e.ballots_received || e.ballotsReceived || 0;
    const total = getMaxVoterCount(e);
    if (total <= 0) return 0;
    return Math.min(Math.round((received / total) * 100), 100);
  };

  return (
    <Box>
      {/* Header with greeting and create button */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5 }}>
            Hey, {userDisplayName}.
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back to Safe Ballot, let's ensure every vote counts.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            background: "linear-gradient(to right, #080E1D, #263C75)",
            "&:hover": {
              background: "linear-gradient(to right, #050912, #1d2e59)",
            },
            borderRadius: "4px",
          }}
          onClick={() => navigate("/create-election")}
        >
          Create Ballot
        </Button>
      </Box>

      {/* Active Election Card */}
      {activeElection && (
        <Box
          sx={{
            mb: 4,
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            p: 3,
            maxWidth: "40%",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Chip
              label="Voting is live"
              color="error"
              size="small"
              sx={{
                background: "linear-gradient(to right, #BA0000, #982323)",
                color: "white",
                fontWeight: 500,
              }}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "baseline" }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {formatTimeRemaining(activeElection)}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 400, ml: 1 }}>
              Remaining
            </Typography>
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 400, mb: 2 }}>
            {activeElection.title}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 500 }}
          >
            Voting time
          </Typography>
          <Typography variant="body1">
            {formatDateDisplay(
              activeElection.startDate || activeElection.start_date
            )}{" "}
            -{" "}
            {formatDateDisplay(
              activeElection.endDate || activeElection.end_date
            )}
          </Typography>
        </Box>
      )}

      {/* My Elections Table */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 500 }}>
          My Elections
        </Typography>
        <Button
          endIcon={<ArrowForwardIcon />}
          component={Link}
          to="/my-elections"
          sx={{
            color: "#2D3748",
            textTransform: "none",
            fontSize: "14px",
            border: "1px solid #E2E8F0",
            borderRadius: "4px",
            px: 2,
            py: 0.5,
          }}
        >
          View All
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error" sx={{ my: 2 }}>
          {error}
        </Typography>
      ) : elections.length === 0 ? (
        <Paper
          sx={{
            textAlign: "center",
            py: 4,
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            bgcolor: "#F7FAFC",
          }}
        >
          <Typography variant="h6" color="text.secondary">
            No elections found. Create your first ballot to get started.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              mt: 2,
              background: "linear-gradient(to right, #080E1D, #263C75)",
              "&:hover": {
                background: "linear-gradient(to right, #050912, #1d2e59)",
              },
              borderRadius: "4px",
            }}
            onClick={() => navigate("/create-election")}
          >
            Create Ballot
          </Button>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          sx={{ boxShadow: "none", border: "1px solid #E2E8F0" }}
        >
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#F7FAFC" }}>
                <TableCell>
                  <TableSortLabel active direction="desc">
                    Title
                  </TableSortLabel>
                </TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Ballots Received / Total Voters</TableCell>
                <TableCell>Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {elections.map((election) => (
                <TableRow
                  key={election.id}
                  hover
                  sx={{ height: "72px", cursor: "pointer" }}
                  onClick={() => navigate(`/elections/${election.id}`)}
                >
                  <TableCell sx={{ fontWeight: 500, py: 3 }}>
                    {election.title}
                  </TableCell>
                  <TableCell sx={{ py: 3 }}>
                    <Chip
                      label={formatStatus(election.status)}
                      size="small"
                      sx={{
                        bgcolor:
                          formatStatus(election.status) === "Live"
                            ? "#EAFDEE"
                            : "#EDF2F7",
                        color:
                          formatStatus(election.status) === "Live"
                            ? "#2F855A"
                            : "#4A5568",
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <LinearProgress
                        variant="determinate"
                        value={calculatePercentage(election)}
                        sx={{
                          flexGrow: 1,
                          mr: 2,
                          height: 8,
                          borderRadius: 4,
                          bgcolor: "#EDF2F7",
                          ".MuiLinearProgress-bar": {
                            backgroundImage:
                              "linear-gradient(to right, #00005E, #4478EB)",
                          },
                        }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {election.ballots_received ||
                          election.ballotsReceived ||
                          0}
                        /{getMaxVoterCount(election)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{formatTimeInfo(election)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default Dashboard;
