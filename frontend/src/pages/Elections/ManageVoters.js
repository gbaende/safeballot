import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
  InputBase,
  InputAdornment,
  TableSortLabel,
  Menu,
  MenuItem,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

const ManageVoters = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [currentVoter, setCurrentVoter] = useState(null);

  // Mock election data
  const election = {
    id: parseInt(id),
    title: "2024 Presidential Election - General Ballot",
  };

  // Mock voters data
  const voters = [
    {
      id: 1,
      name: "Chloe Ashford",
      status: "Voted",
      email: "Chloe.Ashford@example.com",
    },
    {
      id: 2,
      name: "Charlotte Beckett",
      status: "Registered",
      email: "Charlotte.Beckett@example.com",
    },
    {
      id: 3,
      name: "Sophia Caldwell",
      status: "Registered",
      email: "Sophia.Caldwell@example.com",
    },
    {
      id: 4,
      name: "Owen Callahan",
      status: "Voted",
      email: "Owen.Callahan@example.com",
    },
    {
      id: 5,
      name: "Caleb Montgomery",
      status: "Registered",
      email: "Caleb.Montgomery@example.com",
    },
    {
      id: 6,
      name: "Chloe Ashford",
      status: "Voted",
      email: "Chloe.Ashford@example.com",
    },
    {
      id: 7,
      name: "Charlotte Beckett",
      status: "Registered",
      email: "Charlotte.Beckett@example.com",
    },
    {
      id: 8,
      name: "Sophia Caldwell",
      status: "Registered",
      email: "Sophia.Caldwell@example.com",
    },
    {
      id: 9,
      name: "Owen Callahan",
      status: "Voted",
      email: "Owen.Callahan@example.com",
    },
    {
      id: 10,
      name: "Caleb Montgomery",
      status: "Registered",
      email: "Caleb.Montgomery@example.com",
    },
  ];

  const filteredVoters = voters.filter((voter) =>
    voter.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      setSelected(filteredVoters.map((voter) => voter.id));
      return;
    }
    setSelected([]);
  };

  const handleSelectClick = (event, id) => {
    event.stopPropagation();
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

  const handleActionMenuOpen = (event, voter) => {
    event.stopPropagation();
    setCurrentVoter(voter);
    setActionMenuAnchor(event.currentTarget);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setCurrentVoter(null);
  };

  return (
    <Box sx={{ pt: 4 }}>
      {/* Header with Back Button and Title */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton component={Link} to={`/elections/${id}`} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 500 }}>
            Manage Voters
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            background: "linear-gradient(to right, #080E1D, #263C75)",
            "&:hover": {
              background: "linear-gradient(to right, #050912, #1d2e59)",
            },
            borderRadius: "4px",
          }}
        >
          Create Ballot
        </Button>
      </Box>

      {/* Election Title */}
      <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
        {election.title} Voters
      </Typography>

      {/* Action Buttons Row */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
        }}
      >
        <Button
          startIcon={<FilterListIcon />}
          endIcon={<KeyboardArrowDownIcon />}
          variant="outlined"
          sx={{
            borderColor: "#E2E8F0",
            color: "#4A5568",
            textTransform: "none",
            boxShadow: "none",
            borderRadius: "4px",
            "&:hover": {
              borderColor: "#CBD5E0",
              backgroundColor: "#F7FAFC",
            },
          }}
        >
          More filters
        </Button>

        <Button
          startIcon={<MarkEmailReadIcon />}
          variant="outlined"
          sx={{
            borderColor: "#E2E8F0",
            color: "#4A5568",
            textTransform: "none",
            boxShadow: "none",
            borderRadius: "4px",
            "&:hover": {
              borderColor: "#CBD5E0",
              backgroundColor: "#F7FAFC",
            },
          }}
        >
          Resend Voter ID
        </Button>

        <Button
          startIcon={<VpnKeyIcon />}
          variant="outlined"
          sx={{
            borderColor: "#E2E8F0",
            color: "#4A5568",
            textTransform: "none",
            boxShadow: "none",
            borderRadius: "4px",
            "&:hover": {
              borderColor: "#CBD5E0",
              backgroundColor: "#F7FAFC",
            },
          }}
        >
          Generate Digital Key
        </Button>

        <Button
          startIcon={<DeleteOutlineIcon />}
          variant="outlined"
          sx={{
            borderColor: "#E2E8F0",
            color: "#4A5568",
            textTransform: "none",
            boxShadow: "none",
            borderRadius: "4px",
            "&:hover": {
              borderColor: "#CBD5E0",
              backgroundColor: "#F7FAFC",
            },
          }}
        >
          Remove Preregistration
        </Button>

        <Box sx={{ flexGrow: 1 }} />

        <Paper
          sx={{
            display: "flex",
            alignItems: "center",
            height: 40,
            px: 2,
            borderRadius: "4px",
            border: "1px solid #E2E8F0",
            boxShadow: "none",
          }}
        >
          <InputBase
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startAdornment={
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#A0AEC0", mr: 1 }} />
              </InputAdornment>
            }
            sx={{ ml: 1, flex: 1 }}
          />
        </Paper>
      </Box>

      {/* Voters Table */}
      <TableContainer
        component={Paper}
        sx={{ boxShadow: "none", border: "1px solid #E2E8F0" }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#F7FAFC" }}>
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
                  sx={{
                    color: "#CBD5E0",
                    "&.Mui-checked": {
                      color: "#3182CE",
                    },
                  }}
                />
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active
                  direction="desc"
                  sx={{ fontWeight: 500, color: "#4A5568" }}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Email</TableCell>
              <TableCell align="center">Actions</TableCell>
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
                  sx={{ height: "60px" }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isItemSelected}
                      onClick={(event) => handleSelectClick(event, voter.id)}
                      sx={{
                        color: "#CBD5E0",
                        "&.Mui-checked": {
                          color: "#3182CE",
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{voter.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={voter.status}
                      size="small"
                      sx={{
                        bgcolor:
                          voter.status === "Voted" ? "#EAFDEE" : "#EDF2F7",
                        color: voter.status === "Voted" ? "#2F855A" : "#4A5568",
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell>{voter.email}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(event) => handleActionMenuOpen(event, voter)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
        PaperProps={{
          sx: {
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
            mt: 1,
          },
        }}
      >
        <MenuItem onClick={handleActionMenuClose}>
          <MarkEmailReadIcon fontSize="small" sx={{ mr: 1 }} />
          Resend Voter ID
        </MenuItem>
        <MenuItem onClick={handleActionMenuClose}>
          <VpnKeyIcon fontSize="small" sx={{ mr: 1 }} />
          Generate Digital Key
        </MenuItem>
        <MenuItem onClick={handleActionMenuClose}>
          <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} />
          Remove Registration
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ManageVoters;
