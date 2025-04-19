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
  title: "2024 Presidential Election",
  subtitle: "General Ballot",
  description: "2024 United States Presidential Election",
  status: "Live",
  startDate: "2024-11-01",
  endDate: "2024-11-05",
  totalVoters: 350,
  votedCount: 178,
  participation: 51,
  categories: [
    {
      id: 1,
      name: "Presidential Election",
      description: "Choose the next President of the United States",
      questions: [
        {
          id: 1,
          title: "Presidential Election",
          votesRequired: 1,
          options: [
            { id: 1, name: "Kamala D. Harris", votes: 92, percentage: 58.23 },
            { id: 2, name: "Donald J. Trump", votes: 86, percentage: 54.43 },
            {
              id: 3,
              name: "Robert F. Kennedy Jr.",
              votes: 2,
              percentage: 1.27,
            },
            { id: 4, name: "Jill Stein", votes: 8, percentage: 5.06 },
            { id: 5, name: "Cornel West", votes: 9, percentage: 5.7 },
            { id: 6, name: "Randall Terry", votes: 3, percentage: 1.9 },
          ],
        },
      ],
    },
    {
      id: 2,
      name: "US House of Representatives",
      description: "Choose your district representative",
      questions: [
        {
          id: 2,
          title: "US House of Representatives",
          votesRequired: 1,
          options: [
            { id: 7, name: "Sample Candidate 1", votes: 92, percentage: 58.23 },
            { id: 8, name: "Sample Candidate 2", votes: 86, percentage: 54.43 },
          ],
        },
      ],
    },
    {
      id: 3,
      name: "District Governor",
      description: "Choose your district governor",
      questions: [
        {
          id: 3,
          title: "District Governor",
          votesRequired: 1,
          options: [
            { id: 9, name: "Sample Candidate 1", votes: 92, percentage: 51.9 },
            { id: 10, name: "Sample Candidate 2", votes: 86, percentage: 48.1 },
          ],
        },
      ],
    },
    {
      id: 4,
      name: "District Lieutenant Governor",
      description: "Choose your district lieutenant governor",
      questions: [
        {
          id: 4,
          title: "District Lieutenant Governor",
          votesRequired: 1,
          options: [
            { id: 11, name: "Sample Candidate 1", votes: 92, percentage: 51.9 },
            { id: 12, name: "Sample Candidate 2", votes: 86, percentage: 48.1 },
          ],
        },
      ],
    },
    {
      id: 5,
      name: "District Attorney General",
      description: "Choose your district attorney general",
      questions: [
        {
          id: 5,
          title: "District Attorney General",
          votesRequired: 1,
          options: [
            { id: 13, name: "Sample Candidate 1", votes: 92, percentage: 51.9 },
            { id: 14, name: "Sample Candidate 2", votes: 86, percentage: 48.1 },
          ],
        },
      ],
    },
    {
      id: 6,
      name: "District Commissioner of Agriculture",
      description: "Choose your district commissioner of agriculture",
      questions: [
        {
          id: 6,
          title: "District Commissioner of Agriculture",
          votesRequired: 1,
          options: [
            { id: 15, name: "Sample Candidate 1", votes: 92, percentage: 51.9 },
            { id: 16, name: "Sample Candidate 2", votes: 86, percentage: 48.1 },
          ],
        },
      ],
    },
    {
      id: 7,
      name: "District Commissioner of Insurance",
      description: "Choose your district commissioner of insurance",
      questions: [
        {
          id: 7,
          title: "District Commissioner of Insurance",
          votesRequired: 1,
          options: [
            { id: 17, name: "Sample Candidate 1", votes: 92, percentage: 51.9 },
            { id: 18, name: "Sample Candidate 2", votes: 86, percentage: 48.1 },
          ],
        },
      ],
    },
    {
      id: 8,
      name: "District Commissioner of Labor",
      description: "Choose your district commissioner of labor",
      questions: [
        {
          id: 8,
          title: "District Commissioner of Labor",
          votesRequired: 1,
          options: [
            { id: 19, name: "Sample Candidate 1", votes: 92, percentage: 51.9 },
            { id: 20, name: "Sample Candidate 2", votes: 86, percentage: 48.1 },
          ],
        },
      ],
    },
    {
      id: 9,
      name: "District Commissioner of State",
      description: "Choose your district commissioner of state",
      questions: [
        {
          id: 9,
          title: "District Commissioner of State",
          votesRequired: 1,
          options: [
            { id: 21, name: "Sample Candidate 1", votes: 92, percentage: 51.9 },
            { id: 22, name: "Sample Candidate 2", votes: 86, percentage: 48.1 },
          ],
        },
      ],
    },
    {
      id: 10,
      name: "District Superintendent of Public Instruction",
      description: "Choose your district superintendent of public instruction",
      questions: [
        {
          id: 10,
          title: "District Superintendent of Public Instruction",
          votesRequired: 1,
          options: [
            { id: 23, name: "Sample Candidate 1", votes: 92, percentage: 51.9 },
            { id: 24, name: "Sample Candidate 2", votes: 86, percentage: 48.1 },
          ],
        },
      ],
    },
  ],
};

const StyledLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 8,
  borderRadius: 4,
  backgroundColor: "#E2E8F0",
  "& .MuiLinearProgress-bar": {
    background: "linear-gradient(90deg, #00005E 0%, #4478EB 100%)",
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
      <Box sx={{ maxWidth: 1200, margin: "0 auto", p: 2 }}>
        <Paper
          elevation={0}
          sx={{
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
              <IconButton onClick={handleBackToDashboard} sx={{ mr: 1 }}>
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h6" fontWeight={600}>
                {electionResults.title} - {electionResults.subtitle}
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

            {electionResults.categories.map((category) => (
              <Box key={category.id} sx={{ mb: 4 }}>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                  {category.questions[0].title}
                </Typography>

                {category.questions[0].options.map((option) => (
                  <Box key={option.id} sx={{ mb: 1.5 }}>
                    <Typography variant="body2" mb={0.5}>
                      {option.name}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Box sx={{ flexGrow: 1, mr: 2 }}>
                        <StyledLinearProgress
                          variant="determinate"
                          value={option.percentage}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ minWidth: 40 }}>
                        {option.percentage.toFixed(2)}%
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default ElectionDetailsView;
