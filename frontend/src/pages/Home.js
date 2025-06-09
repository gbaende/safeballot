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
    case "Inactive":
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
  const navigate = useNavigate();
  const [topElections, setTopElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get elections from localStorage (same source as My Elections page)
    const userBallots = JSON.parse(localStorage.getItem("userBallots") || "[]");

    if (userBallots.length > 0) {
      // Format and sort elections by total voters (largest first)
      const formattedElections = userBallots
        .map((ballot) => ({
          id: ballot.id,
          title: ballot.title,
          status: getElectionStatus(ballot),
          startDate: formatDate(ballot.startDate || ballot.start_date),
          endDate: formatDate(ballot.endDate || ballot.end_date),
          totalVoters: ballot.totalVoters || ballot.total_voters || 0,
          votedCount: ballot.ballotsReceived || ballot.ballots_received || 0,
          participation: calculateParticipation(
            ballot.ballotsReceived || ballot.ballots_received || 0,
            ballot.totalVoters || ballot.total_voters || 0
          ),
        }))
        .sort((a, b) => b.totalVoters - a.totalVoters) // Sort by total voters (largest first)
        .slice(0, 5); // Take only top 5

      setTopElections(formattedElections);
    }

    setLoading(false);
  }, []);

  // Helper function to determine status (simplified version)
  const getElectionStatus = (ballot) => {
    if (!ballot) return "Unknown";

    try {
      const startDateValue = ballot.startDate || ballot.start_date;
      const endDateValue = ballot.endDate || ballot.end_date;

      if (!startDateValue || !endDateValue) {
        return ballot.status || "Draft";
      }

      const now = new Date();
      const startDate = new Date(startDateValue);
      const endDate = new Date(endDateValue);

      if (ballot.status === "draft") return "Draft";
      if (now < startDate) return "Registration";
      if (now >= startDate && now <= endDate) return "Live";
      return "Inactive";
    } catch (error) {
      return ballot.status || "Draft";
    }
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

  const getProgressColor = (participation) => {
    if (participation >= 75) return "success";
    if (participation >= 40) return "info";
    return "warning";
  };

  // Calculate stats from top elections
  const liveElections = topElections.filter((e) => e.status === "Live").length;
  const upcomingElections = topElections.filter(
    (e) => e.status === "Registration"
  ).length;
  const inactiveElections = topElections.filter(
    (e) => e.status === "Inactive"
  ).length;
  const totalElections = topElections.length;

  // Calculate overall participation from top 5
  const totalVoters = topElections.reduce(
    (acc, e) => acc + (e.totalVoters || 0),
    0
  );
  const totalVoted = topElections.reduce(
    (acc, e) => acc + (e.votedCount || 0),
    0
  );
  const overallParticipation =
    totalVoters > 0 ? Math.round((totalVoted / totalVoters) * 100) : 0;

  return (
    <MainLayout>
      <Box>
        <Typography variant="h4" mb={3} fontWeight={700}>
          Dashboard
        </Typography>

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
                    Total Elections
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight={700} mb={1}>
                  {totalElections}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your largest elections
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
              Top 5 Largest Elections
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate("/my-elections")}
            >
              View All Elections
            </Button>
          </Box>

          {!loading && topElections.length === 0 ? (
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
                    <TableCell align="right">Total Voters</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topElections.map((election) => (
                    <TableRow
                      key={election.id}
                      sx={{
                        "&:last-child td, &:last-child th": { border: 0 },
                        cursor: "pointer",
                        "&:hover": { backgroundColor: "#f5f5f5" },
                      }}
                      onClick={() => navigate("/my-elections")}
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
                        <Typography
                          variant="h6"
                          fontWeight={600}
                          color="primary"
                        >
                          {election.totalVoters.toLocaleString()}
                        </Typography>
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
