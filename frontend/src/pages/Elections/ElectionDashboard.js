import React from "react";
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
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const ElectionDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock data for the election
  const election = {
    id: parseInt(id),
    title: "2024 Presidential Election - General Ballot",
    status: "Live",
    remainingTime: "3:12:16s",
    startTime: "6:00 AM",
    endTime: "6:00 PM",
    registeredVoters: 500,
    totalVotes: 100,
    shareableLink: "safeballot.com/2024-presidential-election",
    results: [
      {
        category: "Presidential Election - General",
        candidates: [
          { name: "Kamala D. Harris", percentage: 58.6 },
          { name: "Donald J. Trump", percentage: 38.2 },
          { name: "Robert F. Kennedy, Jr.", percentage: 1.2 },
        ],
      },
      {
        category: "US House of Representatives",
        candidates: [
          { name: "Sample Candidate 1", percentage: 58.6 },
          { name: "Sample Candidate 2", percentage: 38.2 },
        ],
      },
    ],
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(election.shareableLink);
  };

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
                label="Voting is live"
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
                {election.remainingTime}
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
                {election.startTime} - {election.endTime}
              </Typography>
            </Box>
          </Paper>

          {/* Shareable Link */}
          <Paper
            sx={{
              p: 3,
              mb: 3,
              border: "1px solid #E2E8F0",
              boxShadow: "none",
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
              Shareable Pre Registration Link
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                p: 1,
                border: "1px solid #E2E8F0",
                borderRadius: "4px",
              }}
            >
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                {election.shareableLink}
              </Typography>
              <IconButton onClick={handleCopyLink} size="small">
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>
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
                      {election.registeredVoters}
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
                      (election.totalVotes / election.registeredVoters) * 100
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
                      {election.totalVotes}
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
              >
                View All
              </Button>
            </Box>

            {election.results.map((category, index) => (
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
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ElectionDashboard;
