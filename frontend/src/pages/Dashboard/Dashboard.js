import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Use state to trigger re-render when user data changes
  const [userDisplayName, setUserDisplayName] = useState("Guest");

  // Load the user display name when the component mounts
  useEffect(() => {
    const name = getUserDisplayName();
    setUserDisplayName(name);

    // Set up an interval to check for changes in user data
    const intervalId = setInterval(() => {
      const newName = getUserDisplayName();
      if (newName !== userDisplayName) {
        setUserDisplayName(newName);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Function to get user's name from storage or email - matching MainLayout approach
  const getUserDisplayName = () => {
    try {
      // Force reload user data from localStorage each time
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        // Always prioritize email username over name field
        if (userData.email) return userData.email.split("@")[0];
        if (userData.name) return userData.name;
      }

      // Try direct email approach
      const email = localStorage.getItem("userEmail");
      if (email) return email.split("@")[0];

      // Last resort, check Redux
      if (user && user.email) return user.email.split("@")[0];

      return "Guest";
    } catch (error) {
      console.error("Error getting user display name:", error);
      return "Guest";
    }
  };

  // Ensure fresh data on every render
  const displayName = getUserDisplayName();

  // Mock active election data
  const activeElection = {
    id: 1,
    title: "2024 Presidential Election - General Ballot",
    status: "Live",
    remainingTime: "3:12:16s",
    startDate: "Nov 5th",
    endDate: "Nov 12",
    votersCount: 800,
    ballotsReceived: 100,
  };

  // Mock elections data
  const elections = [
    {
      id: 1,
      title: "2024 Presidential Election - General Ballot",
      status: "Live",
      ballotsReceived: 100,
      totalVoters: 800,
      timeInfo: "3:12:16s remaining",
    },
    {
      id: 2,
      title: "Statewide Ballot Measure: Healthcare Reform Initiative",
      status: "Registration",
      ballotsReceived: 0,
      totalVoters: 500,
      timeInfo: "Election starts Dec. 12, 12:00am PST",
    },
    {
      id: 3,
      title: "Measure Z: Public Transportation Funding",
      status: "Registration",
      ballotsReceived: 0,
      totalVoters: 500,
      timeInfo: "Election starts Dec. 12, 12:00am PST",
    },
  ];

  return (
    <Box>
      {/* Header with Greeting and Create Ballot Button */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 500, mb: 0.5 }}>
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
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Chip
              label="Voting is live"
              color="error"
              size="small"
              icon={
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    bgcolor: "white",
                    borderRadius: "50%",
                    ml: 1,
                  }}
                />
              }
              sx={{
                background: "linear-gradient(to right, #BA0000, #982323)",
                color: "white",
                mr: 2,
                height: "24px",
                fontWeight: 500,
                "& .MuiChip-icon": {
                  color: "white",
                  mr: 0.5,
                },
              }}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "baseline" }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {activeElection.remainingTime}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 400, ml: 1 }}>
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
            {activeElection.startDate} - {activeElection.endDate}
          </Typography>
        </Box>
      )}

      {/* My Elections Section */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 500 }}>
          My Elections
        </Typography>
        <Button
          endIcon={<ArrowForwardIcon />}
          sx={{
            color: "#2D3748",
            textTransform: "none",
            fontSize: "14px",
            border: "1px solid #E2E8F0",
            borderRadius: "4px",
            px: 2,
            py: 0.5,
          }}
          component={Link}
          to="/my-elections"
        >
          View All
        </Button>
      </Box>

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
              <TableCell>Ballots Recieved / # of Voters</TableCell>
              <TableCell>Election Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {elections.map((election) => (
              <TableRow key={election.id} hover sx={{ height: "72px" }}>
                <TableCell sx={{ fontWeight: 500, py: 3 }}>
                  {election.title}
                </TableCell>
                <TableCell sx={{ py: 3 }}>
                  <Chip
                    label={election.status}
                    color={election.status === "Live" ? "success" : "default"}
                    size="small"
                    sx={{
                      bgcolor:
                        election.status === "Live" ? "#EAFDEE" : "#EDF2F7",
                      color: election.status === "Live" ? "#2F855A" : "#4A5568",
                      fontWeight: 500,
                    }}
                  />
                </TableCell>
                <TableCell sx={{ py: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <LinearProgress
                      variant="determinate"
                      value={
                        (election.ballotsReceived / election.totalVoters) * 100
                      }
                      sx={{
                        flexGrow: 1,
                        mr: 2,
                        height: 8,
                        borderRadius: 4,
                        bgcolor: "#EDF2F7",
                        ".MuiLinearProgress-bar": {
                          bgcolor: "#4A5568",
                        },
                      }}
                    />
                    <Typography variant="body2">
                      {election.ballotsReceived}/{election.totalVoters}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{election.timeInfo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Dashboard;
