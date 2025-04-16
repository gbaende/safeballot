import React, { useEffect } from "react";
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
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  HowToVote as HowToVoteIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";
import MainLayout from "../components/Layout/MainLayout";
import {
  fetchElectionsRequest,
  fetchElectionsSuccess,
  fetchElectionsFailure,
} from "../store/electionSlice";

// Sample data - replace with API calls
const mockElections = [
  {
    id: 1,
    title: "Board of Directors Election 2023",
    status: "Live",
    startDate: "2023-08-01",
    endDate: "2023-08-15",
    totalVoters: 150,
    votedCount: 87,
    participation: 58,
  },
  {
    id: 2,
    title: "Annual Shareholders Meeting",
    status: "Registration",
    startDate: "2023-09-01",
    endDate: "2023-09-15",
    totalVoters: 250,
    votedCount: 0,
    participation: 0,
  },
  {
    id: 3,
    title: "Executive Committee Selection",
    status: "Completed",
    startDate: "2023-07-01",
    endDate: "2023-07-15",
    totalVoters: 50,
    votedCount: 48,
    participation: 96,
  },
];

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

  // Fetch elections on component mount
  useEffect(() => {
    // Don't fetch if already loaded
    if (elections.length > 0 && !loading) {
      return;
    }

    dispatch(fetchElectionsRequest());

    // Simulating API call with mock data
    setTimeout(() => {
      dispatch(fetchElectionsSuccess(mockElections));
    }, 500);

    // In a real application, you would call your API here
    // api.getElections()
    //   .then(data => dispatch(fetchElectionsSuccess(data)))
    //   .catch(error => dispatch(fetchElectionsFailure(error.message)));
  }, [dispatch, elections.length, loading]);

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
  const totalVoters = elections.reduce((acc, e) => acc + e.totalVoters, 0);
  const totalVoted = elections.reduce((acc, e) => acc + e.votedCount, 0);
  const overallParticipation =
    totalVoters > 0 ? Math.round((totalVoted / totalVoters) * 100) : 0;

  return (
    <MainLayout>
      <Box>
        <Typography variant="h4" mb={3} fontWeight={700}>
          Dashboard
        </Typography>

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
        </Box>
      </Box>
    </MainLayout>
  );
};

export default Home;
