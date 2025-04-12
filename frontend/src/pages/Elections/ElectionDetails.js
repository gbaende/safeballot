import React, { useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  Tabs,
  Tab,
  Divider,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Breadcrumbs,
  Link,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import BallotIcon from "@mui/icons-material/Ballot";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { green, grey, yellow, red } from "@mui/material/colors";

const PositionCard = styled(Card)(({ theme }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
}));

const ProgressBar = styled(LinearProgress)(({ theme, value }) => ({
  height: 10,
  borderRadius: 5,
  backgroundColor: theme.palette.grey[200],
  "& .MuiLinearProgress-bar": {
    backgroundColor:
      value > 50 ? green[500] : value > 25 ? yellow[700] : red[500],
  },
}));

const ElectionDetails = () => {
  const { id } = useParams();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Mock data for election results
  const election = {
    id: parseInt(id),
    title: "Board Member Election 2023",
    description:
      "Annual election of the board of directors for the organization.",
    status: "Active",
    startDate: "2023-07-01",
    endDate: "2023-07-15",
    voters: {
      total: 120,
      voted: 78,
      pending: 42,
    },
    positions: [
      {
        title: "President",
        description:
          "Chief executive officer responsible for leading the organization.",
        candidates: [
          { id: 1, name: "John Smith", votes: 35, percentage: 45 },
          { id: 2, name: "Sarah Johnson", votes: 25, percentage: 32 },
          { id: 3, name: "Michael Brown", votes: 18, percentage: 23 },
        ],
      },
      {
        title: "Vice President",
        description:
          "Assists the president and assumes presidential duties when necessary.",
        candidates: [
          { id: 4, name: "Robert Davis", votes: 42, percentage: 54 },
          { id: 5, name: "Jennifer Lee", votes: 36, percentage: 46 },
        ],
      },
      {
        title: "Treasurer",
        description:
          "Manages the organization's finances and prepares financial reports.",
        candidates: [
          { id: 6, name: "David Wilson", votes: 38, percentage: 49 },
          { id: 7, name: "Maria Garcia", votes: 40, percentage: 51 },
        ],
      },
      {
        title: "Secretary",
        description:
          "Maintains records, prepares minutes, and handles correspondence.",
        candidates: [
          { id: 8, name: "Emily Taylor", votes: 15, percentage: 19 },
          { id: 9, name: "James Anderson", votes: 22, percentage: 28 },
          { id: 10, name: "Patricia Martin", votes: 25, percentage: 32 },
          { id: 11, name: "Thomas Johnson", votes: 16, percentage: 21 },
        ],
      },
    ],
  };

  // Returns the winner for a position
  const getWinner = (candidates) => {
    return candidates.reduce((prev, current) =>
      prev.votes > current.votes ? prev : current
    );
  };

  const renderPositionTab = (position, index) => {
    const winner = getWinner(position.candidates);

    return (
      <Box key={index} sx={{ py: 2 }}>
        <Typography variant="h5" gutterBottom>
          {position.title}
        </Typography>
        <Typography variant="body1" paragraph>
          {position.description}
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Results
          </Typography>
          <Grid container spacing={2}>
            {position.candidates.map((candidate) => (
              <Grid item xs={12} md={6} key={candidate.id}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderColor:
                      candidate.id === winner.id ? green[500] : "inherit",
                    backgroundColor:
                      candidate.id === winner.id ? green[50] : "inherit",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <Avatar
                      sx={{
                        bgcolor:
                          candidate.id === winner.id ? green[500] : grey[400],
                        mr: 2,
                      }}
                    >
                      {candidate.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1">
                        {candidate.name}
                        {candidate.id === winner.id && (
                          <Chip
                            label="Winner"
                            size="small"
                            color="success"
                            icon={<CheckCircleIcon />}
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {candidate.votes} votes ({candidate.percentage}%)
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <ProgressBar
                      variant="determinate"
                      value={candidate.percentage}
                    />
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider />
      </Box>
    );
  };

  const renderSummaryTab = () => {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Typography variant="h6" gutterBottom>
            Winners by Position
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Position</TableCell>
                  <TableCell>Winner</TableCell>
                  <TableCell>Votes</TableCell>
                  <TableCell>Percentage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {election.positions.map((position) => {
                  const winner = getWinner(position.candidates);
                  return (
                    <TableRow key={position.title}>
                      <TableCell>{position.title}</TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Avatar
                            sx={{
                              bgcolor: green[500],
                              width: 24,
                              height: 24,
                              mr: 1,
                              fontSize: "0.75rem",
                            }}
                          >
                            {winner.name.charAt(0)}
                          </Avatar>
                          {winner.name}
                        </Box>
                      </TableCell>
                      <TableCell>{winner.votes}</TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Typography variant="body2" sx={{ mr: 1 }}>
                            {winner.percentage}%
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={winner.percentage}
                            sx={{ width: 60 }}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid item xs={12} md={5}>
          <Typography variant="h6" gutterBottom>
            Election Statistics
          </Typography>
          <Card variant="outlined">
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Voters
                  </Typography>
                  <Typography variant="h6">{election.voters.total}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Votes Cast
                  </Typography>
                  <Typography variant="h6">{election.voters.voted}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Participation
                  </Typography>
                  <Typography variant="h6">
                    {Math.round(
                      (election.voters.voted / election.voters.total) * 100
                    )}
                    %
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Positions
                  </Typography>
                  <Typography variant="h6">
                    {election.positions.length}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mt: 1 }}>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Voter Participation
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={
                          (election.voters.voted / election.voters.total) * 100
                        }
                        sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                      />
                      <Typography variant="body2">
                        {Math.round(
                          (election.voters.voted / election.voters.total) * 100
                        )}
                        %
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

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

      <Paper sx={{ mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="election results tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Summary" id="tab-0" />
            {election.positions.map((position, index) => (
              <Tab key={index} label={position.title} id={`tab-${index + 1}`} />
            ))}
          </Tabs>
        </Box>
        <Box sx={{ p: 3 }}>
          {tabValue === 0
            ? renderSummaryTab()
            : renderPositionTab(election.positions[tabValue - 1])}
        </Box>
      </Paper>
    </Box>
  );
};

export default ElectionDetails;
