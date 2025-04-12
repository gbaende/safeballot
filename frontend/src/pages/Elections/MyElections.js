import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  InputBase,
  InputAdornment,
  LinearProgress,
  TableSortLabel,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

const MyElections = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data for the elections
  const elections = [
    {
      id: 1,
      title: "2024 Presidential Election - General Ballot",
      status: "Live",
      ballotsReceived: 100,
      totalVoters: 800,
      timeInfo: "3:12:16s remaining",
    },
    {
      id: 2,
      title: "Statewide Ballot Measure: Healthcare Reform Initiative",
      status: "Registration",
      ballotsReceived: 0,
      totalVoters: 500,
      timeInfo: "Election starts Dec. 12, 12:00am PST",
    },
    {
      id: 3,
      title: "City of San Francisco - Board of Supervisors Election",
      status: "Inactive",
      ballotsReceived: 240,
      totalVoters: 400,
      timeInfo: "Completed",
    },
    {
      id: 4,
      title: "Proposition 18: Renewable Energy Initiative",
      status: "Inactive",
      ballotsReceived: 60,
      totalVoters: 300,
      timeInfo: "Completed",
    },
    {
      id: 5,
      title: "Measure Z: Public Transportation Funding",
      status: "Registration",
      ballotsReceived: 0,
      totalVoters: 500,
      timeInfo: "Election starts Dec. 12, 12:00am PST",
    },
  ];

  const filteredElections = elections.filter((election) =>
    election.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      setSelected(filteredElections.map((election) => election.id));
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

  const handleRowClick = (id) => {
    navigate(`/elections/${id}`);
  };

  return (
    <Box sx={{ pt: 4 }}>
      {/* Header with Page Title and Create Button */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 500, mb: 0.5 }}>
            My Elections
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back to Safe Ballot, let's ensure every vote counts.
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
          onClick={() => navigate("/create-election")}
        >
          Create Ballot
        </Button>
      </Box>

      {/* Filters Row */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
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
            "&:hover": {
              borderColor: "#CBD5E0",
              backgroundColor: "#F7FAFC",
            },
          }}
        >
          More filters
        </Button>

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

      {/* Election Table */}
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
                    selected.length < filteredElections.length
                  }
                  checked={
                    filteredElections.length > 0 &&
                    selected.length === filteredElections.length
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
                  Title
                </TableSortLabel>
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ballots Recieved / # of Voters</TableCell>
              <TableCell>Election Time</TableCell>
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
                  sx={{ height: "72px", cursor: "pointer" }}
                  onClick={() => handleRowClick(election.id)}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isItemSelected}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      sx={{
                        color: "#CBD5E0",
                        "&.Mui-checked": {
                          color: "#3182CE",
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500, py: 3 }}>
                    {election.title}
                  </TableCell>
                  <TableCell sx={{ py: 3 }}>
                    <Chip
                      label={election.status}
                      size="small"
                      sx={{
                        bgcolor:
                          election.status === "Live"
                            ? "#EAFDEE"
                            : election.status === "Registration"
                            ? "#EDF2F7"
                            : "#EDF2F7",
                        color:
                          election.status === "Live"
                            ? "#2F855A"
                            : election.status === "Registration"
                            ? "#4A5568"
                            : "#4A5568",
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <LinearProgress
                        variant="determinate"
                        value={
                          (election.ballotsReceived / election.totalVoters) *
                          100
                        }
                        sx={{
                          flexGrow: 1,
                          mr: 2,
                          height: 8,
                          borderRadius: 4,
                          bgcolor: "#EDF2F7",
                          ".MuiLinearProgress-bar": {
                            backgroundImage:
                              "linear-gradient(to right, #00005E, #4478EB)",
                          },
                        }}
                      />
                      <Typography variant="body2">
                        {election.ballotsReceived}/{election.totalVoters}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 3 }}>{election.timeInfo}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default MyElections;
