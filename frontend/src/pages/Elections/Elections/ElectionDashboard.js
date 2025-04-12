import React from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Breadcrumbs,
  Link,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import BallotIcon from "@mui/icons-material/Ballot";
import PeopleIcon from "@mui/icons-material/People";
import EventIcon from "@mui/icons-material/Event";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import DescriptionIcon from "@mui/icons-material/Description";

const StatCard = styled(Card)(({ theme }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
}));

const ElectionDashboard = () => {
  const { id } = useParams();
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Mock data for a specific election
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
      { title: "President", candidates: 3, votes: 78 },
      { title: "Vice President", candidates: 2, votes: 76 },
      { title: "Treasurer", candidates: 2, votes: 75 },
      { title: "Secretary", candidates: 4, votes: 74 },
    ],
  };

  const stats = [
    {
      title: "Total Voters",
      value: election.voters.total,
      icon: <PeopleIcon />,
      color: "#2196f3",
    },
    {
      title: "Voted",
      value: election.voters.voted,
      icon: <CheckCircleIcon />,
      color: "#4caf50",
    },
    {
      title: "Participation",
      value: `${Math.round(
        (election.voters.voted / election.voters.total) * 100
      )}%`,
      icon: <DonutLargeIcon />,
      color: "#ff9800",
    },
    {
      title: "Days Left",
      value: 7,
      icon: <EventIcon />,
      color: "#9c27b0",
    },
  ];

  const recentActivity = [
    { id: 1, action: "John Smith voted", time: "10 minutes ago" },
    { id: 2, action: "Maria Garcia voted", time: "25 minutes ago" },
    { id: 3, action: "Robert Johnson voted", time: "1 hour ago" },
    { id: 4, action: "Jennifer Lee voted", time: "2 hours ago" },
    { id: 5, action: "Michael Brown voted", time: "3 hours ago" },
  ];

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
        <Typography
          color="text.primary"
          sx={{ display: "flex", alignItems: "center" }}
        >
          {election.title}
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
        <Box>
          <Typography variant="h4">{election.title}</Typography>
          <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
            <Chip
              label={election.status}
              color={election.status === "Active" ? "success" : "default"}
              size="small"
              sx={{ mr: 2 }}
            />
            <Typography variant="body2" color="text.secondary">
              {election.startDate} - {election.endDate}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            component={RouterLink}
            to={`/elections/${id}/voters`}
          >
            Manage Voters
          </Button>
          <Button
            variant="contained"
            component={RouterLink}
            to={`/elections/${id}/details`}
          >
            View Results
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            <StatCard elevation={2}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      bgcolor: stat.color,
                      color: "white",
                      mr: 2,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Typography variant="h5" component="div">
                    {stat.value}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {stat.title}
                </Typography>
              </CardContent>
            </StatCard>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="election tabs"
          >
            <Tab label="Overview" id="tab-0" />
            <Tab label="Positions" id="tab-1" />
            <Tab label="Activity" id="tab-2" />
          </Tabs>
        </Box>
        <Box
          role="tabpanel"
          hidden={tabValue !== 0}
          id="tabpanel-0"
          sx={{ p: 3 }}
        >
          {tabValue === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>
                  Voter Participation
                </Typography>
                <Box sx={{ mt: 2, mb: 4 }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={
                        (election.voters.voted / election.voters.total) * 100
                      }
                      sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                    />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ ml: 2, minWidth: "45px" }}
                    >
                      {Math.round(
                        (election.voters.voted / election.voters.total) * 100
                      )}
                      %
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {election.voters.voted} voted
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {election.voters.pending} pending
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="h6" gutterBottom>
                  Election Description
                </Typography>
                <Typography variant="body1" paragraph>
                  {election.description}
                </Typography>

                <Typography variant="h6" gutterBottom>
                  Election Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Start Date
                      </Typography>
                      <Typography variant="body1">
                        {election.startDate}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Total Positions
                      </Typography>
                      <Typography variant="body1">
                        {election.positions.length}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        End Date
                      </Typography>
                      <Typography variant="body1">
                        {election.endDate}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Total Voters
                      </Typography>
                      <Typography variant="body1">
                        {election.voters.total}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <List>
                  {recentActivity.map((activity) => (
                    <React.Fragment key={activity.id}>
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: "40px" }}>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary={activity.action}
                          secondary={activity.time}
                        />
                      </ListItem>
                      {activity.id !== recentActivity.length && (
                        <Divider component="li" />
                      )}
                    </React.Fragment>
                  ))}
                </List>
              </Grid>
            </Grid>
          )}
        </Box>
        <Box
          role="tabpanel"
          hidden={tabValue !== 1}
          id="tabpanel-1"
          sx={{ p: 3 }}
        >
          {tabValue === 1 && (
            <Grid container spacing={3}>
              {election.positions.map((position, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Card variant="outlined" sx={{ height: "100%" }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {position.title}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Candidates: {position.candidates}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Votes: {position.votes}
                        </Typography>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <LinearProgress
                          variant="determinate"
                          value={(position.votes / election.voters.voted) * 100}
                          sx={{ flexGrow: 1 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {Math.round(
                            (position.votes / election.voters.voted) * 100
                          )}
                          %
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
        <Box
          role="tabpanel"
          hidden={tabValue !== 2}
          id="tabpanel-2"
          sx={{ p: 3 }}
        >
          {tabValue === 2 && (
            <List>
              {[...Array(10)].map((_, index) => {
                const activity = recentActivity[index % recentActivity.length];
                return (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary={activity.action}
                        secondary={activity.time}
                      />
                    </ListItem>
                    {index !== 9 && <Divider component="li" />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default ElectionDashboard;
