import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
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
  TablePagination,
  Checkbox,
  IconButton,
  Button,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  InputAdornment,
  Tooltip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Divider,
  Breadcrumbs,
  Link,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Email as EmailIcon,
  Key as KeyIcon,
  Delete as DeleteIcon,
  VpnKey as VpnKeyIcon,
  Download as DownloadIcon,
  ArrowBack as ArrowBackIcon,
  NavigateNext as NavigateNextIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Send as SendIcon,
} from "@mui/icons-material";
import MainLayout from "../components/Layout/MainLayout";
import {
  getElectionRequest,
  getElectionSuccess,
  getVotersRequest,
  getVotersSuccess,
} from "../store/electionSlice";
import { sendPreRegistrationInvitation } from "../services/api";

// Mock data for voters
const mockVoters = [
  {
    id: 1,
    name: "John Smith",
    email: "john.smith@example.com",
    status: "Voted",
    votedAt: "2023-08-05 14:30",
    viewedAt: "2023-08-05 14:15",
  },
  {
    id: 2,
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    status: "Not Voted",
    viewedAt: "2023-08-03 10:22",
    votedAt: null,
  },
  {
    id: 3,
    name: "Robert Williams",
    email: "robert.williams@example.com",
    status: "Not Viewed",
    viewedAt: null,
    votedAt: null,
  },
  {
    id: 4,
    name: "Jennifer Davis",
    email: "jennifer.davis@example.com",
    status: "Voted",
    votedAt: "2023-08-02 09:45",
    viewedAt: "2023-08-02 09:30",
  },
  {
    id: 5,
    name: "Michael Brown",
    email: "michael.brown@example.com",
    status: "Not Voted",
    viewedAt: "2023-08-04 16:10",
    votedAt: null,
  },
  {
    id: 6,
    name: "David Martinez",
    email: "david.martinez@example.com",
    status: "Voted",
    votedAt: "2023-08-01 12:15",
    viewedAt: "2023-08-01 11:50",
  },
  {
    id: 7,
    name: "Lisa Anderson",
    email: "lisa.anderson@example.com",
    status: "Not Viewed",
    viewedAt: null,
    votedAt: null,
  },
  {
    id: 8,
    name: "James Taylor",
    email: "james.taylor@example.com",
    status: "Voted",
    votedAt: "2023-08-03 18:20",
    viewedAt: "2023-08-03 17:55",
  },
  {
    id: 9,
    name: "Emily Thompson",
    email: "emily.thompson@example.com",
    status: "Not Voted",
    viewedAt: "2023-08-02 14:25",
    votedAt: null,
  },
  {
    id: 10,
    name: "Daniel Wilson",
    email: "daniel.wilson@example.com",
    status: "Voted",
    votedAt: "2023-08-04 09:10",
    viewedAt: "2023-08-04 08:50",
  },
];

// Mock election data
const mockElection = {
  id: 1,
  title: "Board of Directors Election 2023",
  status: "Live",
  totalVoters: 10,
  votedCount: 5,
};

const StatusChip = styled(Chip)(({ theme, status }) => {
  let chipColor;

  switch (status) {
    case "Voted":
      chipColor = "#4CAF50";
      break;
    case "Not Voted":
      chipColor = "#FF9800";
      break;
    case "Not Viewed":
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

const ManageVoters = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentElection, voters, loading } = useSelector(
    (state) => state.elections
  );

  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
  const [currentVoter, setCurrentVoter] = useState(null);
  const [addVoterDialogOpen, setAddVoterDialogOpen] = useState(false);
  const [newVoter, setNewVoter] = useState({ name: "", email: "" });

  // New state variables for email functionality
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [voterEmail, setVoterEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Fetch election and voters data on component mount
  useEffect(() => {
    dispatch(getElectionRequest());
    dispatch(getVotersRequest());

    // Simulating API calls with mock data
    setTimeout(() => {
      dispatch(getElectionSuccess(mockElection));
      dispatch(getVotersSuccess(mockVoters));
    }, 500);

    // In a real application, you would call your API here
    // api.getElectionById(id)
    //   .then(data => dispatch(getElectionSuccess(data)))
    //   .catch(error => dispatch(getElectionFailure(error.message)));
    // api.getVotersByElectionId(id)
    //   .then(data => dispatch(getVotersSuccess(data)))
    //   .catch(error => dispatch(getVotersFailure(error.message)));
  }, [dispatch, id]);

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const newSelected = filteredVoters.map((n) => n.id);
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

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handleActionMenuOpen = (event, voter) => {
    setActionMenuAnchorEl(event.currentTarget);
    setCurrentVoter(voter);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchorEl(null);
  };

  const handleAddVoterOpen = () => {
    setEmailDialogOpen(true);
  };

  const handleAddVoterClose = () => {
    setEmailDialogOpen(false);
    setVoterEmail("");
  };

  const handleEmailChange = (event) => {
    setVoterEmail(event.target.value);
  };

  const handleSendInvitation = async () => {
    if (!voterEmail || !voterEmail.includes("@")) {
      setSnackbar({
        open: true,
        message: "Please enter a valid email address",
        severity: "error",
      });
      return;
    }

    setEmailLoading(true);
    try {
      const result = await sendPreRegistrationInvitation(id, voterEmail);

      setSnackbar({
        open: true,
        message: `Pre-registration invitation sent successfully to ${voterEmail}`,
        severity: "success",
      });

      setEmailDialogOpen(false);
      setVoterEmail("");

      console.log("Pre-registration invitation sent:", result);
    } catch (error) {
      console.error("Failed to send pre-registration invitation:", error);

      let errorMessage = "Failed to send invitation. Please try again.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleResendVoterId = (voterId) => {
    // In a real application, you would call your API here
    // api.resendVoterId(id, voterId)
    //   .then(data => console.log('Voter ID resent'))
    //   .catch(error => console.error(error));

    console.log("Resending Voter ID for voter:", voterId);
    handleActionMenuClose();
  };

  const handleGenerateDigitalKey = (voterId) => {
    // In a real application, you would call your API here
    // api.generateDigitalKey(id, voterId)
    //   .then(data => console.log('Digital key generated'))
    //   .catch(error => console.error(error));

    console.log("Generating digital key for voter:", voterId);
    handleActionMenuClose();
  };

  const handleRemoveVoter = (voterId) => {
    // In a real application, you would call your API here
    // api.removeVoterFromElection(id, voterId)
    //   .then(data => console.log('Voter removed'))
    //   .catch(error => console.error(error));

    console.log("Removing voter:", voterId);
    handleActionMenuClose();
  };

  const handleBackToDashboard = () => {
    navigate(`/election/${id}/dashboard`);
  };

  // Filter voters based on search term and status filter
  const filteredVoters = voters.filter((voter) => {
    const matchesSearch =
      voter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voter.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "" || voter.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Paginate the filtered voters
  const paginatedVoters = filteredVoters.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Calculate statistics
  const votedCount = voters.filter((voter) => voter.status === "Voted").length;
  const notVotedCount = voters.filter(
    (voter) => voter.status === "Not Voted"
  ).length;
  const notViewedCount = voters.filter(
    (voter) => voter.status === "Not Viewed"
  ).length;

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
          <Typography variant="h5">Loading voter data...</Typography>
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
          <Typography color="text.primary">Manage Voters</Typography>
        </Breadcrumbs>

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
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
            </Box>
            <Typography variant="h4" fontWeight={700} mb={1}>
              Manage Voters
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {currentElection.title}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <CheckCircleIcon sx={{ color: "#4CAF50", mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  Voted
                </Typography>
              </Box>
              <Typography variant="h3" fontWeight={700} mb={1}>
                {votedCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round((votedCount / voters.length) * 100)}% of total
                voters
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <ScheduleIcon sx={{ color: "#FF9800", mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  Not Voted
                </Typography>
              </Box>
              <Typography variant="h3" fontWeight={700} mb={1}>
                {notVotedCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round((notVotedCount / voters.length) * 100)}% of total
                voters
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <CancelIcon sx={{ color: "#9E9E9E", mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  Not Viewed
                </Typography>
              </Box>
              <Typography variant="h3" fontWeight={700} mb={1}>
                {notViewedCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round((notViewedCount / voters.length) * 100)}% of total
                voters
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Box mb={3}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search voters..."
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
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl
                fullWidth
                variant="outlined"
                sx={{ backgroundColor: "white", borderRadius: 2 }}
              >
                <InputLabel id="status-filter-label">
                  Filter by Status
                </InputLabel>
                <Select
                  labelId="status-filter-label"
                  id="status-filter"
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  label="Filter by Status"
                  input={<OutlinedInput label="Filter by Status" />}
                >
                  <MenuItem value="">
                    <em>All Statuses</em>
                  </MenuItem>
                  <MenuItem value="Voted">Voted</MenuItem>
                  <MenuItem value="Not Voted">Not Voted</MenuItem>
                  <MenuItem value="Not Viewed">Not Viewed</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <Box display="flex" gap={2} height="100%">
                <ActionButton
                  fullWidth
                  variant="contained"
                  color="secondary"
                  startIcon={<AddIcon />}
                  onClick={handleAddVoterOpen}
                  sx={{
                    background:
                      "linear-gradient(45deg, #080E1D 30%, #263C75 90%)",
                    color: "white",
                    height: "100%",
                    "&:hover": {
                      background:
                        "linear-gradient(45deg, #060A15 30%, #1E2F5D 90%)",
                    },
                  }}
                >
                  Add Voters
                </ActionButton>

                <ActionButton
                  variant="outlined"
                  color="primary"
                  onClick={() => console.log("Exporting voters")}
                  startIcon={<DownloadIcon />}
                  sx={{ height: "100%" }}
                >
                  Export
                </ActionButton>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Paper
          elevation={0}
          sx={{ width: "100%", overflow: "hidden", borderRadius: 2, mb: 3 }}
        >
          <TableContainer>
            <Table sx={{ minWidth: 750 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={
                        selected.length > 0 &&
                        selected.length < filteredVoters.length
                      }
                      checked={
                        filteredVoters.length > 0 &&
                        selected.length === filteredVoters.length
                      }
                      onChange={handleSelectAll}
                      inputProps={{ "aria-label": "select all voters" }}
                    />
                  </TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Viewed</TableCell>
                  <TableCell>Voted At</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedVoters.map((voter) => {
                  const isItemSelected = isSelected(voter.id);

                  return (
                    <TableRow
                      hover
                      role="checkbox"
                      aria-checked={isItemSelected}
                      tabIndex={-1}
                      key={voter.id}
                      selected={isItemSelected}
                      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isItemSelected}
                          onClick={(event) => handleSelect(event, voter.id)}
                          inputProps={{
                            "aria-labelledby": `enhanced-table-checkbox-${voter.id}`,
                          }}
                        />
                      </TableCell>
                      <TableCell component="th" scope="row">
                        <Box display="flex" alignItems="center">
                          <PersonIcon sx={{ color: "#9E9E9E", mr: 1 }} />
                          <Typography variant="body1" fontWeight={500}>
                            {voter.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{voter.email}</TableCell>
                      <TableCell>
                        <StatusChip
                          label={voter.status}
                          status={voter.status}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {voter.viewedAt || "Not viewed yet"}
                      </TableCell>
                      <TableCell>{voter.votedAt || "Not voted yet"}</TableCell>
                      <TableCell align="center">
                        <Box display="flex" justifyContent="center">
                          <Tooltip title="Resend Voter ID">
                            <IconButton
                              size="small"
                              onClick={() => handleResendVoterId(voter.id)}
                              sx={{ color: "#4478EB" }}
                            >
                              <EmailIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Generate Digital Key">
                            <IconButton
                              size="small"
                              onClick={() => handleGenerateDigitalKey(voter.id)}
                              sx={{ color: "#33374D" }}
                            >
                              <VpnKeyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <IconButton
                            size="small"
                            aria-label="more"
                            aria-controls="voter-menu"
                            aria-haspopup="true"
                            onClick={(e) => handleActionMenuOpen(e, voter)}
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

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredVoters.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />

          <Menu
            id="voter-menu"
            anchorEl={actionMenuAnchorEl}
            keepMounted
            open={Boolean(actionMenuAnchorEl)}
            onClose={handleActionMenuClose}
          >
            <MenuItem
              onClick={() => {
                handleResendVoterId(currentVoter?.id);
                handleActionMenuClose();
              }}
            >
              <ListItemIcon>
                <EmailIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Resend Voter ID" />
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleGenerateDigitalKey(currentVoter?.id);
                handleActionMenuClose();
              }}
            >
              <ListItemIcon>
                <VpnKeyIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Generate Digital Key" />
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                handleRemoveVoter(currentVoter?.id);
                handleActionMenuClose();
              }}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Remove Voter"
                sx={{ color: "error.main" }}
              />
            </MenuItem>
          </Menu>
        </Paper>

        {selected.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body1">
              {selected.length} {selected.length === 1 ? "voter" : "voters"}{" "}
              selected
            </Typography>
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<EmailIcon />}
                onClick={() =>
                  console.log("Resending voter IDs to selected voters")
                }
              >
                Resend Voter IDs
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => console.log("Removing selected voters")}
              >
                Remove Selected
              </Button>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Email Dialog */}
      <Dialog
        open={emailDialogOpen}
        onClose={handleAddVoterClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", pb: 2 }}>
          <EmailIcon sx={{ mr: 2, color: "#263C75" }} />
          Send Pre-Registration Invitation
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3, color: "#374151" }}>
            Enter the email address of the voter you'd like to invite. They will
            receive a pre-registration link to join this election.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="voterEmail"
            name="voterEmail"
            label="Voter Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={voterEmail}
            onChange={handleEmailChange}
            placeholder="Enter voter's email address"
            disabled={emailLoading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={handleAddVoterClose}
            disabled={emailLoading}
            sx={{
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSendInvitation}
            disabled={!voterEmail || !voterEmail.includes("@") || emailLoading}
            startIcon={
              emailLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SendIcon />
              )
            }
            sx={{
              background: "linear-gradient(45deg, #080E1D 30%, #263C75 90%)",
              color: "white",
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "8px",
              px: 3,
              py: 1,
              "&:hover": {
                background: "linear-gradient(45deg, #060A15 30%, #1E2F5D 90%)",
              },
              "&:disabled": {
                backgroundColor: "#d1d5db",
                color: "#9ca3af",
              },
            }}
          >
            {emailLoading ? "Sending..." : "Send Invitation"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Legacy Add Voter Dialog - keeping for potential future use */}
      <Dialog
        open={addVoterDialogOpen}
        onClose={() => setAddVoterDialogOpen(false)}
      >
        <DialogTitle>Add New Voter</DialogTitle>
        <DialogContent>
          <DialogContentText mb={2}>
            Enter the details of the new voter to add to this election.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            name="name"
            label="Full Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newVoter.name}
            onChange={(event) =>
              setNewVoter({ ...newVoter, name: event.target.value })
            }
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="email"
            name="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={newVoter.email}
            onChange={(event) =>
              setNewVoter({ ...newVoter, email: event.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddVoterDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              // Handle adding voter
              console.log("Adding voter:", newVoter);
              setAddVoterDialogOpen(false);
              setNewVoter({ name: "", email: "" });
            }}
            disabled={!newVoter.name || !newVoter.email}
            sx={{
              background: "linear-gradient(45deg, #080E1D 30%, #263C75 90%)",
              color: "white",
              "&:hover": {
                background: "linear-gradient(45deg, #060A15 30%, #1E2F5D 90%)",
              },
              "&:disabled": {
                backgroundColor: "#d1d5db",
                color: "#9ca3af",
              },
            }}
          >
            Add Voter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{
            width: "100%",
            borderRadius: "8px",
            fontWeight: 500,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
};

export default ManageVoters;
