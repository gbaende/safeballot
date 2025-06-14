import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  LinearProgress,
  Avatar,
  Grid,
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
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(to right, #080E1D, #263C75)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
      }}
    >
      {/* Header with Back Button and Title */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
        <IconButton component={Link} to={`/elections/${id}`} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 500,
            color: "#fff",
            textAlign: "center",
            fontSize: { xs: "2.4rem", sm: "3rem", md: "3.6rem" },
          }}
        >
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
        <Box
          sx={{
            width: { xs: "95%", sm: "85%", md: "80%" },
            minHeight: { xs: "auto", md: "80vh" },
            bgcolor: "#fff",
            p: { xs: 2, sm: 3, md: 4 },
            borderRadius: 2,
            boxShadow: "0px 4px 12px rgba(0,0,0,0.15)",
            overflowY: "auto",
          }}
        >
          {results &&
            results.positions &&
            results.positions.map((position, index) => (
              <Box
                key={index}
                sx={{
                  p: 3,
                  mb: 3,
                  borderBottom: "1px solid #E2E8F0",
                  "&:last-of-type": { borderBottom: "none" },
                  width: "100%",
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    mb: 3,
                    fontWeight: 600,
                    color: "#4A5568",
                    fontSize: { xs: "1.6rem", sm: "1.8rem", md: "2rem" },
                  }}
                >
                  {position.title}
                </Typography>

                <Grid container spacing={2}>
                  {position.candidates.map((candidate, idx) => (
                    <Grid item xs={12} sm={6} key={idx}>
                      <Box sx={{ mb: 2 }}>
                        {/* Avatar + Candidate Name */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            mb: 1,
                            columnGap: 2,
                          }}
                        >
                          <Avatar
                            src={
                              candidate.imageUrl ||
                              candidate.imageData ||
                              candidate.image ||
                              ""
                            }
                            alt={candidate.name}
                            sx={{
                              width: { xs: 36, sm: 44, md: 52 },
                              height: { xs: 36, sm: 44, md: 52 },
                              fontSize: {
                                xs: "1rem",
                                sm: "1.1rem",
                                md: "1.2rem",
                              },
                            }}
                          >
                            {!candidate.imageUrl &&
                            !candidate.imageData &&
                            !candidate.image &&
                            candidate.name
                              ? candidate.name[0]
                              : null}
                          </Avatar>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 500,
                              fontSize: {
                                xs: "1.3rem",
                                sm: "1.4rem",
                                md: "1.5rem",
                              },
                            }}
                          >
                            {candidate.name}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Box sx={{ width: "65%", mr: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={
                                candidate.percentage > 100
                                  ? 100
                                  : candidate.percentage
                              }
                              sx={{
                                height: 6,
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
                              minWidth: "45px",
                              fontSize: {
                                xs: "1rem",
                                sm: "1.1rem",
                                md: "1.2rem",
                              },
                            }}
                          >
                            {candidate.percentage.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}

          {results &&
            (!results.positions || results.positions.length === 0) && (
              <Box
                sx={{
                  p: 4,
                  textAlign: "center",
                  border: "1px dashed #E2E8F0",
                  borderRadius: "8px",
                  width: "100%",
                  bgcolor: "#fff",
                  fontSize: { xs: "1.3rem", sm: "1.4rem", md: "1.6rem" },
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
