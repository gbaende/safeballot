import React from "react";
import { useSelector } from "react-redux";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  LinearProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import PeopleIcon from "@mui/icons-material/People";
import PollIcon from "@mui/icons-material/Poll";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const StatCard = styled(Card)(({ theme }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
}));

const IconWrapper = styled(Box)(({ theme, color }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: "50%",
  backgroundColor: color,
  color: theme.palette.common.white,
  marginBottom: theme.spacing(1),
}));

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);

  // Mock data for the dashboard
  const stats = [
    {
      title: "Total Elections",
      value: 5,
      icon: <HowToVoteIcon />,
      color: "#2196f3",
    },
    {
      title: "Active Elections",
      value: 2,
      icon: <PollIcon />,
      color: "#4caf50",
    },
    {
      title: "Total Voters",
      value: 245,
      icon: <PeopleIcon />,
      color: "#ff9800",
    },
    {
      title: "Completed Elections",
      value: 3,
      icon: <CheckCircleIcon />,
      color: "#9c27b0",
    },
  ];

  const recentElections = [
    {
      id: 1,
      title: "Board Member Election 2023",
      status: "Active",
      participation: 65,
      voters: 120,
    },
    {
      id: 2,
      title: "Annual General Meeting",
      status: "Active",
      participation: 42,
      voters: 85,
    },
    {
      id: 3,
      title: "Budget Approval",
      status: "Completed",
      participation: 90,
      voters: 40,
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            <StatCard elevation={2}>
              <CardContent>
                <IconWrapper color={stat.color}>{stat.icon}</IconWrapper>
                <Typography variant="h5" component="div">
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.title}
                </Typography>
              </CardContent>
            </StatCard>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h5" sx={{ mb: 2 }}>
        Recent Elections
      </Typography>

      <Paper elevation={2} sx={{ p: 2 }}>
        <Grid container spacing={2}>
          {recentElections.map((election) => (
            <Grid item xs={12} key={election.id}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6">{election.title}</Typography>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Status:{" "}
                    <Box
                      component="span"
                      sx={{
                        fontWeight: "bold",
                        color:
                          election.status === "Active"
                            ? "success.main"
                            : "text.primary",
                      }}
                    >
                      {election.status}
                    </Box>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Voters: {election.voters}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={election.participation}
                    sx={{ flexGrow: 1 }}
                    color={election.participation > 50 ? "success" : "primary"}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {election.participation}% Participation
                  </Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default Dashboard;
