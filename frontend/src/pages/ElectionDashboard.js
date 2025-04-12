import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  Divider,
  Paper,
  LinearProgress,
  Stack,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  CalendarToday as CalendarIcon,
  PeopleAlt as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  PieChart as PieChartIcon,
  AccessTime as TimeIcon,
  ArrowForward as ArrowForwardIcon,
  HowToVote as VoteIcon,
  Share as ShareIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import MainLayout from "../components/Layout/MainLayout";
import { getElectionRequest, getElectionSuccess } from "../store/electionSlice";

// Mock data for a single election
const mockElection = {
  id: 1,
  title: "Board of Directors Election 2023",
  description:
    "Annual election to select the board of directors for the fiscal year 2023-2024",
  status: "Live",
  startDate: "2023-08-01",
  endDate: "2023-08-15",
  totalVoters: 150,
  votedCount: 87,
  participation: 58,
  categories: [
    {
      id: 1,
      name: "Executive Board",
      description: "Select members for the executive board",
      questions: [
        {
          id: 1,
          title: "Chief Executive Officer",
          votesRequired: 1,
          options: [
            { id: 1, name: "John Smith", votes: 42 },
            { id: 2, name: "Sarah Johnson", votes: 35 },
            { id: 3, name: "Robert Williams", votes: 10 },
          ],
        },
        {
          id: 2,
          title: "Chief Financial Officer",
          votesRequired: 1,
          options: [
            { id: 4, name: "Michael Brown", votes: 48 },
            { id: 5, name: "Jennifer Davis", votes: 39 },
          ],
        },
      ],
    },
    {
      id: 2,
      name: "Board Members",
      description: "Select general board members",
      questions: [
        {
          id: 3,
          title: "General Board Members (Select 3)",
          votesRequired: 3,
          options: [
            { id: 6, name: "Daniel Wilson", votes: 65 },
            { id: 7, name: "Emily Thompson", votes: 58 },
            { id: 8, name: "David Martinez", votes: 52 },
            { id: 9, name: "Lisa Anderson", votes: 46 },
            { id: 10, name: "James Taylor", votes: 41 },
          ],
        },
      ],
    },
  ],
  timeRemaining: {
    days: 5,
    hours: 12,
    minutes: 45,
  },
};

const StyledLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 10,
  borderRadius: 5,
  "& .MuiLinearProgress-bar": {
    background: "linear-gradient(90deg, #4478EB 0%, #6FA0FF 100%)",
  },
}));

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

const ActionButton = styled(Button)(({ theme }) => ({
  textTransform: "none",
  borderRadius: "8px",
  fontWeight: 600,
  boxShadow: "none",
  "&:hover": {
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
  },
}));

const ElectionDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentElection, loading } = useSelector((state) => state.elections);

  // Fetch election data on component mount
  useEffect(() => {
    dispatch(getElectionRequest());

    // Simulating API call with mock data
    setTimeout(() => {
      dispatch(getElectionSuccess(mockElection));
    }, 500);

    // In a real application, you would call your API here
    // api.getElectionById(id)
    //   .then(data => dispatch(getElectionSuccess(data)))
    //   .catch(error => dispatch(getElectionFailure(error.message)));
  }, [dispatch, id]);

  const handleViewDetails = () => {
    navigate(`/election/${id}/details`);
  };

  const handleManageVoters = () => {
    navigate(`/election/${id}/voters`);
  };

  // If loading or election not found
  if (loading || !currentElection) {
    return (
      <MainLayout>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="80vh"
        >
          <Typography variant="h5">Loading election data...</Typography>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Box>
            <Box display="flex" alignItems="center" mb={1}>
              <StatusChip
                label={currentElection.status}
                status={currentElection.status}
              />
              <Typography variant="body2" color="text.secondary" ml={2}>
                ID: {currentElection.id}
              </Typography>
            </Box>
            <Typography variant="h4" fontWeight={700}>
              {currentElection.title}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {currentElection.description}
            </Typography>
          </Box>

          <Box display="flex" gap={2}>
            <Tooltip title="Share Election">
              <IconButton color="primary" sx={{ border: "1px solid #E0E0E0" }}>
                <ShareIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton color="primary" sx={{ border: "1px solid #E0E0E0" }}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={6} lg={3}>
            <StatCard>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <TimeIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Time Remaining
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight={700} mb={1}>
                  {currentElection.timeRemaining.days}d{" "}
                  {currentElection.timeRemaining.hours}h
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Election ends on {currentElection.endDate}
                </Typography>
              </CardContent>
            </StatCard>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <StatCard>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <VoteIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Votes Cast
                  </Typography>
                </Box>
                <Typography variant="h3" fontWeight={700} mb={1}>
                  {currentElection.votedCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Out of {currentElection.totalVoters} eligible voters
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
                  {currentElection.participation}%
                </Typography>
                <Box width="100%">
                  <StyledLinearProgress
                    variant="determinate"
                    value={currentElection.participation}
                  />
                </Box>
              </CardContent>
            </StatCard>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <StatCard>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <CalendarIcon sx={{ mr: 1, color: "#9E9E9E" }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Date Range
                  </Typography>
                </Box>
                <Stack spacing={0.5}>
                  <Typography variant="body1" fontWeight={500}>
                    Start: {currentElection.startDate}
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    End: {currentElection.endDate}
                  </Typography>
                </Stack>
              </CardContent>
            </StatCard>
          </Grid>
        </Grid>

        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ borderRadius: 2, p: 3 }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={3}
              >
                <Typography variant="h5" fontWeight={600}>
                  Current Results
                </Typography>
                <ActionButton
                  variant="outlined"
                  color="primary"
                  endIcon={<ArrowForwardIcon />}
                  onClick={handleViewDetails}
                >
                  View Detailed Results
                </ActionButton>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Box>
                {currentElection.categories.map((category) => (
                  <Box key={category.id} mb={4}>
                    <Typography variant="h6" fontWeight={600} mb={2}>
                      {category.name}
                    </Typography>

                    {category.questions.map((question) => (
                      <Box key={question.id} mb={3}>
                        <Typography variant="subtitle1" fontWeight={500} mb={1}>
                          {question.title}
                        </Typography>

                        <Grid container spacing={2}>
                          {question.options.slice(0, 3).map((option) => {
                            const percentage =
                              Math.round(
                                (option.votes / currentElection.votedCount) *
                                  100
                              ) || 0;

                            return (
                              <Grid item xs={12} md={4} key={option.id}>
                                <Box
                                  sx={{
                                    p: 2,
                                    border: "1px solid rgba(0, 0, 0, 0.08)",
                                    borderRadius: 2,
                                    height: "100%",
                                  }}
                                >
                                  <Typography
                                    variant="body1"
                                    fontWeight={600}
                                    mb={1}
                                  >
                                    {option.name}
                                  </Typography>

                                  <Box
                                    display="flex"
                                    justifyContent="space-between"
                                    mb={1}
                                  >
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      {option.votes} votes
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      fontWeight={500}
                                    >
                                      {percentage}%
                                    </Typography>
                                  </Box>

                                  <LinearProgress
                                    variant="determinate"
                                    value={percentage}
                                    sx={{
                                      height: 8,
                                      borderRadius: 4,
                                      bgcolor: "rgba(0, 0, 0, 0.05)",
                                    }}
                                  />
                                </Box>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </Box>
                    ))}
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Grid container spacing={3} direction="column">
              <Grid item>
                <Paper elevation={0} sx={{ borderRadius: 2, p: 3 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <PeopleIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" fontWeight={600}>
                      Voter Management
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Track voter participation and manage the voter list for this
                    election.
                  </Typography>

                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                  >
                    <Typography variant="body1" fontWeight={500}>
                      Voted:
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {currentElection.votedCount}/{currentElection.totalVoters}
                    </Typography>
                  </Box>

                  <ActionButton
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handleManageVoters}
                    sx={{
                      background:
                        "linear-gradient(45deg, #4478EB 30%, #6FA0FF 90%)",
                      color: "white",
                    }}
                  >
                    Manage Voters
                  </ActionButton>
                </Paper>
              </Grid>

              <Grid item>
                <Paper elevation={0} sx={{ borderRadius: 2, p: 3 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <BarChartIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" fontWeight={600}>
                      Analytics
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary" mb={2}>
                    View detailed analytics about voter participation and
                    engagement.
                  </Typography>

                  <ActionButton fullWidth variant="outlined" color="primary">
                    View Analytics
                  </ActionButton>
                </Paper>
              </Grid>

              <Grid item>
                <Paper elevation={0} sx={{ borderRadius: 2, p: 3 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <PieChartIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" fontWeight={600}>
                      Export Results
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Export election results in various formats for reporting.
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="primary"
                        size="small"
                      >
                        PDF
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="primary"
                        size="small"
                      >
                        CSV
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
};

export default ElectionDashboard;
