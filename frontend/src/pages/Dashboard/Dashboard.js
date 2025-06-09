// src/pages/Dashboard/Dashboard.js

import React, { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  format,
  isValid,
  formatDistanceToNow,
  isFuture,
  isPast,
} from "date-fns";
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
  const { elections: allElections, loading, error } = useFetchBallots();

  // Get top 5 elections by total voters (largest first)
  const elections = React.useMemo(() => {
    if (!allElections || allElections.length === 0) return [];

    return allElections
      .map((election) => {
        // Ensure we have the voter count data processed
        const totalVoters =
          election.totalVoters ||
          election.total_voters ||
          election.voterCount ||
          election.maxVoters ||
          0;
        return {
          ...election,
          totalVoters,
          total_voters: totalVoters,
        };
      })
      .sort((a, b) => {
        const aVoters = a.totalVoters || a.total_voters || 0;
        const bVoters = b.totalVoters || b.total_voters || 0;
        return bVoters - aVoters; // Sort by largest first
      })
      .slice(0, 5); // Take only top 5
  }, [allElections]);

  // Get the largest election (first in the sorted list) as the active election
  const activeElection = React.useMemo(() => {
    if (!elections || elections.length === 0) return null;
    return elections[0]; // The largest election by voters
  }, [elections]);

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

  // Helper: human-readable date
  const formatDateDisplay = (dateString) => {
    if (!dateString) return "Date unavailable";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "Invalid date";
    return d.toLocaleDateString();
  };

  // Helper functions matching MyElections.js exactly
  const formatTimeInfo = (election) => {
    if (!election) return "Date information not available";

    const start =
      election._startDate || election.startDate || election.start_date;
    const end = election._endDate || election.endDate || election.end_date;

    if (!start || !end) {
      return "Date information not available";
    }

    try {
      const now = new Date();
      const startDate = new Date(start);
      const endDate = new Date(end);

      // Check if dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return "Invalid date format";
      }

      const currentTime = now.getTime();
      const startTime = startDate.getTime();
      const endTime = endDate.getTime();

      if (currentTime < startTime) {
        // Election hasn't started yet
        return `Election starts ${startDate.toLocaleString()}`;
      } else if (currentTime >= startTime && currentTime <= endTime) {
        // Election is currently active
        const timeLeft = endTime - currentTime;
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor(
          (timeLeft % (1000 * 60 * 60)) / (1000 * 60)
        );
        const secondsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000);

        if (hoursLeft > 0) {
          return `${hoursLeft}:${minutesLeft
            .toString()
            .padStart(2, "0")}:${secondsLeft
            .toString()
            .padStart(2, "0")}s remaining`;
        } else if (minutesLeft > 0) {
          return `${minutesLeft}:${secondsLeft
            .toString()
            .padStart(2, "0")}s remaining`;
        } else {
          return `${secondsLeft}s remaining`;
        }
      } else {
        // Election has ended
        return "Completed";
      }
    } catch (error) {
      console.error("Error parsing dates:", error);
      return "Date parsing error";
    }
  };

  // Helper function to determine status - EXACT copy from MyElections.js
  const getStatus = (election) => {
    try {
      // Get date values (try both camelCase and snake_case properties)
      const startDateValue = election.startDate || election.start_date;
      const endDateValue = election.endDate || election.end_date;

      if (!startDateValue || !endDateValue) {
        return election.status || "Draft";
      }

      const now = new Date();
      const startDate = new Date(startDateValue);
      const endDate = new Date(endDateValue);

      // Check if dates are valid
      if (!isValid(startDate) || !isValid(endDate)) {
        return election.status || "Draft";
      }

      if (election.status === "draft") return "Draft";
      if (isFuture(startDate)) return "Registration";
      if (isFuture(endDate)) return "Live";
      return "Inactive";
    } catch (error) {
      console.error("Error determining status:", error);
      return election.status || "Draft";
    }
  };

  // Function to get the maximum voter count set by admin - EXACT copy from MyElections.js
  const getMaxVoterCount = (election) => {
    // Add an immediate console log to confirm this function is called
    console.log(
      "DASHBOARD: getMaxVoterCount CALLED for election:",
      election.id,
      election.title
    );

    // FORCE CRITICAL PREPROCESSING - this ensures data is consistent
    if (!election.allowedVoters || election.allowedVoters <= 0) {
      const sourceValue =
        election.voterCount ||
        election.maxVoters ||
        election.totalVoters ||
        election.total_voters ||
        10;
      console.log(
        `DASHBOARD: Adding missing allowedVoters=${sourceValue} for election ${election.id}`
      );
      election.allowedVoters = sourceValue;
      election.voterCount = sourceValue;
      election.maxVoters = sourceValue;
    }

    // Log all the relevant fields for debugging
    const fields = {
      allowedVoters: election.allowedVoters,
      voterCount: election.voterCount,
      maxVoters: election.maxVoters,
      totalVoters: election.totalVoters,
      total_voters: election.total_voters,
    };

    console.log(
      `DASHBOARD: Voter count fields for "${election.title}" (${election.id}):`,
      fields
    );

    // Return the exact same allowedVoters value we've standardized
    return election.allowedVoters;
  };

  // Update the percentage calculation for the progress bar - EXACT copy from MyElections.js
  const percentage = (election) => {
    // Get the ballots received (actual votes cast)
    const received = election.ballots_received || election.ballotsReceived || 0;

    // Get the admin-set maximum voter count (NOT the count of registered voters)
    const total = getMaxVoterCount(election);

    // Prevent division by zero
    if (total <= 0) return 0;

    // Calculate percentage with a cap at 100%
    return Math.min(Math.round((received / total) * 100), 100);
  };

  // Helper function to determine the status message for inactive elections
  const getStatusMessage = (election) => {
    if (getStatus(election) === "Live") {
      return formatTimeRemaining(election);
    }

    // For inactive elections, check if it's not started yet or completed
    const startString =
      election._startDate || election.startDate || election.start_date;
    if (!startString) return "Completed";

    const startDate = new Date(startString);
    if (isNaN(startDate.getTime())) return "Completed";

    const now = new Date();
    if (startDate > now) {
      return "Not Started";
    } else {
      return "Completed";
    }
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
          {/* 1) State of voting */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Chip
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: "white",
                    }}
                  />
                  {getStatus(activeElection) === "Live"
                    ? "Voting is live"
                    : "Inactive"}
                </Box>
              }
              size="small"
              sx={{
                background:
                  getStatus(activeElection) === "Live"
                    ? "linear-gradient(to right, #BA0000, #982323)"
                    : "linear-gradient(to right, #9E9E9E, #757575)",
                color: "white",
                fontWeight: 500,
              }}
            />
          </Box>

          {/* 2) Time remaining or "Completed" */}
          <Box sx={{ display: "flex", alignItems: "baseline" }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {getStatusMessage(activeElection)}
            </Typography>
            {getStatus(activeElection) === "Live" && (
              <Typography variant="h5" sx={{ fontWeight: 400, ml: 1 }}>
                Remaining
              </Typography>
            )}
          </Box>

          {/* 3) Title of the election */}
          <Typography variant="h6" sx={{ fontWeight: 400, mb: 2 }}>
            {activeElection.title}
          </Typography>

          {/* 4) Voting time label */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 500 }}
          >
            Voting time
          </Typography>

          {/* 5) Start date - end date */}
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
                <TableCell>Election Time</TableCell>
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
                      label={getStatus(election)}
                      size="small"
                      sx={{
                        bgcolor:
                          getStatus(election) === "Live"
                            ? "#EAFDEE"
                            : getStatus(election) === "Registration"
                            ? "#EDF2F7"
                            : "#EDF2F7",
                        color:
                          getStatus(election) === "Live"
                            ? "#2F855A"
                            : getStatus(election) === "Registration"
                            ? "#4A5568"
                            : "#4A5568",
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <LinearProgress
                        variant="determinate"
                        value={percentage(election)}
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
                  <TableCell sx={{ py: 3 }}>
                    {formatTimeInfo(election)}
                  </TableCell>
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
