import React, { useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Checkbox,
  IconButton,
  TextField,
  InputAdornment,
  Toolbar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Breadcrumbs,
  Link,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EmailIcon from "@mui/icons-material/Email";
import DeleteIcon from "@mui/icons-material/Delete";
import FilterListIcon from "@mui/icons-material/FilterList";
import HomeIcon from "@mui/icons-material/Home";
import BallotIcon from "@mui/icons-material/Ballot";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const ManageVoters = () => {
  const { id } = useParams();
  const [selected, setSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openInviteDialog, setOpenInviteDialog] = useState(false);
  const [newVoter, setNewVoter] = useState({
    name: "",
    email: "",
    organization: "",
  });

  // Mock data for the election
  const election = {
    id: parseInt(id),
    title: "Board Member Election 2023",
  };

  // Mock data for voters
  const allVoters = [
    {
      id: 1,
      name: "John Smith",
      email: "john.smith@example.com",
      organization: "Marketing",
      status: "Voted",
      voteDate: "2023-07-05",
    },
    {
      id: 2,
      name: "Sarah Johnson",
      email: "sarah.johnson@example.com",
      organization: "Finance",
      status: "Voted",
      voteDate: "2023-07-02",
    },
    {
      id: 3,
      name: "Michael Brown",
      email: "michael.brown@example.com",
      organization: "IT",
      status: "Voted",
      voteDate: "2023-07-03",
    },
    {
      id: 4,
      name: "Emily Davis",
      email: "emily.davis@example.com",
      organization: "HR",
      status: "Pending",
      voteDate: null,
    },
    {
      id: 5,
      name: "David Wilson",
      email: "david.wilson@example.com",
      organization: "Operations",
      status: "Pending",
      voteDate: null,
    },
    {
      id: 6,
      name: "Jennifer Lee",
      email: "jennifer.lee@example.com",
      organization: "Legal",
      status: "Not Sent",
      voteDate: null,
    },
    {
      id: 7,
      name: "Robert Garcia",
      email: "robert.garcia@example.com",
      organization: "Sales",
      status: "Voted",
      voteDate: "2023-07-07",
    },
    {
      id: 8,
      name: "Maria Rodriguez",
      email: "maria.rodriguez@example.com",
      organization: "Customer Service",
      status: "Pending",
      voteDate: null,
    },
    {
      id: 9,
      name: "James Anderson",
      email: "james.anderson@example.com",
      organization: "R&D",
      status: "Not Sent",
      voteDate: null,
    },
    {
      id: 10,
      name: "Patricia Martin",
      email: "patricia.martin@example.com",
      organization: "Executive",
      status: "Voted",
      voteDate: "2023-07-01",
    },
  ];

  // Filter and search voters
  const filteredVoters = allVoters.filter((voter) => {
    const matchesSearch =
      voter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voter.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voter.organization.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      statusFilter === "all" ||
      voter.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      setSelected(filteredVoters.map((voter) => voter.id));
      return;
    }
    setSelected([]);
  };

  const handleSelectClick = (id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, id];
    } else {
      newSelected = selected.filter((item) => item !== id);
    }

    setSelected(newSelected);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  const handleAddVoter = () => {
    // In a real app, this would add the voter to the database
    setOpenAddDialog(false);
    setNewVoter({
      name: "",
      email: "",
      organization: "",
    });
  };

  const handleSendInvitations = () => {
    // In a real app, this would send invitations to the selected voters
    setOpenInviteDialog(false);
    setSelected([]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Voted":
        return "success";
      case "Pending":
        return "warning";
      case "Not Sent":
        return "default";
      default:
        return "default";
    }
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
          Manage Voters
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
        <Typography variant="h4">Manage Voters</Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          component={RouterLink}
          to={`/elections/${id}`}
        >
          Back to Dashboard
        </Button>
      </Box>

      <Paper sx={{ width: "100%", mb: 2 }}>
        <Toolbar
          sx={{
            pl: { sm: 2 },
            pr: { xs: 1, sm: 1 },
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              placeholder="Search voters..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: "300px" }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                id="status-filter"
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="voted">Voted</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="not sent">Not Sent</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setOpenAddDialog(true)}
            >
              Add Voter
            </Button>
            <Button startIcon={<FilterListIcon />}>More Filters</Button>
          </Box>
        </Toolbar>

        <TableContainer>
          <Table>
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
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Organization</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Vote Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredVoters.map((voter) => {
                const isItemSelected = isSelected(voter.id);

                return (
                  <TableRow
                    hover
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={voter.id}
                    selected={isItemSelected}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isItemSelected}
                        onClick={() => handleSelectClick(voter.id)}
                      />
                    </TableCell>
                    <TableCell>{voter.name}</TableCell>
                    <TableCell>{voter.email}</TableCell>
                    <TableCell>{voter.organization}</TableCell>
                    <TableCell>
                      <Chip
                        label={voter.status}
                        color={getStatusColor(voter.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{voter.voteDate || "-"}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                        {voter.status !== "Voted" && (
                          <Tooltip title="Send Invitation">
                            <IconButton>
                              <EmailIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {selected.length > 0 && (
        <Paper
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="body1">
            {selected.length} voter{selected.length > 1 ? "s" : ""} selected
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<EmailIcon />}
              onClick={() => setOpenInviteDialog(true)}
            >
              Send Invitations
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />}>
              Delete Selected
            </Button>
          </Box>
        </Paper>
      )}

      {/* Add Voter Dialog */}
      <Dialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Voter</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Full Name"
              type="text"
              fullWidth
              variant="outlined"
              value={newVoter.name}
              onChange={(e) =>
                setNewVoter({ ...newVoter, name: e.target.value })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              id="email"
              label="Email Address"
              type="email"
              fullWidth
              variant="outlined"
              value={newVoter.email}
              onChange={(e) =>
                setNewVoter({ ...newVoter, email: e.target.value })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              id="organization"
              label="Organization/Department"
              type="text"
              fullWidth
              variant="outlined"
              value={newVoter.organization}
              onChange={(e) =>
                setNewVoter({ ...newVoter, organization: e.target.value })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddVoter} variant="contained">
            Add Voter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Invitations Dialog */}
      <Dialog
        open={openInviteDialog}
        onClose={() => setOpenInviteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Send Invitations</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ pt: 1 }}>
            Are you sure you want to send invitations to {selected.length} voter
            {selected.length > 1 ? "s" : ""}?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Invitations will be sent to each selected voter with a unique voting
            link. They will receive an email with instructions on how to cast
            their vote.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInviteDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSendInvitations}
            variant="contained"
            startIcon={<EmailIcon />}
          >
            Send Invitations
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageVoters;
