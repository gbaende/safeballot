import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  IconButton,
  Button,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  InputAdornment,
  Tooltip,
  CircularProgress,
  Alert,
  LinearProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as ContentCopyIcon,
  PeopleAlt as PeopleAltIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import MainLayout from "../components/Layout/MainLayout";
import {
  fetchElectionsRequest,
  fetchElectionsSuccess,
  fetchElectionsFailure,
} from "../store/electionSlice";
import { ballotService } from "../services/api";

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
    status: "Inactive",
    startDate: "2023-07-01",
    endDate: "2023-07-15",
    totalVoters: 50,
    votedCount: 48,
    participation: 96,
  },
  {
    id: 4,
    title: "Project Lead Team Selection",
    status: "Live",
    startDate: "2023-08-05",
    endDate: "2023-08-20",
    totalVoters: 35,
    votedCount: 28,
    participation: 80,
  },
  {
    id: 5,
    title: "Budget Approval 2023",
    status: "Inactive",
    startDate: "2023-06-01",
    endDate: "2023-06-15",
    totalVoters: 75,
    votedCount: 65,
    participation: 87,
  },
];

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

const ActionButton = styled(Button)(({ theme }) => ({
  textTransform: "none",
  borderRadius: "8px",
  fontWeight: 600,
  boxShadow: "none",
  "&:hover": {
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
  },
}));

const MyElections = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { elections, loading: reduxLoading } = useSelector(
    (state) => state.elections
  );

  const [selected, setSelected] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
  const [currentElection, setCurrentElection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch elections on component mount
  useEffect(() => {
    fetchElections();
  }, [dispatch]);

  const fetchElections = async () => {
    dispatch(fetchElectionsRequest());
    setLoading(true);
    setError(null);

    try {
      const response = await ballotService.getBallots();
      console.log("API response:", response);

      let electionsData = [];

      if (response.data && response.data.data) {
        // Process data from API
        electionsData = response.data.data.map((ballot) => {
          // Ensure consistent property naming
          return {
            id: ballot.id,
            title: ballot.title,
            status: determineStatus(ballot),
            startDate: ballot.startDate || ballot.start_date,
            endDate: ballot.endDate || ballot.end_date,
            totalVoters: ballot.totalVoters || ballot.total_voters || 0,
            votedCount: ballot.ballotsReceived || ballot.ballots_received || 0,
            participation: calculateParticipation(
              ballot.ballotsReceived || ballot.ballots_received || 0,
              ballot.totalVoters || ballot.total_voters || 1
            ),
          };
        });
      }

      // Check for ballots in localStorage as a fallback/supplement
      try {
        const localBallots = JSON.parse(
          localStorage.getItem("userBallots") || "[]"
        );
        console.log("Found", localBallots.length, "ballots in localStorage");

        if (localBallots.length > 0) {
          // Convert localStorage ballots to the same format
          const localElections = localBallots.map((ballot) => ({
            id: ballot.id,
            title: ballot.title,
            status: determineStatus(ballot),
            startDate: ballot.startDate || ballot.start_date,
            endDate: ballot.endDate || ballot.end_date,
            totalVoters: ballot.totalVoters || ballot.total_voters || 0,
            votedCount: ballot.ballotsReceived || ballot.ballots_received || 0,
            participation: calculateParticipation(
              ballot.ballotsReceived || ballot.ballots_received || 0,
              ballot.totalVoters || ballot.total_voters || 1
            ),
          }));

          // Merge API and localStorage ballots, remove duplicates by ID
          const allElectionsMap = new Map();

          // Add API elections first
          electionsData.forEach((election) => {
            allElectionsMap.set(election.id, election);
          });

          // Add localStorage elections (will overwrite API ones with same ID)
          localElections.forEach((election) => {
            // Only add if not already in the API results
            if (!allElectionsMap.has(election.id)) {
              allElectionsMap.set(election.id, election);
            }
          });

          // Convert Map back to array
          electionsData = Array.from(allElectionsMap.values());
        }
      } catch (localError) {
        console.error("Error reading from localStorage:", localError);
      }

      console.log("Final elections data:", electionsData);
      dispatch(fetchElectionsSuccess(electionsData));
    } catch (error) {
      console.error("Error fetching elections:", error);
      dispatch(fetchElectionsFailure(error.message));
      setError("Failed to load elections. Please try again.");

      // Fallback to localStorage only
      try {
        const localBallots = JSON.parse(
          localStorage.getItem("userBallots") || "[]"
        );
        if (localBallots.length > 0) {
          const localElections = localBallots.map((ballot) => ({
            id: ballot.id,
            title: ballot.title,
            status: determineStatus(ballot),
            startDate: ballot.startDate || ballot.start_date,
            endDate: ballot.endDate || ballot.end_date,
            totalVoters: ballot.totalVoters || ballot.total_voters || 0,
            votedCount: ballot.ballotsReceived || ballot.ballots_received || 0,
            participation: calculateParticipation(
              ballot.ballotsReceived || ballot.ballots_received || 0,
              ballot.totalVoters || ballot.total_voters || 1
            ),
          }));
          dispatch(fetchElectionsSuccess(localElections));
          setError(
            "Using locally saved elections (could not connect to server)"
          );
        }
      } catch (localError) {
        console.error("Error reading from localStorage fallback:", localError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine status
  const determineStatus = (ballot) => {
    try {
      const now = new Date();
      const startDate = new Date(ballot.startDate || ballot.start_date);
      const endDate = new Date(ballot.endDate || ballot.end_date);

      // Apply the exact logic specified:
      // - if election start date hasn't been reached, ballot status is "Registration"
      if (now < startDate) return "Registration";

      // - if election start has been reached but end date still hasn't been passed, ballot status is "Live"
      if (now >= startDate && now <= endDate) return "Live";

      // - if election end date has been passed, then ballot status is "Inactive"
      if (now > endDate) return "Inactive";

      return "Registration"; // Default
    } catch (e) {
      return "Registration"; // Fallback
    }
  };

  // Helper function to calculate participation percentage
  const calculateParticipation = (votes, total) => {
    if (!total) return 0;
    return Math.round((votes / total) * 100);
  };

  // Helper function to get status for display (wrapper around determineStatus)
  const getStatus = (election) => {
    return determineStatus(election);
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const newSelected = elections.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleSelect = (_, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }

    setSelected(newSelected);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  const handleActionMenuOpen = (event, election) => {
    setActionMenuAnchorEl(event.currentTarget);
    setCurrentElection(election);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchorEl(null);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleCreateElection = () => {
    navigate("/ballot-builder");
  };

  const handleViewDashboard = (id) => {
    navigate(`/election/${id}/dashboard`);
  };

  const handleViewVoters = (id) => {
    navigate(`/election/${id}/voters`);
  };

  const handleViewDetails = (id) => {
    navigate(`/election/${id}/details`);
  };

  // Filter elections based on search term
  const filteredElections = elections.filter((election) =>
    election.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add a visual indicator for localStorage-only ballots
  const renderBallotRow = (election) => {
    const isLocalOnly = election._localOnly === true;

    // Calculate time remaining or format time as needed
    const timeInfo = formatTimeInfo(election);

    // Calculate participation rate
    const participationRate =
      election.totalVoters > 0
        ? (election.ballotsReceived / election.totalVoters) * 100
        : 0;

    return (
      <TableRow
        key={election.id}
        hover
        onClick={() => handleRowClick(election.id)}
        sx={{
          cursor: "pointer",
          backgroundColor: isLocalOnly ? "#fff8e6" : "inherit",
          "&:hover": {
            backgroundColor: isLocalOnly ? "#fff2d9" : "#f5f8fa",
          },
        }}
      >
        <TableCell padding="checkbox">
          <Checkbox
            checked={isSelected(election.id)}
            onChange={(event) => {
              event.stopPropagation();
              handleSelectClick(election.id);
            }}
            sx={{
              color: "#CBD5E0",
              "&.Mui-checked": {
                color: "#3182CE",
              },
            }}
          />
        </TableCell>
        <TableCell>
          <Box>
            <Typography variant="subtitle1" fontWeight={500}>
              {election.title}
              {isLocalOnly && (
                <Chip
                  label="Local Only"
                  size="small"
                  color="warning"
                  sx={{ ml: 1, fontSize: "0.7rem" }}
                />
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {election.description || "No description provided"}
              {isLocalOnly && (
                <Typography
                  variant="caption"
                  sx={{ display: "block", color: "warning.main", mt: 0.5 }}
                >
                  ⚠️ This ballot exists only on this device. API operations will
                  fail.
                </Typography>
              )}
            </Typography>
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            label={getStatus(election)}
            size="small"
            sx={{
              backgroundColor:
                getStatus(election) === "Live"
                  ? "#C6F6D5"
                  : getStatus(election) === "Registration"
                  ? "#BEE3F8"
                  : getStatus(election) === "Inactive"
                  ? "#E2E8F0"
                  : "#FED7D7",
              color:
                getStatus(election) === "Live"
                  ? "#22543D"
                  : getStatus(election) === "Registration"
                  ? "#2A4365"
                  : getStatus(election) === "Inactive"
                  ? "#4A5568"
                  : "#822727",
            }}
          />
        </TableCell>
        <TableCell>
          <Box>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="body2">
                {election.ballotsReceived || 0} / {election.totalVoters || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {participationRate.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={participationRate}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: "#EDF2F7",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 3,
                  backgroundColor: "#3182CE",
                },
              }}
            />
          </Box>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{timeInfo}</Typography>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <MainLayout>
      <Box>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h4" fontWeight={700}>
            My Elections
          </Typography>

          <ActionButton
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={handleCreateElection}
            sx={{
              background: "linear-gradient(45deg, #4478EB 30%, #6FA0FF 90%)",
              color: "white",
            }}
          >
            Create Election
          </ActionButton>
        </Box>

        <Box mb={3}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search elections..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              sx: { borderRadius: 2, backgroundColor: "white" },
            }}
          />
        </Box>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ width: "100%", mb: 3 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && elections.length === 0 && (
          <Paper sx={{ p: 4, textAlign: "center", my: 4 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              You haven't created any elections yet
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => navigate("/ballot-builder")}
            >
              Create Your First Election
            </Button>
          </Paper>
        )}

        {!loading && !error && elections.length > 0 && (
          <Paper
            elevation={0}
            sx={{ width: "100%", overflow: "hidden", borderRadius: 2 }}
          >
            <TableContainer>
              <Table sx={{ minWidth: 750 }}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={
                          selected.length > 0 &&
                          selected.length < elections.length
                        }
                        checked={
                          elections.length > 0 &&
                          selected.length === elections.length
                        }
                        onChange={handleSelectAll}
                        inputProps={{ "aria-label": "select all elections" }}
                      />
                    </TableCell>
                    <TableCell>Election Title</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date Range</TableCell>
                    <TableCell>Voters</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredElections.map((election) => {
                    const isItemSelected = isSelected(election.id);

                    return (
                      <TableRow
                        hover
                        role="checkbox"
                        aria-checked={isItemSelected}
                        tabIndex={-1}
                        key={election.id}
                        selected={isItemSelected}
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isItemSelected}
                            onClick={(event) =>
                              handleSelect(event, election.id)
                            }
                            inputProps={{
                              "aria-labelledby": `enhanced-table-checkbox-${election.id}`,
                            }}
                          />
                        </TableCell>
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
                          <Box display="flex" alignItems="center">
                            <PeopleAltIcon
                              fontSize="small"
                              sx={{ mr: 1, color: "text.secondary" }}
                            />
                            <Typography variant="body2">
                              {election.votedCount}/{election.totalVoters} (
                              {election.participation}%)
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" justifyContent="center">
                            <Tooltip title="View Dashboard">
                              <IconButton
                                size="small"
                                onClick={() => handleViewDashboard(election.id)}
                                sx={{ color: "#4478EB" }}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Manage Voters">
                              <IconButton
                                size="small"
                                onClick={() => handleViewVoters(election.id)}
                                sx={{ color: "#33374D" }}
                              >
                                <PeopleAltIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <IconButton
                              size="small"
                              aria-label="more"
                              aria-controls="long-menu"
                              aria-haspopup="true"
                              onClick={(e) => handleActionMenuOpen(e, election)}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Menu
              id="action-menu"
              anchorEl={actionMenuAnchorEl}
              keepMounted
              open={Boolean(actionMenuAnchorEl)}
              onClose={handleActionMenuClose}
            >
              <MenuItem
                onClick={() => {
                  handleViewDetails(currentElection?.id);
                  handleActionMenuClose();
                }}
              >
                <ListItemIcon>
                  <VisibilityIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="View Results" />
              </MenuItem>
              <MenuItem onClick={handleActionMenuClose}>
                <ListItemIcon>
                  <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Edit Election" />
              </MenuItem>
              <MenuItem onClick={handleActionMenuClose}>
                <ListItemIcon>
                  <ContentCopyIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Duplicate" />
              </MenuItem>
              <MenuItem onClick={handleActionMenuClose}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText primary="Delete" sx={{ color: "error.main" }} />
              </MenuItem>
            </Menu>
          </Paper>
        )}
      </Box>
    </MainLayout>
  );
};

export default MyElections;
