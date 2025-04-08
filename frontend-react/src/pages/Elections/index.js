import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
  LinearProgress,
  IconButton,
} from "@mui/material";
import { Search, FilterList } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import { styled } from "@mui/material/styles";

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
      case "inactive":
        return {
          bg: theme.palette.grey[200],
          color: theme.palette.grey[700],
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

function Elections() {
  const navigate = useNavigate();
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [elections, setElections] = useState([
    {
      id: "2024_presidential",
      title: "2024 Presidential Election - General Ballot",
      status: "live",
      received: 100,
      total: 500,
      timeInfo: "3:12:16s remaining",
      selected: false,
    },
    {
      id: "healthcare_reform",
      title: "Statewide Ballot Measure: Healthcare Reform Initiative",
      status: "registration",
      received: 0,
      total: 500,
      timeInfo: "Election starts\nDec. 12, 12:00am PST",
      selected: false,
    },
    {
      id: "cityofsf_supervisors",
      title: "City of San Francisco - Board of Supervisors Election",
      status: "inactive",
      received: 240,
      total: 400,
      timeInfo: "Completed",
      selected: false,
    },
    {
      id: "prop18",
      title: "Proposition 18: Renewable Energy Initiative",
      status: "inactive",
      received: 60,
      total: 300,
      timeInfo: "Completed",
      selected: false,
    },
    {
      id: "measureZ",
      title: "Measure Z: Public Transportation Funding",
      status: "registration",
      received: 0,
      total: 500,
      timeInfo: "Election starts\nDec. 12, 12:00am PST",
      selected: false,
    },
  ]);

  // Handle select all
  const handleSelectAll = (event) => {
    const isChecked = event.target.checked;
    setSelectAll(isChecked);

    const updatedElections = elections.map((election) => ({
      ...election,
      selected: isChecked,
    }));

    setElections(updatedElections);
  };

  // Handle individual selection
  const handleSelectElection = (id) => {
    const updatedElections = elections.map((election) =>
      election.id === id
        ? { ...election, selected: !election.selected }
        : election
    );

    setElections(updatedElections);

    // Update selectAll state based on all items being selected
    const allSelected = updatedElections.every((election) => election.selected);
    setSelectAll(allSelected);
  };

  // Navigate to create ballot page
  const handleCreateBallot = () => {
    navigate("/ballot/new");
  };

  // Navigate to election detail
  const handleElectionClick = (id) => {
    navigate(`/election/${id}`);
  };

  // Filter elections based on search query
  const filteredElections =
    searchQuery.trim() === ""
      ? elections
      : elections.filter((election) =>
          election.title.toLowerCase().includes(searchQuery.toLowerCase())
        );

  return (
    <DashboardLayout>
      <Box sx={{ p: 4, backgroundColor: "#FFFFFF" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 4,
          }}
        >
          <Box>
            <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
              My Elections
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Welcome back to Safe Ballot, let's ensure every vote counts.
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateBallot}
            sx={{ mt: 1 }}
          >
            + Create Ballot
          </Button>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            sx={{ borderColor: "divider", color: "text.primary" }}
          >
            More filters
          </Button>

          <TextField
            placeholder="Search"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: 280 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectAll}
                    onChange={handleSelectAll}
                    inputProps={{ "aria-label": "select all elections" }}
                  />
                </TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Ballots Received / # of Voters</TableCell>
                <TableCell>Election Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredElections.map((election) => (
                <TableRow
                  key={election.id}
                  hover
                  onClick={() => handleElectionClick(election.id)}
                  sx={{
                    cursor: "pointer",
                    "&:last-child td, &:last-child th": { border: 0 },
                  }}
                >
                  <TableCell
                    padding="checkbox"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={election.selected}
                      onChange={() => handleSelectElection(election.id)}
                      inputProps={{ "aria-labelledby": election.id }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body1"
                      fontWeight="medium"
                      color="primary.main"
                    >
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
      </Box>
    </DashboardLayout>
  );
}

export default Elections;
