import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Divider,
  Button,
  LinearProgress,
  Stack,
  Chip,
  Breadcrumbs,
  Link,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Print as PrintIcon,
  HowToVote as VoteIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import MainLayout from "../components/Layout/MainLayout";
import {
  getElectionRequest,
  getElectionSuccess,
  getElectionResultsRequest,
  getElectionResultsSuccess,
} from "../store/electionSlice";

// Mock data for election results
const mockElectionResults = {
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
            { id: 1, name: "John Smith", votes: 42, percentage: 48 },
            { id: 2, name: "Sarah Johnson", votes: 35, percentage: 40 },
            { id: 3, name: "Robert Williams", votes: 10, percentage: 12 },
          ],
        },
        {
          id: 2,
          title: "Chief Financial Officer",
          votesRequired: 1,
          options: [
            { id: 4, name: "Michael Brown", votes: 48, percentage: 55 },
            { id: 5, name: "Jennifer Davis", votes: 39, percentage: 45 },
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
            { id: 6, name: "Daniel Wilson", votes: 65, percentage: 75 },
            { id: 7, name: "Emily Thompson", votes: 58, percentage: 67 },
            { id: 8, name: "David Martinez", votes: 52, percentage: 60 },
            { id: 9, name: "Lisa Anderson", votes: 46, percentage: 53 },
            { id: 10, name: "James Taylor", votes: 41, percentage: 47 },
          ],
        },
      ],
    },
    {
      id: 3,
      name: "Policy Votes",
      description: "Vote on proposed policy changes",
      questions: [
        {
          id: 4,
          title:
            "Should the organization increase the annual budget for community outreach?",
          votesRequired: 1,
          options: [
            { id: 11, name: "Yes", votes: 61, percentage: 70 },
            { id: 12, name: "No", votes: 26, percentage: 30 },
          ],
        },
        {
          id: 5,
          title: "Should we adopt the new sustainability framework?",
          votesRequired: 1,
          options: [
            { id: 13, name: "Yes", votes: 72, percentage: 83 },
            { id: 14, name: "No", votes: 15, percentage: 17 },
          ],
        },
      ],
    },
  ],
};

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

const ResultCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
  height: "100%",
}));

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const ElectionDetailsView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentElection, electionResults, loading } = useSelector(
    (state) => state.elections
  );

  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Fetch election data and results on component mount
  useEffect(() => {
    dispatch(getElectionRequest());
    dispatch(getElectionResultsRequest());

    // Simulating API calls with mock data
    setTimeout(() => {
      dispatch(getElectionSuccess(mockElectionResults));
      dispatch(getElectionResultsSuccess(mockElectionResults));
    }, 500);

    // In a real application, you would call your API here
    // api.getElectionById(id)
    //   .then(data => dispatch(getElectionSuccess(data)))
    //   .catch(error => dispatch(getElectionFailure(error.message)));
    // api.getElectionResults(id)
    //   .then(data => dispatch(getElectionResultsSuccess(data)))
    //   .catch(error => dispatch(getElectionResultsFailure(error.message)));
  }, [dispatch, id]);

  const handleBackToDashboard = () => {
    navigate(`/election/${id}/dashboard`);
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 75) return "success";
    if (percentage >= 40) return "info";
    return "warning";
  };

  // If loading or election not found
  if (loading || !electionResults) {
    return (
      <MainLayout>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="80vh"
        >
          <Typography variant="h5">Loading election results...</Typography>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box>
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="breadcrumb"
          sx={{ mb: 2 }}
        >
          <Link
            color="inherit"
            onClick={() => navigate("/home")}
            sx={{ cursor: "pointer", textDecoration: "none" }}
          >
            Dashboard
          </Link>
          <Link
            color="inherit"
            onClick={() => navigate("/my-elections")}
            sx={{ cursor: "pointer", textDecoration: "none" }}
          >
            My Elections
          </Link>
          <Link
            color="inherit"
            onClick={handleBackToDashboard}
            sx={{ cursor: "pointer", textDecoration: "none" }}
          >
            Election Dashboard
          </Link>
          <Typography color="text.primary">Results</Typography>
        </Breadcrumbs>

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          mb={3}
        >
          <Box>
            <Box display="flex" alignItems="center" mb={1}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={handleBackToDashboard}
                sx={{ mr: 2 }}
              >
                Back to Dashboard
              </Button>
              <StatusChip
                label={electionResults.status}
                status={electionResults.status}
              />
            </Box>
            <Typography variant="h4" fontWeight={700} mb={1}>
              {electionResults.title} - Results
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {electionResults.description}
            </Typography>
          </Box>

          <Box display="flex" gap={1}>
            <Tooltip title="Download Results">
              <IconButton color="primary" sx={{ border: "1px solid #E0E0E0" }}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share Results">
              <IconButton color="primary" sx={{ border: "1px solid #E0E0E0" }}>
                <ShareIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Print Results">
              <IconButton color="primary" sx={{ border: "1px solid #E0E0E0" }}>
                <PrintIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ width: "100%", mb: 4 }}>
          <Paper elevation={0} sx={{ borderRadius: 2 }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="election results tabs"
                sx={{
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontWeight: 600,
                  },
                  "& .Mui-selected": {
                    color: "#4478EB",
                  },
                  "& .MuiTabs-indicator": {
                    backgroundColor: "#4478EB",
                  },
                }}
              >
                <Tab label="All Categories" />
                {electionResults.categories.map((category) => (
                  <Tab key={category.id} label={category.name} />
                ))}
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <Box>
                <Box display="flex" alignItems="center" mb={3}>
                  <VoteIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h5" fontWeight={600}>
                    All Results
                  </Typography>
                </Box>

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={3}
                >
                  <Typography variant="body1">
                    Overall Participation:{" "}
                    <b>{electionResults.participation}%</b> (
                    {electionResults.votedCount}/{electionResults.totalVoters}{" "}
                    votes)
                  </Typography>
                  <Box width={200}>
                    <StyledLinearProgress
                      variant="determinate"
                      value={electionResults.participation}
                      color={getProgressColor(electionResults.participation)}
                    />
                  </Box>
                </Box>

                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                  {electionResults.categories.map((category) => (
                    <Grid item xs={12} key={category.id}>
                      <Box mb={3}>
                        <Typography variant="h5" fontWeight={600} mb={1}>
                          {category.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          mb={2}
                        >
                          {category.description}
                        </Typography>

                        <Grid container spacing={3}>
                          {category.questions.map((question) => (
                            <Grid item xs={12} md={6} lg={4} key={question.id}>
                              <ResultCard>
                                <CardContent>
                                  <Typography
                                    variant="h6"
                                    fontWeight={600}
                                    mb={2}
                                  >
                                    {question.title}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    mb={2}
                                  >
                                    Select {question.votesRequired} option
                                    {question.votesRequired > 1 ? "s" : ""}
                                  </Typography>

                                  <Divider sx={{ mb: 2 }} />

                                  <Stack spacing={2}>
                                    {question.options.map((option, index) => {
                                      const isWinner =
                                        index < question.votesRequired;

                                      return (
                                        <Box key={option.id}>
                                          <Box
                                            display="flex"
                                            justifyContent="space-between"
                                            mb={0.5}
                                          >
                                            <Typography
                                              variant="body1"
                                              fontWeight={isWinner ? 700 : 400}
                                            >
                                              {option.name}{" "}
                                              {isWinner && "(Winner)"}
                                            </Typography>
                                            <Typography
                                              variant="body1"
                                              fontWeight={600}
                                            >
                                              {option.percentage}%
                                            </Typography>
                                          </Box>

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
                                          </Box>

                                          <StyledLinearProgress
                                            variant="determinate"
                                            value={option.percentage}
                                            color={
                                              isWinner ? "success" : "info"
                                            }
                                          />
                                        </Box>
                                      );
                                    })}
                                  </Stack>
                                </CardContent>
                              </ResultCard>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </TabPanel>

            {electionResults.categories.map((category, index) => (
              <TabPanel key={category.id} value={tabValue} index={index + 1}>
                <Box>
                  <Box display="flex" alignItems="center" mb={3}>
                    <VoteIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h5" fontWeight={600}>
                      {category.name} Results
                    </Typography>
                  </Box>

                  <Typography variant="body1" mb={3}>
                    {category.description}
                  </Typography>

                  <Divider sx={{ mb: 3 }} />

                  <Grid container spacing={3}>
                    {category.questions.map((question) => (
                      <Grid item xs={12} md={6} lg={4} key={question.id}>
                        <ResultCard>
                          <CardContent>
                            <Typography variant="h6" fontWeight={600} mb={2}>
                              {question.title}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              mb={2}
                            >
                              Select {question.votesRequired} option
                              {question.votesRequired > 1 ? "s" : ""}
                            </Typography>

                            <Divider sx={{ mb: 2 }} />

                            <Stack spacing={2}>
                              {question.options.map((option, index) => {
                                const isWinner = index < question.votesRequired;

                                return (
                                  <Box key={option.id}>
                                    <Box
                                      display="flex"
                                      justifyContent="space-between"
                                      mb={0.5}
                                    >
                                      <Typography
                                        variant="body1"
                                        fontWeight={isWinner ? 700 : 400}
                                      >
                                        {option.name} {isWinner && "(Winner)"}
                                      </Typography>
                                      <Typography
                                        variant="body1"
                                        fontWeight={600}
                                      >
                                        {option.percentage}%
                                      </Typography>
                                    </Box>

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
                                    </Box>

                                    <StyledLinearProgress
                                      variant="determinate"
                                      value={option.percentage}
                                      color={isWinner ? "success" : "info"}
                                    />
                                  </Box>
                                );
                              })}
                            </Stack>
                          </CardContent>
                        </ResultCard>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </TabPanel>
            ))}
          </Paper>
        </Box>
      </Box>
    </MainLayout>
  );
};

export default ElectionDetailsView;
