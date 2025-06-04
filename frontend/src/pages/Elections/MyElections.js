import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  const dataFetchedRef = useRef(false);

  // Fetch elections from the API only once on mount
  useEffect(() => {
    fetchElections();
  }, []);

  const fetchElections = async () => {
    // Don't fetch if we've already done so
    if (dataFetchedRef.current) return;

    // Mark as fetched to prevent duplicate calls
    dataFetchedRef.current = true;

    setLoading(true);
    setError(null);

    // Clear any potentially cached data for ballots endpoint
    localStorage.removeItem("api_cache_/ballots");

    try {
      // Try the API first
      try {
        console.log("Fetching ballots from API...");
        const response = await ballotService.getBallots();
        console.log("API response:", response);

        // Log raw data to inspect the election objects
        if (response.data && response.data.data) {
          console.log("Total elections received:", response.data.data.length);

          // If we got zero ballots but we should have some, try emergency access
          if (response.data.data.length === 0) {
            console.log("No ballots found, attempting emergency access...");
            try {
              const emergencyResponse =
                await ballotService.getDirectDatabaseBallots();
              console.log("Emergency data access response:", emergencyResponse);

              if (
                emergencyResponse.data &&
                emergencyResponse.data.data &&
                emergencyResponse.data.data.length > 0
              ) {
                console.log(
                  "Retrieved",
                  emergencyResponse.data.data.length,
                  "ballots via emergency access"
                );
                response.data.data = emergencyResponse.data.data;
              }
            } catch (emergencyError) {
              console.error("Emergency data access failed:", emergencyError);
            }
          }

          const firstElection = response.data.data[0];
          if (firstElection) {
            console.log(
              "First election object properties:",
              Object.keys(firstElection)
            );
            console.log("Vote/Voter counts:", {
              totalVoters: firstElection.totalVoters,
              total_voters: firstElection.total_voters,
              ballotsReceived: firstElection.ballotsReceived,
              ballots_received: firstElection.ballots_received,
            });
            console.log("Date fields check:", {
              startDate: firstElection.startDate,
              start_date: firstElection.start_date,
              endDate: firstElection.endDate,
              end_date: firstElection.end_date,
              createdAt: firstElection.createdAt,
            });
          }

          // Process data - fix camelCase/snake_case inconsistencies and update vote counts
          const processedData = response.data.data.map((ballot) => {
            // If dates are null, create fallback dates
            if (!ballot.startDate && !ballot.endDate) {
              const createdDate = new Date(ballot.createdAt || Date.now());

              // Create a start date (day after creation)
              const startDate = new Date(createdDate);
              startDate.setDate(startDate.getDate() + 1);

              // Create an end date (week after start)
              const endDate = new Date(startDate);
              endDate.setDate(endDate.getDate() + 7);

              // Add these dates to the ballot
              ballot.startDate = startDate.toISOString();
              ballot.endDate = endDate.toISOString();

              console.log(`Added fallback dates for ballot ${ballot.id}:`, {
                startDate: ballot.startDate,
                endDate: ballot.endDate,
              });
            }

            // Ensure consistent naming of voter count properties
            // (normalize camelCase and snake_case)
            if (
              ballot.totalVoters !== undefined &&
              ballot.total_voters === undefined
            ) {
              ballot.total_voters = ballot.totalVoters;
            } else if (
              ballot.total_voters !== undefined &&
              ballot.totalVoters === undefined
            ) {
              ballot.totalVoters = ballot.total_voters;
            }

            if (
              ballot.ballotsReceived !== undefined &&
              ballot.ballots_received === undefined
            ) {
              ballot.ballots_received = ballot.ballotsReceived;
            } else if (
              ballot.ballots_received !== undefined &&
              ballot.ballotsReceived === undefined
            ) {
              ballot.ballotsReceived = ballot.ballots_received;
            }

            // Initialize voter counts with reasonable defaults
            // Use default of 10 if no voter data available
            if (!ballot.totalVoters && !ballot.total_voters) {
              console.log(
                `Setting default voter count for ballot ${ballot.id}`
              );
              ballot.totalVoters = 10;
              ballot.total_voters = 10;
            } else {
              // Ensure values are non-zero
              ballot.totalVoters =
                ballot.totalVoters || ballot.total_voters || 10;
              ballot.total_voters =
                ballot.total_voters || ballot.totalVoters || 10;
            }

            // Initialize ballots received if missing
            ballot.ballotsReceived =
              ballot.ballotsReceived || ballot.ballots_received || 0;
            ballot.ballots_received =
              ballot.ballots_received || ballot.ballotsReceived || 0;

            console.log(`Processed voter data for ballot ${ballot.id}:`, {
              totalVoters: ballot.totalVoters,
              total_voters: ballot.total_voters,
              ballotsReceived: ballot.ballotsReceived,
              ballots_received: ballot.ballots_received,
            });

            return ballot;
          });

          setElections(processedData || []);
        } else {
          setElections([]);
        }
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
    // Get date values (try both camelCase and snake_case properties)
    const startDateValue = election.startDate || election.start_date;
    const endDateValue = election.endDate || election.end_date;

    if (!startDateValue || !endDateValue) {
      console.warn("Missing date values in election:", election);
      return "Date information not available";
    }

    try {
      const now = new Date();
      const startDate = new Date(startDateValue);
      const endDate = new Date(endDateValue);

      console.log("Parsed dates for election", election.id, ":", {
        startDate: startDate.toString(),
        endDate: endDate.toString(),
        startDateValid: isValid(startDate),
        endDateValid: isValid(endDate),
      });

      // Check if dates are valid
      if (!isValid(startDate) || !isValid(endDate)) {
        console.warn("Invalid date format:", {
          startDate: startDateValue,
          endDate: endDateValue,
        });
        return "Date information not available";
      }

      if (isFuture(startDate)) {
        // Format: "Election starts Jan 1, 2024, 12:00 PM"
        return `Election starts ${format(startDate, "MMM d, yyyy, h:mm a")}`;
      } else if (isFuture(endDate)) {
        // For elections in progress, show remaining time
        return `${formatDistanceToNow(endDate, { addSuffix: true })}`;
      } else {
        return "Completed";
      }
    } catch (error) {
      console.error("Error formatting time info:", error);
      return "Date information not available";
    }
  };

  // Helper function to determine status
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

  // Function to get the maximum voter count set by admin
  const getMaxVoterCount = (election) => {
    // Add an immediate console log to confirm this function is called
    console.log(
      "MYELECTIONS: getMaxVoterCount CALLED for election:",
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
        `MYELECTIONS: Adding missing allowedVoters=${sourceValue} for election ${election.id}`
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
      `MYELECTIONS: Voter count fields for "${election.title}" (${election.id}):`,
      fields
    );

    // Return the exact same allowedVoters value we've standardized
    return election.allowedVoters;
  };

  // Update the percentage calculation for the progress bar
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
          <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5 }}>
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
