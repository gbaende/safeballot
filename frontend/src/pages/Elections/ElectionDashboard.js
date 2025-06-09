import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  format,
  isValid,
  formatDistanceToNow,
  formatDistance,
  isFuture,
  isPast,
  parseISO,
} from "date-fns";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  LinearProgress,
  CircularProgress,
  IconButton,
  Alert,
  CardContent,
  Card,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { ballotService } from "../../services/api";

const ElectionDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State for election data
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [remainingTime, setRemainingTime] = useState("--:--:--");
  const [copied, setCopied] = useState(false);
  const [shareableLink, setShareableLink] = useState(""); // Store the shareable link
  const [resultsFetched, setResultsFetched] = useState(false);

  // Fetch election data
  useEffect(() => {
    fetchElectionData();

    // Set up timer to update remaining time every second
    const timer = setInterval(() => {
      if (election) {
        updateRemainingTime();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [id]);

  // Update remaining time when election data changes
  useEffect(() => {
    if (election) {
      // Debug log for election data
      console.log("Election data received for dashboard:", {
        id: election.id,
        title: election.title,
        startDate: election.startDate,
        endDate: election.endDate,
        totalVoters: election.totalVoters || election.total_voters,
        ballotsReceived: election.ballotsReceived || election.ballots_received,
        createdAt: election.createdAt,
      });
      updateRemainingTime();
    }
  }, [election]);

  // Generate shareable link only once when election data is loaded
  useEffect(() => {
    if (election && election.title && !shareableLink) {
      const baseUrl = window.location.origin;

      // Create a URL-friendly slug from the title
      const slug = election.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Generate a unique code using only the ID (no timestamp)
      const idPart = id.toString().slice(-4); // Last 4 chars of ID

      // Format: baseUrl/voter-registration/electionId/slug-uniqueCode instead of /vote/
      const link = `${baseUrl}/voter-registration/${id}/${slug}-${idPart}`;

      // Store the link
      setShareableLink(link);
    }
  }, [election, id, shareableLink]);

  const fetchElectionData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to fetch from API
      try {
        console.log(`Fetching ballot with ID: ${id}`);
        const response = await ballotService.getBallotById(id);
        console.log("API response for ballot:", response);

        // Fetch ballot results specifically
        let resultsData = [];
        try {
          console.log(`Fetching ballot results for ID: ${id}`);
          const resultsResponse = await ballotService.getResults(id);
          console.log("API response for ballot results:", resultsResponse);

          if (
            resultsResponse.data &&
            resultsResponse.data.data &&
            resultsResponse.data.data.positions
          ) {
            // Transform the backend result format to match our frontend display format
            resultsData = resultsResponse.data.data.positions.map(
              (position) => {
                return {
                  category: position.title,
                  candidates: position.candidates.map((candidate) => ({
                    name: candidate.name,
                    percentage: parseFloat(candidate.percentage.toFixed(1)),
                    votes: candidate.votes,
                  })),
                };
              }
            );
            console.log("Transformed results data:", resultsData);
          }
        } catch (resultsError) {
          console.error("Error fetching ballot results:", resultsError);
          // Continue with empty results - we'll handle this later
        }

        // Set election data from API
        if (response.data && response.data.data) {
          // Process the data to ensure consistent property names
          const ballot = { ...response.data.data };

          // Add the results data to the ballot
          ballot.results = resultsData;

          // Convert camelCase to snake_case for consistency
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

          // Check if date fields are null and create fallbacks if needed
          if (!ballot.startDate && !ballot.endDate) {
            console.log("Ballot has null dates, creating fallbacks");

            const createdDate = new Date(ballot.createdAt || Date.now());

            // Create a start date (day after creation)
            const startDate = new Date(createdDate);
            startDate.setDate(startDate.getDate() + 1);

            // Create an end date (week after start)
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 7);

            // Add these dates to the ballot
            ballot.startDate = startDate.toISOString();
            ballot.endDate = endDate.toISOString();

            console.log("Added fallback dates:", {
              startDate: ballot.startDate,
              endDate: ballot.endDate,
            });
          }

          // Ensure voter counts are set
          // Use a reasonable default of 10 voters if totalVoters is missing or 0
          if (!ballot.totalVoters && !ballot.total_voters) {
            console.log(
              "Setting default voter count for ballot without voter data"
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

          console.log("Processed ballot data with voter counts:", {
            id: ballot.id,
            title: ballot.title,
            totalVoters: ballot.totalVoters,
            total_voters: ballot.total_voters,
            ballotsReceived: ballot.ballotsReceived,
            ballots_received: ballot.ballots_received,
          });

          setElection(ballot);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (apiError) {
        console.error(
          "API fetch failed, using localStorage fallback:",
          apiError
        );

        // Check localStorage for fallback data
        const localBallots = JSON.parse(
          localStorage.getItem("userBallots") || "[]"
        );
        const foundBallot = localBallots.find(
          (ballot) => String(ballot.id) === String(id)
        );

        if (foundBallot) {
          console.log("Found ballot in localStorage:", foundBallot);
          setElection(foundBallot);

          // If we don't have results data yet, add mock result data for demonstration
          if (!foundBallot.results || foundBallot.results.length === 0) {
            const mockResults = generateMockResults(foundBallot);
            setElection({ ...foundBallot, results: mockResults });
          }
        } else {
          throw new Error("Ballot not found");
        }
      }
    } catch (err) {
      console.error("Error fetching election data:", err);
      setError("Failed to load election details. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const updateRemainingTime = () => {
    if (!election) {
      console.debug("No election data available for time calculation");
      return;
    }

    // Get the end date (try both camelCase and snake_case properties)
    const endDateValue = election.endDate || election.end_date;
    if (!endDateValue) {
      console.warn("No end date found in election data:", election);
      setRemainingTime("N/A");
      return;
    }

    try {
      console.debug("Parsing end date:", endDateValue);
      const endDate = new Date(endDateValue);

      // Validate the parsed date
      if (isNaN(endDate.getTime())) {
        console.warn("Invalid end date format:", endDateValue);
        setRemainingTime("Invalid Date");
        return;
      }

      const now = new Date();
      console.debug(
        `Current time: ${now.toISOString()}, End date: ${endDate.toISOString()}`
      );

      if (endDate < now) {
        console.debug("Election has ended");
        setRemainingTime("Ended");
        return;
      }

      // Calculate time difference in milliseconds
      const diffMs = endDate.getTime() - now.getTime();
      console.debug("Time difference in ms:", diffMs);

      // Calculate days, hours, minutes, seconds
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      // Format the remaining time string
      let timeString;
      if (days > 0) {
        timeString = `${days}d ${hours}h ${minutes}m`;
      } else {
        timeString = `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`;
      }

      console.debug("Calculated remaining time:", timeString);
      setRemainingTime(timeString);
    } catch (error) {
      console.error("Error updating remaining time:", error);
      setRemainingTime("Error");
    }
  };

  // Generate mock voting results for demo purposes when real data isn't available
  const generateMockResults = (ballot) => {
    if (!ballot || !ballot.questions || ballot.questions.length === 0) {
      return [];
    }

    return ballot.questions.map((question) => {
      // Generate random percentages for options that add up to 100%
      const optionCount = question.options.length;
      let remainingPercentage = 100;
      const percentages = [];

      // Generate random percentages for all but the last option
      for (let i = 0; i < optionCount - 1; i++) {
        // Random percentage between 1 and remainingPercentage/2
        const percentage = Math.random() * (remainingPercentage / 2) + 1;
        percentages.push(Number(percentage.toFixed(1)));
        remainingPercentage -= percentages[i];
      }

      // Last option gets the remaining percentage
      percentages.push(Number(remainingPercentage.toFixed(1)));

      // Map options to candidates with percentages
      const candidates = question.options.map((option, idx) => ({
        name: option,
        percentage: percentages[idx],
      }));

      return {
        category: question.title,
        candidates,
      };
    });
  };

  // Format time for display (e.g. "6:00 AM")
  const formatTime = (dateString) => {
    if (!dateString) return "";

    try {
      const date = parseISO(dateString);
      if (!isValid(date)) {
        console.warn("Invalid date for formatting:", dateString);
        return "";
      }

      return format(date, "h:mm a");
    } catch (e) {
      console.error("Error formatting time:", e);
      return "";
    }
  };

  // Format date for display (e.g. "Jan 1, 2023")
  const formatDate = (dateString) => {
    if (!dateString) return "";

    try {
      const date = parseISO(dateString);
      if (!isValid(date)) {
        console.warn("Invalid date for formatting:", dateString);
        return "";
      }

      return format(date, "MMM d, yyyy");
    } catch (e) {
      console.error("Error formatting date:", e);
      return "";
    }
  };

  // Get election status
  const getElectionStatus = () => {
    if (!election) return "Unknown";

    try {
      // Get date values (try both camelCase and snake_case properties)
      const startDateValue = election.startDate || election.start_date;
      const endDateValue = election.endDate || election.end_date;

      if (!startDateValue || !endDateValue) {
        return election.status || "Unknown";
      }

      const startDate = new Date(startDateValue);
      const endDate = new Date(endDateValue);

      // Check if dates are valid
      if (!isValid(startDate) || !isValid(endDate)) {
        return election.status || "Unknown";
      }

      const now = new Date();

      if (isFuture(startDate)) return "Scheduled";
      if (isFuture(endDate)) return "Live";
      return "Inactive";
    } catch (error) {
      console.error("Error determining election status:", error);
      return election.status || "Unknown";
    }
  };

  // Get the shareable link from state (not regenerate each time)
  const getShareableLink = () => {
    if (shareableLink) {
      return shareableLink;
    }

    // Fallback if link hasn't been generated yet
    return window.location.origin;
  };

  const handleCopyLink = () => {
    const link = getShareableLink();
    navigator.clipboard.writeText(link);
    setCopied(true);

    // Reset the copied state after 2 seconds
    setTimeout(() => setCopied(false), 2000);
  };

  // Early return for loading and error states
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="outlined"
          sx={{ mt: 2 }}
          onClick={() => navigate("/my-elections")}
          startIcon={<ArrowBackIcon />}
        >
          Back to My Elections
        </Button>
      </Box>
    );
  }

  if (!election) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">Election not found</Alert>
        <Button
          variant="outlined"
          sx={{ mt: 2 }}
          onClick={() => navigate("/my-elections")}
          startIcon={<ArrowBackIcon />}
        >
          Back to My Elections
        </Button>
      </Box>
    );
  }

  const status = getElectionStatus();

  // Function to get the maximum voter count set by admin
  const getMaxVoterCount = (election) => {
    // Check for admin-set values in this priority order
    if (election.allowedVoters && election.allowedVoters > 0) {
      console.log(`Using admin-set allowedVoters: ${election.allowedVoters}`);
      return election.allowedVoters;
    }

    if (election.voterCount && election.voterCount > 0) {
      console.log(`Using ballot creation voterCount: ${election.voterCount}`);
      return election.voterCount;
    }

    if (election.maxVoters && election.maxVoters > 0) {
      console.log(`Using maxVoters: ${election.maxVoters}`);
      return election.maxVoters;
    }

    // Use a default of 10 if no admin-set value is found
    const fallback = Math.max(
      election.totalVoters || election.total_voters || 0,
      10
    );
    console.log(`Using fallback value: ${fallback}`);
    return fallback;
  };

  // Get voter counts from API - use the admin-set count for total voters
  const totalVoters = getMaxVoterCount(election);
  const totalVotes = election.ballotsReceived || election.ballots_received || 0;

  // Calculate the progress percentage for the circular progress indicator
  const voteProgress = totalVoters > 0 ? (totalVotes / totalVoters) * 100 : 0;

  console.log("Voter stats for display:", {
    totalVoters,
    totalVotes,
    voteProgress,
    rawData: {
      allowedVoters: election.allowedVoters,
      voterCount: election.voterCount,
      maxVoters: election.maxVoters,
      totalVoters: election.totalVoters,
      total_voters: election.total_voters,
      ballotsReceived: election.ballotsReceived,
      ballots_received: election.ballots_received,
    },
  });

  return (
    <Box sx={{ pt: 4 }}>
      {/* Header with Title and Create Button */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton component={Link} to="/my-elections" sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 500 }}>
            {election.title}
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
            borderRadius: "6px",
          }}
          onClick={() => navigate("/create-election")}
        >
          Create Ballot
        </Button>
      </Box>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Left Column - Election Status */}
        <Grid item xs={12} md={6}>
          {/* Live Voting Status */}
          <Paper
            sx={{
              p: 3,
              mb: 3,
              border: "1px solid #E2E8F0",
              boxShadow: "none",
              borderRadius: 6,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <Chip
                label={status === "Live" ? "Voting is live" : status}
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
                  background:
                    status === "Live"
                      ? "linear-gradient(to right, #BA0000, #982323)"
                      : status === "Scheduled"
                      ? "linear-gradient(to right, #2D3748, #4A5568)"
                      : "linear-gradient(to right, #3182CE, #4299E1)",
                  color: "white",
                  height: "24px",
                  fontWeight: 500,
                  "& .MuiChip-icon": {
                    color: "white",
                    mr: 0.5,
                  },
                }}
              />
            </Box>

            <CardContent sx={{ pl: 1 }}>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="flex-start"
              >
                <Typography variant="h4" component="div">
                  {remainingTime === "N/A" ||
                  remainingTime === "Error" ||
                  remainingTime === "Invalid Date" ||
                  remainingTime === "--:--:--" ? (
                    remainingTime
                  ) : (
                    <>
                      {remainingTime}
                      {remainingTime !== "Ended" && (
                        <Typography
                          component="span"
                          variant="h6"
                          color="textSecondary"
                          style={{ marginLeft: "8px" }}
                        >
                          Remaining
                        </Typography>
                      )}
                    </>
                  )}
                </Typography>
              </Box>
            </CardContent>

            <Box sx={{ mt: 2 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                Voting time
              </Typography>
              <Typography variant="body1">
                {formatDate(election.startDate || election.start_date)}{" "}
                {formatTime(election.startDate || election.start_date)} -{" "}
                {formatDate(election.endDate || election.end_date)}{" "}
                {formatTime(election.endDate || election.end_date)}
              </Typography>
            </Box>
          </Paper>

          {/* Shareable Link - Updated */}
          <Paper
            sx={{
              p: 3,
              mb: 3,
              border: "1px solid #E2E8F0",
              boxShadow: "none",
              borderRadius: 6,
            }}
          >
            <Typography
              variant="body1"
              sx={{ fontWeight: 600, mb: 2, color: "#718096" }}
            >
              Shareable Pre-Registration Link
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Share this unique link with voters to access this election
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                p: 1.5,
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
                bgcolor: "#F7FAFC",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  flexGrow: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {getShareableLink()}
              </Typography>
              <Button
                onClick={handleCopyLink}
                size="small"
                startIcon={<ContentCopyIcon fontSize="small" />}
                sx={{
                  ml: 1,
                  color: "#4A5568",
                  textTransform: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Copy Link
              </Button>
            </Box>
            {copied && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mt: 1.5,
                  p: 1,
                  borderRadius: "6px",
                  bgcolor: "#EBF8FF",
                }}
              >
                <Typography
                  variant="caption"
                  color="#3182CE"
                  sx={{ display: "block" }}
                >
                  Link copied to clipboard successfully!
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Voters Summary */}
          <Paper
            sx={{
              p: 3,
              border: "1px solid #E2E8F0",
              boxShadow: "none",
              borderRadius: 6,
            }}
          >
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}
            >
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Voters Summary
              </Typography>
              <Button
                endIcon={<ArrowForwardIcon />}
                sx={{
                  color: "#2D3748",
                  textTransform: "none",
                  fontSize: "14px",
                  border: "1px solid #E2E8F0",
                  borderRadius: "6px",
                  px: 2,
                  py: 0.5,
                }}
                component={Link}
                to={`/elections/${id}/voters`}
              >
                Manage
              </Button>
            </Box>

            <Grid container spacing={4}>
              <Grid item xs={6}>
                <Box
                  sx={{
                    position: "relative",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <CircularProgress
                    variant="determinate"
                    value={100}
                    size={100}
                    thickness={4}
                    sx={{
                      color: "#E2E8F0",
                      position: "absolute",
                    }}
                  />
                  <CircularProgress
                    variant="determinate"
                    value={totalVoters > 0 ? 100 : 0}
                    size={100}
                    thickness={4}
                    sx={{
                      color: "#C53030",
                    }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      variant="h5"
                      component="div"
                      sx={{ fontWeight: "bold" }}
                    >
                      {totalVoters}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body1" align="center" sx={{ mt: 2 }}>
                  Number of
                  <br />
                  Registered Voters
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Box
                  sx={{
                    position: "relative",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <CircularProgress
                    variant="determinate"
                    value={100}
                    size={100}
                    thickness={4}
                    sx={{
                      color: "#E2E8F0",
                      position: "absolute",
                    }}
                  />
                  <CircularProgress
                    variant="determinate"
                    value={voteProgress}
                    size={100}
                    thickness={4}
                    sx={{
                      color: "#2B6CB0",
                    }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      variant="h5"
                      component="div"
                      sx={{ fontWeight: "bold" }}
                    >
                      {totalVotes}
                    </Typography>
                    {totalVoters > 0 && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        {Math.round(voteProgress)}%
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Typography variant="body1" align="center" sx={{ mt: 2 }}>
                  Total Number of
                  <br />
                  Votes Received
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Right Column - Voting Results */}
        <Grid item xs={12} md={6}>
          {/* Title and View All button outside of cards */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 3,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Live Voting Results
            </Typography>
            <Button
              endIcon={<ArrowForwardIcon />}
              sx={{
                color: "#2D3748",
                textTransform: "none",
                fontSize: "14px",
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
                px: 2,
                py: 0.5,
              }}
              component={Link}
              to={`/elections/${id}/results`}
            >
              View All
            </Button>
          </Box>

          {/* Cards for each question */}
          {election.results && election.results.length > 0 ? (
            election.results.map((category, index) => (
              <Paper
                key={index}
                sx={{
                  p: 3,
                  mb: 3,
                  border: "1px solid #E2E8F0",
                  boxShadow: "none",
                  borderRadius: 6,
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 500,
                    mb: 2,
                    color: "#718096", // Light grey color for the title
                  }}
                >
                  {category.category}
                </Typography>

                {category.candidates.map((candidate, idx) => (
                  <Box key={idx} sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {candidate.name}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <LinearProgress
                        variant="determinate"
                        value={candidate.percentage}
                        sx={{
                          flexGrow: 1,
                          mr: 2,
                          height: 8,
                          borderRadius: 6,
                          bgcolor: "#EDF2F7",
                          ".MuiLinearProgress-bar": {
                            backgroundImage:
                              "linear-gradient(to right, #00005E, #4478EB)",
                          },
                        }}
                      />
                      <Typography variant="body2" sx={{ minWidth: 45 }}>
                        {candidate.percentage}%
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Paper>
            ))
          ) : (
            <Paper
              sx={{
                p: 3,
                border: "1px solid #E2E8F0",
                boxShadow: "none",
                borderRadius: 6,
                textAlign: "center",
              }}
            >
              <Typography color="text.secondary">
                No voting results available yet. Results will appear here when
                voting begins.
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ElectionDashboard;
