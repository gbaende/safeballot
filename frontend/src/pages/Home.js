import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Chip,
  Stack,
  CircularProgress,
  Alert,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  HowToVote as HowToVoteIcon,
  ArrowForward as ArrowForwardIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import MainLayout from "../components/Layout/MainLayout";
import {
  fetchElectionsRequest,
  fetchElectionsSuccess,
  fetchElectionsFailure,
} from "../store/electionSlice";
import { ballotService } from "../services/api";

const StatCard = styled(Card)(({ theme }) => ({
  height: "100%",
  borderRadius: theme.shape.borderRadius,
  boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
  transition: "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: "0px 8px 25px rgba(0, 0, 0, 0.1)",
  },
}));

const StyledLinearProgress = styled(LinearProgress)(({ theme, color }) => {
  let gradientColors;

  switch (color) {
    case "success":
      gradientColors = "linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%)";
      break;
    case "warning":
      gradientColors = "linear-gradient(90deg, #FF9800 0%, #FFC107 100%)";
      break;
    case "info":
      gradientColors = "linear-gradient(90deg, #2196F3 0%, #03A9F4 100%)";
      break;
    default:
      gradientColors = "linear-gradient(90deg, #4478EB 0%, #6FA0FF 100%)";
      break;
  }

  return {
    height: 8,
    borderRadius: 4,
    "& .MuiLinearProgress-bar": {
      background: gradientColors,
    },
  };
});

const StatusChip = styled(Chip)(({ theme, status }) => {
  let chipColor;

  switch (status) {
    case "Live":
      chipColor = "#4CAF50";
      break;
    case "Registration":
      chipColor = "#2196F3";
      break;
    case "Completed":
      chipColor = "#9E9E9E";
      break;
    default:
      chipColor = "#4478EB";
      break;
  }

  return {
    backgroundColor: `${chipColor}15`,
    color: chipColor,
    fontWeight: 600,
    borderRadius: "16px",
  };
});

const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { elections, loading } = useSelector((state) => state.elections);
  const [error, setError] = useState(null);

  // Fetch elections on component mount
  useEffect(() => {
    // Attempt to get data from localStorage first - this is what My Elections uses
    const userBallots = JSON.parse(localStorage.getItem("userBallots") || "[]");

    // If we already have ballots in localStorage, use those directly (this matches My Elections)
    if (userBallots.length > 0) {
      console.log(
        "Home: Using existing ballots from localStorage:",
        userBallots.length
      );

      // Format the elections from localStorage to match our display format
      const formattedElections = userBallots.map((ballot) => ({
        id: ballot.id,
        title: ballot.title,
        status: getBallotStatus(ballot),
        startDate: formatDate(ballot.startDate || ballot.start_date),
        endDate: formatDate(ballot.endDate || ballot.end_date),
        totalVoters: ballot.totalVoters || ballot.total_voters || 0,
        votedCount: ballot.ballotsReceived || ballot.ballots_received || 0,
        participation: calculateParticipation(
          ballot.ballotsReceived || ballot.ballots_received || 0,
          ballot.totalVoters || ballot.total_voters || 0
        ),
      }));

      // Update Redux state with these elections
      dispatch(fetchElectionsSuccess(formattedElections));
      return;
    }

    // If we don't have existing data, fetch from API
    dispatch(fetchElectionsRequest());
    setError(null);

    // Get current user ID and email from auth
    const adminUser = JSON.parse(localStorage.getItem("adminUser") || "{}");
    const userId = adminUser.id;
    const userEmail = adminUser.email;
    console.log("Current user ID:", userId, "Email:", userEmail);

    // Fetch real data from ballotService
    ballotService
      .getBallots()
      .then((response) => {
        console.log("Home: Received ballot data from API", response);
        if (response.data && response.data.data) {
          // Log the first ballot to see all fields that might contain user ID
          if (response.data.data.length > 0) {
            console.log(
              "First ballot object keys:",
              Object.keys(response.data.data[0])
            );
            console.log("User ID fields in first ballot:", {
              userId: response.data.data[0].userId,
              user_id: response.data.data[0].user_id,
              created_by: response.data.data[0].created_by,
              createdBy: response.data.data[0].createdBy,
              creator_id: response.data.data[0].creator_id,
              creatorId: response.data.data[0].creatorId,
              admin_id: response.data.data[0].admin_id,
              adminId: response.data.data[0].adminId,
              owner_id: response.data.data[0].owner_id,
              ownerId: response.data.data[0].ownerId,
              // Email fields
              admin_email: response.data.data[0].admin_email,
              adminEmail: response.data.data[0].adminEmail,
              creator_email: response.data.data[0].creator_email,
              creatorEmail: response.data.data[0].creatorEmail,
              user_email: response.data.data[0].user_email,
              userEmail: response.data.data[0].userEmail,
              owner_email: response.data.data[0].owner_email,
              ownerEmail: response.data.data[0].ownerEmail,
            });
          }

          // Process data to ensure consistent format and filter by ownership
          const formattedElections = response.data.data
            .filter((ballot) => {
              // Only include ballots owned by current user
              if (!userId && !userEmail) return false; // If no user ID or email, don't show any ballots

              // Check ID-based ownership
              const idMatch =
                ballot.userId === userId ||
                ballot.user_id === userId ||
                ballot.created_by === userId ||
                ballot.createdBy === userId ||
                ballot.creator_id === userId ||
                ballot.creatorId === userId ||
                ballot.admin_id === userId ||
                ballot.adminId === userId ||
                ballot.owner_id === userId ||
                ballot.ownerId === userId;

              // Check email-based ownership if we have a user email
              const emailMatch =
                userEmail &&
                (ballot.admin_email === userEmail ||
                  ballot.adminEmail === userEmail ||
                  ballot.creator_email === userEmail ||
                  ballot.creatorEmail === userEmail ||
                  ballot.user_email === userEmail ||
                  ballot.userEmail === userEmail ||
                  ballot.owner_email === userEmail ||
                  ballot.ownerEmail === userEmail);

              return idMatch || emailMatch;
            })
            .map((ballot) => ({
              id: ballot.id,
              title: ballot.title,
              status: getBallotStatus(ballot),
              startDate: formatDate(ballot.startDate || ballot.start_date),
              endDate: formatDate(ballot.endDate || ballot.end_date),
              totalVoters: ballot.totalVoters || ballot.total_voters || 0,
              votedCount:
                ballot.ballotsReceived || ballot.ballots_received || 0,
              participation: calculateParticipation(
                ballot.ballotsReceived || ballot.ballots_received || 0,
                ballot.totalVoters || ballot.total_voters || 0
              ),
            }));

          console.log("Filtered elections for user:", formattedElections);

          // Store the processed elections in localStorage so My Elections page can use them too
          localStorage.setItem(
            "userBallots",
            JSON.stringify(response.data.data)
          );

          dispatch(fetchElectionsSuccess(formattedElections));
        } else {
          // If no data, set empty array
          dispatch(fetchElectionsSuccess([]));
        }
      })
      .catch((error) => {
        console.error("Error fetching ballots:", error);
        dispatch(fetchElectionsFailure(error.message));
        setError("Failed to fetch elections. Please try again later.");
      });
  }, [dispatch]); // Only depend on dispatch, not on elections.length or loading

  // Helper to determine ballot status
  const getBallotStatus = (ballot) => {
    if (!ballot) return "Unknown";

    if (ballot.status) {
      // If status is directly available, map it to our display format
      switch (ballot.status.toLowerCase()) {
        case "active":
          return "Live";
        case "draft":
          return "Registration";
        case "scheduled":
          return "Registration";
        case "completed":
          return "Completed";
        default:
          return ballot.status;
      }
    }

    // Fall back to date-based status determination
    const now = new Date();
    const startDate = ballot.startDate ? new Date(ballot.startDate) : null;
    const endDate = ballot.endDate ? new Date(ballot.endDate) : null;

    if (endDate && endDate < now) return "Completed";
    if (startDate && startDate <= now) return "Live";
    return "Registration";
  };

  // Helper to format dates
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Helper to calculate participation percentage
  const calculateParticipation = (votes, total) => {
    if (!total || total <= 0) return 0;
    return Math.round((votes / total) * 100);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Live":
        return "success";
      case "Registration":
        return "info";
      case "Completed":
        return "default";
      default:
        return "primary";
    }
  };

  const getProgressColor = (participation) => {
    if (participation >= 75) return "success";
    if (participation >= 40) return "info";
    return "warning";
  };

  const handleElectionClick = (id) => {
    navigate(`/election/${id}/dashboard`);
  };

  // Count elections by status
  const liveElections = elections.filter((e) => e.status === "Live").length;
  const upcomingElections = elections.filter(
    (e) => e.status === "Registration"
  ).length;
  const completedElections = elections.filter(
    (e) => e.status === "Completed"
  ).length;

  // Calculate overall participation
  const totalVoters = elections.reduce(
    (acc, e) => acc + (e.totalVoters || 0),
    0
  );
  const totalVoted = elections.reduce((acc, e) => acc + (e.votedCount || 0), 0);
  const overallParticipation =
    totalVoters > 0 ? Math.round((totalVoted / totalVoters) * 100) : 0;

  return (
    <MainLayout>
      <Box>
        <Typography variant="h4" mb={3} fontWeight={700}>
          Dashboard
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={6} lg={3}>
            <StatCard>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <HowToVoteIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Live Elections
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight={700} mb={1}>
                  {liveElections}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Currently active elections
                </Typography>
              </CardContent>
            </StatCard>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <StatCard>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <CalendarIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Upcoming
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight={700} mb={1}>
                  {upcomingElections}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Elections in registration phase
                </Typography>
              </CardContent>
            </StatCard>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <StatCard>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <PeopleIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Participation
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight={700} mb={1}>
                  {overallParticipation}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Average voter turnout
                </Typography>
              </CardContent>
            </StatCard>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <StatCard>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <CalendarIcon sx={{ mr: 1, color: "#9E9E9E" }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Completed
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight={700} mb={1}>
                  {completedElections}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Elections ended
                </Typography>
              </CardContent>
            </StatCard>
          </Grid>
        </Grid>

        <Box mb={4}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h5" fontWeight={600}>
              Recent Elections
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate("/my-elections")}
            >
              View All
            </Button>
          </Box>

          {!loading && elections.length === 0 ? (
            <Paper
              elevation={0}
              sx={{ p: 4, textAlign: "center", borderRadius: 2 }}
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Elections Found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                You don't have any elections yet. Create your first election to
                get started.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => navigate("/ballot-builder")}
              >
                Create Election
              </Button>
            </Paper>
          ) : (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{ borderRadius: 2 }}
            >
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Election Title</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Participation</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {elections.map((election) => (
                    <TableRow
                      key={election.id}
                      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                    >
                      <TableCell component="th" scope="row">
                        <Typography variant="subtitle2" fontWeight={600}>
                          {election.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusChip
                          label={election.status}
                          status={election.status}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            Start: {election.startDate}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            End: {election.endDate}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Box width="100%" maxWidth={200}>
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            mb={0.5}
                          >
                            <Typography variant="body2" fontWeight={500}>
                              {election.participation}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {election.votedCount}/{election.totalVoters}
                            </Typography>
                          </Box>
                          <StyledLinearProgress
                            variant="determinate"
                            value={election.participation}
                            color={getProgressColor(election.participation)}
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => handleElectionClick(election.id)}
                          sx={{
                            background:
                              "linear-gradient(45deg, #4478EB 30%, #6FA0FF 90%)",
                            color: "white",
                            fontWeight: 600,
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Box>
    </MainLayout>
  );
};

export default Home;
