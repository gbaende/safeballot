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
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { electionService } from "../../services/api";

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Use state to trigger re-render when user data changes
  const [userDisplayName, setUserDisplayName] = useState("Guest");
  const [recentElections, setRecentElections] = useState([]);
  const [upcomingElections, setUpcomingElections] = useState([]);
  const [activeElection, setActiveElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load the user display name and fetch elections when the component mounts
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

    // Fetch elections data
    fetchElectionsData();

    return () => clearInterval(intervalId);
  }, []);

  // Function to fetch elections data from the API
  const fetchElectionsData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try API first
      try {
        // Get recent elections
        const recentResponse = await electionService.getRecentElections();

        // Get upcoming elections
        const upcomingResponse = await electionService.getUpcomingElections();

        // Get summary data
        const summaryResponse = await electionService.getSummary();

        // Set active election (first active election if any)
        const allElections = [
          ...(recentResponse.data.data || []),
          ...(upcomingResponse.data.data || []),
        ];
        const activeElection = allElections.find(
          (election) =>
            election.status === "active" || election.status === "live"
        );

        setRecentElections(recentResponse.data.data || []);
        setUpcomingElections(upcomingResponse.data.data || []);
        setActiveElection(activeElection || null);
      } catch (apiError) {
        console.error(
          "API call failed, using localStorage fallback:",
          apiError
        );

        // Fallback to localStorage if API fails
        const localBallots = JSON.parse(
          localStorage.getItem("userBallots") || "[]"
        );
        console.log("Retrieved ballots from localStorage:", localBallots);

        if (localBallots.length > 0) {
          // Split into recent and upcoming based on dates
          const now = new Date();
          const upcoming = localBallots.filter(
            (b) => new Date(b.start_date) > now
          );
          const active = localBallots.filter(
            (b) => new Date(b.start_date) <= now && new Date(b.end_date) >= now
          );
          const completed = localBallots.filter(
            (b) => new Date(b.end_date) < now
          );

          // Set as recent and upcoming
          setRecentElections([...active, ...completed]);
          setUpcomingElections(upcoming);

          // Set active election if any
          if (active.length > 0) {
            setActiveElection(active[0]);
          }

          console.log("Using localStorage data instead of API data");
        } else {
          // No local data either
          setRecentElections([]);
          setUpcomingElections([]);
          console.log("No elections found in localStorage");
        }
      }
    } catch (err) {
      console.error("Error fetching elections data:", err);
      setError("Failed to load elections data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

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

  // Combine recent and upcoming elections for display
  const elections = [...recentElections, ...upcomingElections];

  // Helper function to format election status
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

  // Helper function to calculate time remaining
  const formatTimeRemaining = (endDate) => {
    if (!endDate) return "N/A";

    const end = new Date(endDate);
    const now = new Date();

    if (end <= now) return "Ended";

    const diffMs = end - now;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${diffHrs}:${diffMins.toString().padStart(2, "0")}:${diffSecs
      .toString()
      .padStart(2, "0")}s`;
  };

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
              {formatTimeRemaining(activeElection.end_date)}
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
            {new Date(activeElection.start_date).toLocaleDateString()} -{" "}
            {new Date(activeElection.end_date).toLocaleDateString()}
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
                <TableCell>Ballots Recieved / # of Voters</TableCell>
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
                      label={formatStatus(election.status)}
                      color={
                        formatStatus(election.status) === "Live"
                          ? "success"
                          : "default"
                      }
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
                        value={
                          (election.ballots_received / election.total_voters) *
                            100 || 0
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
                        {election.ballots_received || 0}/
                        {election.total_voters || 0}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {election.status === "active" || election.status === "live"
                      ? formatTimeRemaining(election.end_date) + " remaining"
                      : election.status === "scheduled"
                      ? `Election starts ${new Date(
                          election.start_date
                        ).toLocaleString()}`
                      : `Election ended ${new Date(
                          election.end_date
                        ).toLocaleDateString()}`}
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
