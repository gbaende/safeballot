import React from "react";
import {
  Box,
  Typography,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { styled } from "@mui/material/styles";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import { useSelector } from "react-redux";

// Custom styled components
const StatusBadge = styled(Box)(({ theme, status }) => {
  const getStatusColor = () => {
    switch (status) {
      case "live":
        return {
          bg: theme.palette.success.light,
          color: theme.palette.success.dark,
        };
      case "registration":
        return {
          bg: theme.palette.warning.light,
          color: theme.palette.warning.dark,
        };
      default:
        return {
          bg: theme.palette.grey[200],
          color: theme.palette.grey[700],
        };
    }
  };

  const colors = getStatusColor();

  return {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "0.75rem",
    fontWeight: "medium",
    textTransform: "capitalize",
    backgroundColor: colors.bg,
    color: colors.color,
  };
});

const ProgressBar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  "& .MuiLinearProgress-root": {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.palette.grey[200],
    flexGrow: 1,
  },
  "& .MuiLinearProgress-bar": {
    borderRadius: 4,
  },
}));

const LiveBadge = styled(Box)(({ theme }) => ({
  position: "relative",
  backgroundColor: "#BA0000",
  color: "white",
  padding: "5px 12px 5px 32px",
  borderRadius: 20,
  fontSize: "0.875rem",
  fontWeight: 500,
  display: "inline-block",
  width: "fit-content",
  "&:before": {
    content: '""',
    position: "absolute",
    width: 10,
    height: 10,
    backgroundColor: "white",
    borderRadius: "50%",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
  },
}));

const LiveElectionBanner = styled(Paper)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  marginBottom: theme.spacing(6),
  width: "45%",
  [theme.breakpoints.down("md")]: {
    width: "100%",
  },
}));

const ElectionsSection = styled(Paper)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Mock data for the dashboard
  const liveElection = {
    title: "2024 Presidential Election - General Ballot",
    timeRemaining: "3:12:16s",
    votingPeriod: "Nov 5th - Nov 12",
  };

  const recentElections = [
    {
      id: "2024_presidential",
      title: "2024 Presidential Election - General Ballot",
      status: "live",
      received: 100,
      total: 500,
      timeInfo: "3:12:16s remaining",
    },
    {
      id: "healthcare_reform",
      title: "Statewide Ballot Measure: Healthcare Reform Initiative",
      status: "registration",
      received: 0,
      total: 500,
      timeInfo: "Election starts\nDec. 12, 12:00am PST",
    },
    {
      id: "measureZ",
      title: "Measure Z: Public Transportation Funding",
      status: "registration",
      received: 0,
      total: 500,
      timeInfo: "Election starts\nDec. 12, 12:00am PST",
    },
  ];

  const handleCreateBallot = () => {
    navigate("/ballot/new");
  };

  const handleViewAllElections = () => {
    navigate("/elections");
  };

  const handleElectionClick = (id) => {
    navigate(`/election/${id}`);
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 4, backgroundColor: "#FFFFFF" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 3,
          }}
        >
          <Box>
            <Typography variant="h4" component="h1" sx={{ mb: 0.5 }}>
              Hey, {user?.name || "John"}.
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Welcome back to Safe Ballot, let's ensure every vote counts.
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateBallot}
          >
            + Create Ballot
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <LiveElectionBanner elevation={2}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <LiveBadge>Voting is live</LiveBadge>

            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{ display: "flex", alignItems: "center" }}
            >
              {liveElection.timeRemaining}
              <Typography
                component="span"
                variant="h5"
                fontWeight="normal"
                sx={{ ml: 1 }}
              >
                Remaining
              </Typography>
            </Typography>

            <Typography variant="h6" fontWeight="medium">
              {liveElection.title}
            </Typography>

            <Box sx={{ mt: 1.5, color: "text.secondary" }}>
              <Typography variant="body2">Voting time</Typography>
              <Typography variant="body2">
                {liveElection.votingPeriod}
              </Typography>
            </Box>
          </Box>
        </LiveElectionBanner>

        <ElectionsSection elevation={2}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3.5,
            }}
          >
            <Typography variant="h5" component="h2">
              My Elections
            </Typography>

            <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={handleViewAllElections}
              sx={{
                borderColor: "divider",
                borderRadius: 1,
                textTransform: "none",
              }}
            >
              View All →
            </Button>
          </Box>

          <TableContainer
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title ↓</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Ballots Received / # of Voters</TableCell>
                  <TableCell>Election Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentElections.map((election) => (
                  <TableRow
                    key={election.id}
                    hover
                    onClick={() => handleElectionClick(election.id)}
                    sx={{
                      cursor: "pointer",
                      "&:last-child td, &:last-child th": { border: 0 },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {election.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={election.status}>
                        {election.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <ProgressBar>
                        <LinearProgress
                          variant="determinate"
                          value={
                            election.status === "registration"
                              ? 0
                              : (election.received / election.total) * 100
                          }
                          color="primary"
                        />
                        <Typography variant="body2">
                          {election.status === "registration"
                            ? "-"
                            : election.received}
                          /{election.total}
                        </Typography>
                      </ProgressBar>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" whiteSpace="pre-line">
                        {election.timeInfo}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </ElectionsSection>
      </Box>
    </DashboardLayout>
  );
}

export default Dashboard;
