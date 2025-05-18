import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  Box,
  Typography,
  Paper,
  CardHeader,
  CardContent,
  Button,
  Snackbar,
  Grid,
} from "@mui/material";
import ballotService from "../../services/api";
import { useSelector } from "react-redux";
import BuildIcon from "@mui/icons-material/Build";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import BugReportIcon from "@mui/icons-material/BugReport";

const BallotDebug = () => {
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugData, setDebugData] = useState(null);
  const [repairLoading, setRepairLoading] = useState(false);
  const [repairStats, setRepairStats] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [rawDataLoading, setRawDataLoading] = useState(false);
  const [rawData, setRawData] = useState(null);

  useEffect(() => {
    const fetchDebugData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(`Fetching debug data for ballot ${id}`);
        const response = await ballotService.debugBallot(id);

        if (response && response.status === "success" && response.data) {
          console.log("Debug data received:", response.data);
          setDebugData(response.data);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err) {
        console.error("Error fetching debug data:", err);
        setError(err.message || "Failed to fetch debug data");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDebugData();
    }
  }, [id, repairStats]); // Re-fetch after repair

  const handleRepairBallot = async () => {
    try {
      setRepairLoading(true);
      console.log(`Attempting to repair ballot ${id}`);

      const response = await ballotService.repairBallot(id);

      if (response && response.status === "success") {
        console.log("Repair successful:", response);
        setRepairStats(response.repairStats);
        setSnackbar({
          open: true,
          message: `Repair successful! ${response.message}`,
          severity: "success",
        });

        // Clear raw data so it gets refreshed if fetched again
        setRawData(null);
      } else {
        throw new Error(response?.message || "Repair failed");
      }
    } catch (err) {
      console.error("Error repairing ballot:", err);
      setSnackbar({
        open: true,
        message: `Repair failed: ${err.message}`,
        severity: "error",
      });
    } finally {
      setRepairLoading(false);
    }
  };

  const fetchRawData = async () => {
    try {
      setRawDataLoading(true);
      console.log(`Fetching raw voter data for ballot ${id}`);

      const response = await ballotService.getRawVoters(id);

      if (response && response.status === "success" && response.data) {
        console.log("Raw data received:", response.data);
        setRawData(response.data);
        setSnackbar({
          open: true,
          message: `Raw data retrieved: ${response.data.rawVoterCount} voters, ${response.data.totalVotes} votes`,
          severity: "info",
        });
      } else {
        throw new Error("Invalid raw data response format");
      }
    } catch (err) {
      console.error("Error fetching raw data:", err);
      setSnackbar({
        open: true,
        message: `Error fetching raw data: ${err.message}`,
        severity: "error",
      });
    } finally {
      setRawDataLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          my: 5,
        }}
      >
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading debug information...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 3 }}>
        <Typography variant="h6">Error</Typography>
        <Typography variant="body1">{error}</Typography>
      </Alert>
    );
  }

  if (!debugData) {
    return (
      <Alert severity="warning" sx={{ my: 3 }}>
        <Typography variant="h6">No Data</Typography>
        <Typography variant="body1">
          No debug data available for this ballot.
        </Typography>
      </Alert>
    );
  }

  const hasIssues =
    debugData.counts.votes !== debugData.counts.votedVoters ||
    debugData.counts.uniqueVoters !== debugData.counts.votedVoters ||
    (debugData.issues.orphanedVotes &&
      debugData.issues.orphanedVotes.length > 0) ||
    (debugData.issues.inconsistentVoters &&
      debugData.issues.inconsistentVoters.length > 0);

  return (
    <Box sx={{ py: 4, px: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4">Ballot Debug Information</Typography>
        <Box>
          <Button
            variant="outlined"
            color="info"
            startIcon={<BugReportIcon />}
            onClick={fetchRawData}
            disabled={rawDataLoading}
            sx={{ mr: 2 }}
          >
            {rawDataLoading ? "Loading..." : "Direct Database Analysis"}
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<BuildIcon />}
            onClick={handleRepairBallot}
            disabled={repairLoading || !hasIssues}
          >
            {repairLoading ? "Repairing..." : "Repair Database Issues"}
          </Button>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Ballot ID: {id}
      </Typography>

      {rawData && (
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Direct Database Analysis
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="subtitle1">Ballot Data:</Typography>
                <Typography variant="body2">
                  Title: {rawData.ballotTitle}
                </Typography>
                <Typography variant="body2">
                  Created by: {rawData.createdById}{" "}
                  {rawData.isCreator ? "(you)" : ""}
                </Typography>
                <Typography variant="body2">
                  Total Voters in DB: {rawData.ballotState.totalVoters}
                </Typography>
                <Typography variant="body2">
                  Ballots Received in DB: {rawData.ballotState.ballotsReceived}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="subtitle1">Database Counts:</Typography>
                <Typography variant="body2">
                  Raw Voter Count: {rawData.rawVoterCount}
                </Typography>
                <Typography variant="body2">
                  Total Votes: {rawData.totalVotes}
                </Typography>
                <Typography variant="body2">
                  Unique Voter IDs in Votes: {rawData.voterIdsInVotes?.length}
                </Typography>
                <Typography variant="body2">
                  Orphaned Voter IDs: {rawData.orphanedVoterIds?.length}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Voter Analysis:
            </Typography>
            {rawData.voterData?.length > 0 ? (
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>HasVoted Flag</TableCell>
                      <TableCell>Actual Votes</TableCell>
                      <TableCell>Is Admin</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rawData.voterData.map((voter, index) => (
                      <TableRow key={index}>
                        <TableCell>{voter.id}</TableCell>
                        <TableCell>{voter.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={voter.hasVotedFlag ? "Yes" : "No"}
                            color={voter.hasVotedFlag ? "success" : "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{voter.voteCount}</TableCell>
                        <TableCell>{voter.isAdmin ? "Yes" : "No"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2">No voter records found</Typography>
            )}
          </Box>

          {rawData.orphanedVoterIds?.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" sx={{ color: "error.main" }}>
                Found {rawData.orphanedVoterIds.length} orphaned voter IDs
                (votes with no voter record):
              </Typography>
              <Box sx={{ mt: 1, p: 1, bgcolor: "#fff0f0", borderRadius: 1 }}>
                {rawData.orphanedVoterIds.map((id, index) => (
                  <Typography
                    key={index}
                    variant="body2"
                    sx={{ fontFamily: "monospace" }}
                  >
                    {id}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
        </Alert>
      )}

      {repairStats && (
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="h6">Repair Results</Typography>
          <Typography variant="body2">
            Total Votes: {repairStats.totalVotes}
          </Typography>
          <Typography variant="body2">
            Created Voters: {repairStats.createdVoters}
          </Typography>
          <Typography variant="body2">
            Fixed Votes: {repairStats.fixedVotes}
          </Typography>
          <Typography variant="body2">
            Final Total Voters: {repairStats.finalTotalVoters}
          </Typography>
          <Typography variant="body2">
            Final Voted Voters: {repairStats.finalVotedVoters}
          </Typography>
        </Alert>
      )}

      <Card sx={{ mb: 4 }}>
        <CardHeader title="Ballot Summary" />
        <CardContent>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Title:</strong> {debugData.ballot.title}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Total Voters (DB):</strong> {debugData.ballot.totalVoters}
            </Typography>
            <Typography variant="body1">
              <strong>Ballots Received (DB):</strong>{" "}
              {debugData.ballot.ballotsReceived}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardHeader title="Count Summary" />
        <CardContent>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: "1px solid #e0e0e0",
                textAlign: "center",
                flex: "1 1 200px",
              }}
            >
              <Typography variant="h5">{debugData.counts.voters}</Typography>
              <Typography variant="body2">Total Voters</Typography>
            </Paper>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: "1px solid #e0e0e0",
                textAlign: "center",
                flex: "1 1 200px",
              }}
            >
              <Typography variant="h5">
                {debugData.counts.votedVoters}
              </Typography>
              <Typography variant="body2">Voters Marked as Voted</Typography>
            </Paper>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: "1px solid #e0e0e0",
                textAlign: "center",
                flex: "1 1 200px",
              }}
            >
              <Typography variant="h5">{debugData.counts.votes}</Typography>
              <Typography variant="body2">Total Votes</Typography>
            </Paper>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: "1px solid #e0e0e0",
                textAlign: "center",
                flex: "1 1 200px",
              }}
            >
              <Typography variant="h5">
                {debugData.counts.uniqueVoters}
              </Typography>
              <Typography variant="body2">Unique Voters with Votes</Typography>
            </Paper>
          </Box>

          {debugData.counts.votes !== debugData.counts.votedVoters && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>Discrepancy:</strong> The number of votes (
              {debugData.counts.votes}) doesn't match the number of voters
              marked as voted ({debugData.counts.votedVoters}).
            </Alert>
          )}

          {debugData.counts.uniqueVoters !== debugData.counts.votedVoters && (
            <Alert severity="warning">
              <strong>Discrepancy:</strong> The number of unique voters with
              votes ({debugData.counts.uniqueVoters}) doesn't match the number
              of voters marked as voted ({debugData.counts.votedVoters}).
            </Alert>
          )}
        </CardContent>
      </Card>

      {debugData.issues.orphanedVotes &&
        debugData.issues.orphanedVotes.length > 0 && (
          <Card sx={{ mb: 4 }}>
            <CardHeader
              title="Orphaned Votes"
              sx={{ bgcolor: "#f44336", color: "white" }}
            />
            <CardContent>
              <Typography variant="body1" sx={{ mb: 2 }}>
                These votes have no matching voter record:
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Vote ID</TableCell>
                      <TableCell>Voter ID</TableCell>
                      <TableCell>Question ID</TableCell>
                      <TableCell>Choice ID</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {debugData.issues.orphanedVotes.map((vote, index) => (
                      <TableRow key={index}>
                        <TableCell>{vote.id}</TableCell>
                        <TableCell>
                          <Chip
                            label={vote.voterId}
                            color="error"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{vote.questionId}</TableCell>
                        <TableCell>{vote.choiceId}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

      {debugData.issues.inconsistentVoters &&
        debugData.issues.inconsistentVoters.length > 0 && (
          <Card sx={{ mb: 4 }}>
            <CardHeader
              title="Inconsistent Voters"
              sx={{ bgcolor: "#ff9800", color: "white" }}
            />
            <CardContent>
              <Typography variant="body1" sx={{ mb: 2 }}>
                These voters have inconsistent hasVoted status:
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Voter ID</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Has Voted Flag</TableCell>
                      <TableCell>Actual Votes</TableCell>
                      <TableCell>Issue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {debugData.issues.inconsistentVoters.map((voter, index) => (
                      <TableRow key={index}>
                        <TableCell>{voter.id}</TableCell>
                        <TableCell>{voter.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={voter.hasVoted ? "Yes" : "No"}
                            color={voter.hasVoted ? "success" : "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {voter.voteCount !== undefined
                            ? voter.voteCount
                            : "Unknown"}
                        </TableCell>
                        <TableCell>
                          {voter.hasVoted &&
                          (!voter.voteCount || voter.voteCount === 0)
                            ? "Marked as voted but no votes found"
                            : !voter.hasVoted && voter.voteCount > 0
                            ? "Has votes but not marked as voted"
                            : "Unknown issue"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
        }}
      >
        <Card sx={{ mb: 4, flex: 1 }}>
          <CardHeader
            title="Voter Sample"
            action={
              <Typography variant="body2" color="text.secondary">
                {debugData.voterSample?.length || 0} of{" "}
                {debugData.counts?.voters || 0} voters
              </Typography>
            }
          />
          <CardContent>
            {debugData.voterSample && debugData.voterSample.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Has Voted</TableCell>
                      <TableCell>Admin</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {debugData.voterSample.map((voter, index) => (
                      <TableRow key={index}>
                        <TableCell>{voter.id}</TableCell>
                        <TableCell>{voter.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={voter.hasVoted ? "Yes" : "No"}
                            color={voter.hasVoted ? "success" : "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {voter.isAdmin ? (
                            <Chip label="Admin" color="primary" size="small" />
                          ) : (
                            "No"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body1">No voter sample available</Typography>
            )}
          </CardContent>
        </Card>

        <Card sx={{ mb: 4, flex: 1 }}>
          <CardHeader
            title="Vote Sample"
            action={
              <Typography variant="body2" color="text.secondary">
                {debugData.voteSample?.length || 0} of{" "}
                {debugData.counts?.votes || 0} votes
              </Typography>
            }
          />
          <CardContent>
            {debugData.voteSample && debugData.voteSample.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Voter ID</TableCell>
                      <TableCell>Question/Choice</TableCell>
                      <TableCell>Has Voter</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {debugData.voteSample.map((vote, index) => {
                      const hasMatchingVoter =
                        !debugData.issues.orphanedVotes?.some(
                          (v) => v.id === vote.id
                        );

                      return (
                        <TableRow key={index}>
                          <TableCell>{vote.id}</TableCell>
                          <TableCell>{vote.voterId}</TableCell>
                          <TableCell>
                            Q{vote.questionId}/C{vote.choiceId}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={hasMatchingVoter ? "Yes" : "No"}
                              color={hasMatchingVoter ? "success" : "error"}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body1">No vote sample available</Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ mb: 4 }}>
        <CardHeader title="Voter-Vote Association" />
        <CardContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            This shows how votes and voters are linked in the database:
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 2, border: "1px solid #e0e0e0" }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Voters by Email Domain
                </Typography>
                {debugData.voterSample ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Domain</TableCell>
                          <TableCell>Count</TableCell>
                          <TableCell>Voted</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          // Group by email domain
                          const domains = {};
                          const allVoters = debugData.voterSample || [];

                          allVoters.forEach((voter) => {
                            const domain =
                              voter.email.split("@")[1] || "unknown";
                            if (!domains[domain]) {
                              domains[domain] = {
                                total: 0,
                                voted: 0,
                              };
                            }
                            domains[domain].total++;
                            if (voter.hasVoted) {
                              domains[domain].voted++;
                            }
                          });

                          return Object.entries(domains).map(
                            ([domain, stats], idx) => (
                              <TableRow key={idx}>
                                <TableCell>{domain}</TableCell>
                                <TableCell>{stats.total}</TableCell>
                                <TableCell>{stats.voted}</TableCell>
                              </TableRow>
                            )
                          );
                        })()}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2">No data available</Typography>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 2, border: "1px solid #e0e0e0" }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Vote Distribution
                </Typography>
                {debugData.voteSample ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Voter ID</TableCell>
                          <TableCell>Votes</TableCell>
                          <TableCell>Valid</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          // Group votes by voter ID
                          const votesByVoter = {};
                          const allVotes = debugData.voteSample || [];
                          const orphanedIds = new Set(
                            (debugData.issues.orphanedVotes || []).map(
                              (v) => v.voterId
                            )
                          );

                          allVotes.forEach((vote) => {
                            if (!votesByVoter[vote.voterId]) {
                              votesByVoter[vote.voterId] = {
                                votes: 0,
                                isOrphaned: orphanedIds.has(vote.voterId),
                              };
                            }
                            votesByVoter[vote.voterId].votes++;
                          });

                          return Object.entries(votesByVoter)
                            .sort((a, b) => b[1].votes - a[1].votes)
                            .slice(0, 5)
                            .map(([voterId, stats], idx) => (
                              <TableRow key={idx}>
                                <TableCell>
                                  {voterId.substring(0, 8)}...
                                </TableCell>
                                <TableCell>{stats.votes}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={stats.isOrphaned ? "No" : "Yes"}
                                    color={
                                      stats.isOrphaned ? "error" : "success"
                                    }
                                    size="small"
                                  />
                                </TableCell>
                              </TableRow>
                            ));
                        })()}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2">No data available</Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbar.message}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        action={
          snackbar.severity === "success" ? (
            <CheckCircleIcon color="success" />
          ) : (
            <ErrorIcon color="error" />
          )
        }
      />
    </Box>
  );
};

export default BallotDebug;
