import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Checkbox,
  InputBase,
  InputAdornment,
  LinearProgress,
  TableSortLabel,
  CircularProgress,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { ballotService } from "../../services/api";

const MyElections = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch elections from the API
  useEffect(() => {
    fetchElections();
  }, []);

  const fetchElections = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try the API first
      try {
        const response = await ballotService.getBallots();
        console.log("API response:", response);
        setElections(response.data.data || []);
      } catch (apiError) {
        console.error(
          "API fetch failed, using localStorage fallback:",
          apiError
        );

        // Fallback to localStorage
        const localBallots = JSON.parse(
          localStorage.getItem("userBallots") || "[]"
        );
        console.log("Retrieved from localStorage:", localBallots);

        if (localBallots.length > 0) {
          setElections(localBallots);
        } else {
          // For demo purposes only - fallback data
          setElections([
            {
              id: 1,
              title: "Sample Election - Demo Mode",
              status: "scheduled",
              total_voters: 800,
              ballots_received: 100,
              start_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
              end_date: new Date(Date.now() + 7 * 86400000).toISOString(), // week from now
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error fetching elections:", error);
      setError("Failed to fetch elections. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate time remaining or format start time
  const formatTimeInfo = (election) => {
    const now = new Date();
    const startDate = new Date(election.start_date);
    const endDate = new Date(election.end_date);

    if (startDate > now) {
      return `Election starts ${startDate.toLocaleString()}`;
    } else if (endDate > now) {
      const diffMs = endDate - now;
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);

      return `${diffHrs}:${diffMins.toString().padStart(2, "0")}:${diffSecs
        .toString()
        .padStart(2, "0")}s remaining`;
    } else {
      return "Completed";
    }
  };

  // Helper function to determine status
  const getStatus = (election) => {
    const now = new Date();
    const startDate = new Date(election.start_date);
    const endDate = new Date(election.end_date);

    if (election.status === "draft") return "Draft";
    if (startDate > now) return "Registration";
    if (endDate > now) return "Live";
    return "Inactive";
  };

  const filteredElections = elections.filter((election) =>
    election.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      setSelected(filteredElections.map((election) => election.id));
      return;
    }
    setSelected([]);
  };

  const handleSelectClick = (id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, id];
    } else {
      newSelected = selected.filter((item) => item !== id);
    }

    setSelected(newSelected);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  const handleRowClick = (id) => {
    navigate(`/elections/${id}`);
  };

  return (
    <Box sx={{ pt: 4 }}>
      {/* Header with Page Title and Create Button */}
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
            My Elections
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

      {/* Filters Row */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Button
          startIcon={<FilterListIcon />}
          endIcon={<KeyboardArrowDownIcon />}
          variant="outlined"
          sx={{
            borderColor: "#E2E8F0",
            color: "#4A5568",
            textTransform: "none",
            boxShadow: "none",
            "&:hover": {
              borderColor: "#CBD5E0",
              backgroundColor: "#F7FAFC",
            },
          }}
        >
          More filters
        </Button>

        <Paper
          sx={{
            display: "flex",
            alignItems: "center",
            height: 40,
            px: 2,
            borderRadius: "4px",
            border: "1px solid #E2E8F0",
            boxShadow: "none",
          }}
        >
          <InputBase
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startAdornment={
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#A0AEC0", mr: 1 }} />
              </InputAdornment>
            }
            sx={{ ml: 1, flex: 1 }}
          />
        </Paper>
      </Box>

      {/* Loading state */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Empty state */}
      {!loading && !error && filteredElections.length === 0 && (
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
      )}

      {/* Election Table */}
      {!loading && !error && filteredElections.length > 0 && (
        <TableContainer
          component={Paper}
          sx={{ boxShadow: "none", border: "1px solid #E2E8F0" }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#F7FAFC" }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={
                      selected.length > 0 &&
                      selected.length < filteredElections.length
                    }
                    checked={
                      filteredElections.length > 0 &&
                      selected.length === filteredElections.length
                    }
                    onChange={handleSelectAllClick}
                    sx={{
                      color: "#CBD5E0",
                      "&.Mui-checked": {
                        color: "#3182CE",
                      },
                    }}
                  />
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active
                    direction="desc"
                    sx={{ fontWeight: 500, color: "#4A5568" }}
                  >
                    Title
                  </TableSortLabel>
                </TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Ballots Received / Total Voters</TableCell>
                <TableCell>Election Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredElections.map((election) => {
                const isItemSelected = isSelected(election.id);

                return (
                  <TableRow
                    hover
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={election.id}
                    selected={isItemSelected}
                    sx={{ height: "72px", cursor: "pointer" }}
                    onClick={() => handleRowClick(election.id)}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isItemSelected}
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                        sx={{
                          color: "#CBD5E0",
                          "&.Mui-checked": {
                            color: "#3182CE",
                          },
                        }}
                      />
                    </TableCell>
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
                          value={
                            (election.ballots_received /
                              election.total_voters) *
                            100
                          }
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
                        <Typography variant="body2">
                          {election.ballots_received}/{election.total_voters}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 3 }}>
                      {formatTimeInfo(election)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default MyElections;
