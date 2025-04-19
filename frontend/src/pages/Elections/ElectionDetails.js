import React, { useState, useEffect } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  Divider,
  IconButton,
  LinearProgress,
  Breadcrumbs,
  Link,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import BallotIcon from "@mui/icons-material/Ballot";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import axios from "axios";

const API_URL = "http://localhost:8080/api";

const ProgressBar = styled(LinearProgress)(({ theme }) => ({
  height: 8,
  borderRadius: 4,
  backgroundColor: "#E2E8F0",
  "& .MuiLinearProgress-bar": {
    background: "linear-gradient(90deg, #00005E 0%, #4478EB 100%)",
  },
}));

const ElectionDetails = () => {
  const { id } = useParams();
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchElectionDetails = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/ballots/${id}/results`);
        setElection(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching election details:", err);
        setError("Failed to load election results. Please try again later.");
        setLoading(false);
      }
    };

    fetchElectionDetails();
  }, [id]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="80vh"
      >
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!election) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="80vh"
      >
        <Typography>No election data found.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
        <Link
          component={RouterLink}
          to="/"
          underline="hover"
          color="inherit"
          sx={{ display: "flex", alignItems: "center" }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Home
        </Link>
        <Link
          component={RouterLink}
          to="/my-elections"
          underline="hover"
          color="inherit"
          sx={{ display: "flex", alignItems: "center" }}
        >
          <BallotIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          My Elections
        </Link>
        <Link
          component={RouterLink}
          to={`/elections/${id}`}
          underline="hover"
          color="inherit"
        >
          {election.title}
        </Link>
        <Typography
          color="text.primary"
          sx={{ display: "flex", alignItems: "center" }}
        >
          Results
        </Typography>
      </Breadcrumbs>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4">Election Results</Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          component={RouterLink}
          to={`/elections/${id}`}
        >
          Back to Dashboard
        </Button>
      </Box>

      <Paper
        sx={{
          maxWidth: 1200,
          margin: "0 auto",
          p: 3,
          borderRadius: 2,
          border: "1px solid #E2E8F0",
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Box display="flex" alignItems="center">
            <IconButton
              component={RouterLink}
              to={`/elections/${id}`}
              sx={{ mr: 1 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" fontWeight={600}>
              {election.title} {election.subtitle && `- ${election.subtitle}`}
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="small"
            sx={{
              bgcolor: "#1A202C",
              "&:hover": {
                bgcolor: "#2D3748",
              },
              borderRadius: "4px",
              textTransform: "none",
            }}
          >
            Download PDF
          </Button>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Live Voting Results
          </Typography>

          {election.positions &&
            election.positions.map((position, index) => (
              <Box key={index} sx={{ mb: 4 }}>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                  {position.title}
                </Typography>

                {position.candidates &&
                  position.candidates.map((candidate) => (
                    <Box key={candidate.id} sx={{ mb: 1.5 }}>
                      <Typography variant="body2" mb={0.5}>
                        {candidate.name}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Box sx={{ flexGrow: 1, mr: 2 }}>
                          <ProgressBar
                            variant="determinate"
                            value={candidate.percentage}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ minWidth: 40 }}>
                          {candidate.percentage.toFixed(2)}%
                        </Typography>
                      </Box>
                    </Box>
                  ))}
              </Box>
            ))}
        </Box>
      </Paper>
    </Box>
  );
};

export default ElectionDetails;
