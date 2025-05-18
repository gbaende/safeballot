import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  LinearProgress,
} from "@mui/material";
import { useParams, Link } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { ballotService } from "../../services/api";

function ElectionResults() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [ballot, setBallot] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);

        // Fetch ballot details to get the title
        const ballotResponse = await ballotService.getBallotById(id);
        if (ballotResponse.data && ballotResponse.data.data) {
          setBallot(ballotResponse.data.data);
        }

        // Fetch ballot results
        const resultsResponse = await ballotService.getResults(id);
        if (resultsResponse.data && resultsResponse.data.data) {
          setResults(resultsResponse.data.data);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching election results:", err);
        setError("Failed to load election results. Please try again later.");
        setLoading(false);
      }
    };

    fetchResults();
  }, [id]);

  return (
    <Box sx={{ p: 4 }}>
      {/* Header with Back Button and Title */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
        <IconButton component={Link} to={`/elections/${id}`} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 500 }}>
          {ballot ? ballot.title : "Election Results"}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "300px",
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ ml: "40px" }}>
          {results &&
            results.positions &&
            results.positions.map((position, index) => (
              <Paper
                key={index}
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: "8px",
                  boxShadow: "0px 2px 4px rgba(0,0,0,0.05)",
                  width: "60%",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    mb: 3,
                    fontWeight: 500,
                    color: "#4A5568",
                  }}
                >
                  {position.title}
                </Typography>

                {position.candidates.map((candidate, idx) => (
                  <Box key={idx} sx={{ mb: 2 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        mb: 1,
                        fontWeight: 500,
                      }}
                    >
                      {candidate.name}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Box sx={{ width: "70%", mr: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={
                            candidate.percentage > 100
                              ? 100
                              : candidate.percentage
                          }
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: "#EDF2F7",
                            "& .MuiLinearProgress-bar": {
                              borderRadius: 4,
                              backgroundImage:
                                "linear-gradient(to right, #00005E, #4478EB)",
                            },
                          }}
                        />
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          minWidth: "50px",
                        }}
                      >
                        {candidate.percentage.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Paper>
            ))}

          {results &&
            (!results.positions || results.positions.length === 0) && (
              <Box
                sx={{
                  p: 4,
                  textAlign: "center",
                  border: "1px dashed #E2E8F0",
                  borderRadius: "8px",
                  width: "60%",
                }}
              >
                <Typography variant="h6" color="text.secondary">
                  No voting results available yet
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Check back later once votes have been cast.
                </Typography>
              </Box>
            )}
        </Box>
      )}
    </Box>
  );
}

export default ElectionResults;
