import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { ballotService } from "../../services/api";

const ElectionDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State for election data
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [remainingTime, setRemainingTime] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareableLink, setShareableLink] = useState(""); // Store the shareable link

  // Fetch election data
  useEffect(() => {
    fetchElectionData();

    // Set up timer to update remaining time every second
    const timer = setInterval(() => {
      if (election && election.end_date) {
        setRemainingTime(formatTimeRemaining(election.end_date));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [id]);

  // Update remaining time when election data changes
  useEffect(() => {
    if (election && election.end_date) {
      setRemainingTime(formatTimeRemaining(election.end_date));
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

      let brand = election.brand;
      if (!brand) {
        try {
          const localBallots = JSON.parse(
            localStorage.getItem("userBallots") || "[]"
          );
          const localMatch = localBallots.find(
            (b) => String(b.id) === String(id)
          );
          brand = localMatch?.brand;
        } catch (_) {}
      }
      const brandPrefix = brand ? `/${brand}` : "";
      const linkPrefix = election.quickBallot ? "/vote" : "/voter-registration";
      const link = `${baseUrl}${brandPrefix}${linkPrefix}/${id}/${slug}-${idPart}`;

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

        // Set election data from API
        if (response.data && response.data.data) {
          setElection(response.data.data);
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

  // Helper function to format time remaining
  const formatTimeRemaining = (endDateString) => {
    if (!endDateString) return "N/A";

    const endDate = new Date(endDateString);
    const now = new Date();

    if (endDate <= now) return "Ended";

    const diffMs = endDate - now;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${diffHrs}:${diffMins.toString().padStart(2, "0")}:${diffSecs
      .toString()
      .padStart(2, "0")}s`;
  };

  // Format time for display (e.g. "6:00 AM")
  const formatTime = (dateString) => {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      console.error("Error formatting time:", e);
      return "";
    }
  };

  // Get election status
  const getElectionStatus = () => {
    if (!election) return "Unknown";

    const now = new Date();
    const startDate = new Date(election.start_date);
    const endDate = new Date(election.end_date);

    if (now < startDate) return "Scheduled";
    if (now >= startDate && now <= endDate) return "Live";
    return "Completed";
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
  const totalVoters = election.total_voters || 0;
  const totalVotes = election.ballots_received || 0;

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
            borderRadius: "4px",
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

            <Box sx={{ display: "flex", alignItems: "baseline" }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {remainingTime}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 400, ml: 1 }}>
                Remaining
              </Typography>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                Voting time
              </Typography>
              <Typography variant="body1">
                {formatTime(election.start_date)} -{" "}
                {formatTime(election.end_date)}
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
            }}
          >
            <Typography
              variant="body1"
              sx={{ fontWeight: 600, mb: 2, color: "#2B6CB0" }}
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
                borderRadius: "4px",
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
                  borderRadius: "4px",
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
                  borderRadius: "4px",
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
                    value={100}
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
                    value={
                      totalVoters > 0 ? (totalVotes / totalVoters) * 100 : 0
                    }
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
                  </Box>
                </Box>
                <Typography variant="body1" align="center" sx={{ mt: 2 }}>
                  Total Number of
                  <br />
                  Votes
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Right Column - Voting Results */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              height: "100%",
              border: "1px solid #E2E8F0",
              boxShadow: "none",
            }}
          >
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}
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
                  borderRadius: "4px",
                  px: 2,
                  py: 0.5,
                }}
                component={Link}
                to={`/elections/${id}/details`}
              >
                View All
              </Button>
            </Box>

            {election.results && election.results.length > 0 ? (
              election.results.map((category, index) => (
                <Box key={index} sx={{ mb: 4 }}>
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
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
                            borderRadius: 4,
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
                </Box>
              ))
            ) : (
              <Typography color="text.secondary" align="center">
                No voting results available yet. Results will appear here when
                voting begins.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ElectionDashboard;
