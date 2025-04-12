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
  IconButton,
  Toolbar,
  TextField,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";

const MyElections = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data for the elections
  const elections = [
    {
      id: 1,
      title: "Board Member Election 2023",
      status: "Active",
      startDate: "2023-07-01",
      endDate: "2023-07-15",
      voters: 120,
      participation: 65,
    },
    {
      id: 2,
      title: "Annual General Meeting",
      status: "Active",
      startDate: "2023-06-15",
      endDate: "2023-06-30",
      voters: 85,
      participation: 42,
    },
    {
      id: 3,
      title: "Budget Approval",
      status: "Completed",
      startDate: "2023-05-01",
      endDate: "2023-05-10",
      voters: 40,
      participation: 90,
    },
    {
      id: 4,
      title: "Constitutional Amendment",
      status: "Draft",
      startDate: null,
      endDate: null,
      voters: 0,
      participation: 0,
    },
    {
      id: 5,
      title: "Executive Director Selection",
      status: "Scheduled",
      startDate: "2023-08-01",
      endDate: "2023-08-15",
      voters: 35,
      participation: 0,
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

  const handleViewElection = (id) => {
    navigate(`/elections/${id}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "success";
      case "Completed":
        return "secondary";
      case "Draft":
        return "default";
      case "Scheduled":
        return "primary";
      default:
        return "default";
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4 }}>
        My Elections
      </Typography>

      <Paper sx={{ width: "100%", mb: 2 }}>
        <Toolbar
          sx={{
            pl: { sm: 2 },
            pr: { xs: 1, sm: 1 },
            justifyContent: "space-between",
          }}
        >
          <TextField
            placeholder="Search elections..."
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

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate("/create-election")}
            >
              Create Election
            </Button>
            <Button startIcon={<FilterListIcon />}>Filter</Button>
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
                      selected.length < filteredElections.length
                    }
                    checked={
                      filteredElections.length > 0 &&
                      selected.length === filteredElections.length
                    }
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
                <TableCell>Election Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Voters</TableCell>
                <TableCell>Participation</TableCell>
                <TableCell align="right">Actions</TableCell>
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
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isItemSelected}
                        onClick={() => handleSelectClick(election.id)}
                      />
                    </TableCell>
                    <TableCell component="th" scope="row">
                      {election.title}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={election.status}
                        color={getStatusColor(election.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{election.startDate || "-"}</TableCell>
                    <TableCell>{election.endDate || "-"}</TableCell>
                    <TableCell>{election.voters}</TableCell>
                    <TableCell>
                      {election.participation > 0
                        ? `${election.participation}%`
                        : "-"}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                        <Tooltip title="View">
                          <IconButton
                            onClick={() => handleViewElection(election.id)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
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
            {selected.length} election{selected.length > 1 ? "s" : ""} selected
          </Typography>
          <Button variant="outlined" color="error" startIcon={<DeleteIcon />}>
            Delete Selected
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default MyElections;
