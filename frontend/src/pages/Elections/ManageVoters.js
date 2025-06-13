import React, { useState, useEffect } from "react";
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
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Tooltip,
  Grid,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Snackbar,
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
import BugReportIcon from "@mui/icons-material/BugReport";
import RefreshIcon from "@mui/icons-material/Refresh";
import BackupIcon from "@mui/icons-material/Backup";
import EmailIcon from "@mui/icons-material/Email";
import SendIcon from "@mui/icons-material/Send";
import { ballotService } from "../../services/api";
import { sendPreRegistrationInvitation } from "../../services/api";
import { toast } from "react-hot-toast";

const ManageVoters = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [currentVoter, setCurrentVoter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voters, setVoters] = useState([]);
  const [election, setElection] = useState({ title: "Loading..." });
  const [retryCount, setRetryCount] = useState(0);
  const [testingMode, setTestingMode] = useState(false);
  const [debugData, setDebugData] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [anonymousVoters, setAnonymousVoters] = useState([]);
  const [repairing, setRepairing] = useState(false);
  const [repairInProgress, setRepairInProgress] = useState(false);
  const [anonymousVoterCount, setAnonymousVoterCount] = useState(0);

  // New state variables for email functionality
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [voterEmail, setVoterEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const open = Boolean(actionMenuAnchor);

  // Email functionality handlers
  const handleEmailDialogOpen = () => {
    setEmailDialogOpen(true);
  };

  const handleEmailDialogClose = () => {
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

  // Fetch ballot details and voters when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching data for ballot ID: ${id}`);

        // Fetch ballot details
        const ballotResponse = await ballotService.getBallotById(id);
        if (ballotResponse.data && ballotResponse.data.data) {
          setElection(ballotResponse.data.data);
          console.log("Ballot data retrieved:", {
            title: ballotResponse.data.data.title,
            id: ballotResponse.data.data.id,
          });
        }

        // Fetch voters with retry mechanism
        let votersResponse;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            console.log(
              `Attempt ${retryCount + 1}: Fetching voters for ballot ID: ${id}`
            );
            votersResponse = await ballotService.getVoters(id, {
              includeAll: testingMode,
              debug: true,
            });
            console.log("Voters API response:", votersResponse);
            break; // Success, exit the retry loop
          } catch (retryError) {
            retryCount++;
            console.error(`Attempt ${retryCount} failed:`, retryError);

            if (retryCount >= maxRetries) {
              throw retryError; // All retries failed, propagate the error
            }

            // Wait a bit before retrying (exponential backoff)
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * retryCount)
            );
          }
        }

        if (votersResponse && votersResponse.data && votersResponse.data.data) {
          // Handle the new response format with enhanced voter data
          const responseData = votersResponse.data.data;
          const rawVoters = responseData.voters || [];
          const totalVotes = responseData.totalVotes || 0;
          const debugInfo = responseData.debug || {};

          console.log(
            `Retrieved ${rawVoters.length} voters from API, total votes: ${totalVotes}`
          );
          console.log("Debug info:", debugInfo);

          // Ensure the ballot data has the correct vote count
          if (totalVotes !== undefined) {
            setElection((prev) => ({
              ...prev,
              ballotsReceived: totalVotes,
            }));
          }

          if (rawVoters.length === 0) {
            console.log("No voters found in the response");
          } else {
            console.log("First voter in API response:", rawVoters[0]);

            // Check if any anonymous voters exist and log them
            const anonymousVoters = rawVoters.filter(
              (v) => v.email && v.email.includes("anonymous-")
            );
            if (anonymousVoters.length > 0) {
              console.log(`Found ${anonymousVoters.length} anonymous voters`);
            }
          }

          const voterData = rawVoters.map((voter) => {
            // Check if this is an anonymous voter using email prefix
            const isAnonymousVoter =
              voter.email && voter.email.includes("anonymous-");

            // Prioritize the real name from the voter record, NEVER use "Anonymous Voter" if a real name exists
            let voterName = voter.name;

            // Only fallback to email-derived name if the current name is "Anonymous Voter" or missing
            if (
              (!voterName || voterName === "Anonymous Voter") &&
              !isAnonymousVoter
            ) {
              // Extract username from email if it's a real email (not anonymous-)
              voterName =
                voter.email && !voter.email.includes("anonymous-")
                  ? voter.email.split("@")[0].replace(/[._-]/g, " ")
                  : "Anonymous Voter";
            }

            // For debugging only
            if (voter.name === "Anonymous Voter" && !isAnonymousVoter) {
              console.log(
                "Found voter with real email but anonymous name:",
                voter.email
              );
            }

            return {
              id: voter.id,
              name: voterName,
              email: voter.email,
              status: voter.hasVoted ? "Voted" : "Registered",
              isVerified: voter.isVerified,
              voteCount: voter.voteCount || 0,
              actualVoteCount: voter.actualVoteCount || 0, // From the backend
              hasVotes: voter.hasVotes || voter.voteCount > 0,
              isAnonymous: isAnonymousVoter,
            };
          });

          console.log("Processed voter data:", voterData.slice(0, 2)); // Show first two voters for debug

          // Track anonymous voters for the repair function
          const foundAnonymousVoters = voterData.filter((v) => v.isAnonymous);
          setAnonymousVoters(foundAnonymousVoters);

          if (foundAnonymousVoters.length > 0) {
            console.log(
              `Found ${foundAnonymousVoters.length} anonymous voters that could be repaired`
            );
          }

          // Log any voters that still show as anonymous even with real emails
          const suspiciousVoters = voterData.filter(
            (v) => v.name === "Anonymous Voter" && !v.isAnonymous
          );

          if (suspiciousVoters.length > 0) {
            console.warn(
              `Found ${suspiciousVoters.length} voters with real emails but anonymous names`
            );
          }

          setVoters(voterData);

          // Advanced verification: Check if voters with hasVoted=true actually have votes
          const votersWithVotes = voterData.filter((v) => v.voteCount > 0);
          const votersMarkedAsVoted = voterData.filter(
            (v) => v.status === "Voted"
          );

          if (votersWithVotes.length !== votersMarkedAsVoted.length) {
            console.warn(
              `Warning: Mismatch between voters with votes (${votersWithVotes.length}) and ` +
                `voters marked as voted (${votersMarkedAsVoted.length})`
            );
          }

          // Verify that voters count is consistent with votes
          const totalVotesFromVoters = voterData.reduce(
            (sum, v) => sum + (v.voteCount || 0),
            0
          );
          if (totalVotesFromVoters !== totalVotes) {
            console.warn(
              `Warning: Mismatch between sum of individual voter votes (${totalVotesFromVoters}) ` +
                `and total votes (${totalVotes})`
            );
          }

          setDebugData(debugInfo);
        } else {
          console.warn("No voters data in response:", votersResponse);
          // Set empty array to ensure UI handles no voters case properly
          setVoters([]);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching voters:", err);
        if (err.response) {
          console.error("Response error data:", err.response.data);
          console.error("Response error status:", err.response.status);
        }
        setError("Failed to load voters. Please try again later.");
        setLoading(false);
      }
    };

    fetchData();
  }, [id, testingMode, refreshTrigger]);

  // Add code to count anonymous voters when voters are loaded
  useEffect(() => {
    if (voters && voters.length > 0) {
      const anonymousCount = voters.filter(
        (voter) => voter.name === "Anonymous Voter" || !voter.name
      ).length;

      setAnonymousVoterCount(anonymousCount);
      console.log(
        `Found ${anonymousCount} anonymous voters out of ${voters.length} total`
      );
    }
  }, [voters]);

  const filteredVoters = voters.filter(
    (voter) =>
      voter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voter.email.toLowerCase().includes(searchQuery.toLowerCase())
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

  const handleGenerateDigitalKey = async (voter) => {
    // This would be implemented to call an API to generate a digital key
    alert(`Generate digital key for ${voter.email}`);
    handleActionMenuClose();
  };

  const handleResendVoterId = async (voter) => {
    // This would be implemented to call an API to resend voter ID
    alert(`Resend voter ID to ${voter.email}`);
    handleActionMenuClose();
  };

  const handleRemoveRegistration = async (voter) => {
    // This would be implemented to call an API to remove registration
    alert(`Remove registration for ${voter.email}`);
    handleActionMenuClose();
  };

  const handleTestingModeToggle = () => {
    setTestingMode(!testingMode);
  };

  const handleRefreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const navigateToDebug = () => {
    navigate(`/elections/${id}/debug`);
  };

  const handleRepairAnonymousVoters = async () => {
    if (!id) return;

    try {
      setRepairInProgress(true);

      console.log("Starting repair of anonymous voters for ballot:", id);
      const result = await ballotService.repairAnonymousVoters(id);

      console.log("Repair result:", result);
      toast.success(
        `Repair complete. ${result.updated || 0} voters were updated.`
      );

      // Refresh the voter list
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error repairing anonymous voters:", error);
      toast.error(
        "Failed to repair anonymous voters: " +
          (error.message || "Unknown error")
      );
    } finally {
      setRepairInProgress(false);
    }
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

        <div>
          {anonymousVoterCount > 0 && (
            <Button
              variant="danger"
              className="me-2"
              onClick={handleRepairAnonymousVoters}
              disabled={repairInProgress}
            >
              {repairInProgress
                ? "Repairing..."
                : `Repair ${anonymousVoterCount} Anonymous Voters`}
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleEmailDialogOpen}
            sx={{
              background: "linear-gradient(45deg, #080E1D 30%, #263C75 90%)",
              color: "white",
              "&:hover": {
                background: "linear-gradient(45deg, #060A15 30%, #1E2F5D 90%)",
              },
            }}
          >
            Add Voters
          </Button>
        </div>
      </Box>

      {/* Election Title */}
      <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
        {election.title} Voters
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "200px",
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <>
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
              disabled={selected.length === 0}
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
              onClick={() => {
                const selectedVoters = voters.filter((v) =>
                  selected.includes(v.id)
                );
                alert(`Resend voter ID to ${selectedVoters.length} voters`);
              }}
            >
              Resend Voter ID
            </Button>

            <Button
              startIcon={<VpnKeyIcon />}
              variant="outlined"
              disabled={selected.length === 0}
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
              onClick={() => {
                const selectedVoters = voters.filter((v) =>
                  selected.includes(v.id)
                );
                alert(
                  `Generate digital key for ${selectedVoters.length} voters`
                );
              }}
            >
              Generate Digital Key
            </Button>

            <Button
              startIcon={<DeleteOutlineIcon />}
              variant="outlined"
              disabled={selected.length === 0}
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
              onClick={() => {
                const selectedVoters = voters.filter((v) =>
                  selected.includes(v.id)
                );
                alert(
                  `Remove registration for ${selectedVoters.length} voters`
                );
              }}
            >
              Remove Voters
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
                placeholder="Search by name or email"
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

          {/* Empty state */}
          {voters.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                py: 5,
                border: "1px dashed #E2E8F0",
                borderRadius: "8px",
                my: 3,
              }}
            >
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                No voters added yet
              </Typography>
              <Button
                variant="contained"
                onClick={handleEmailDialogOpen}
                startIcon={<AddIcon />}
                sx={{
                  background: "linear-gradient(to right, #080E1D, #263C75)",
                  "&:hover": {
                    background: "linear-gradient(to right, #050912, #1d2e59)",
                  },
                  borderRadius: "4px",
                }}
              >
                Add Voters
              </Button>
            </Box>
          ) : (
            /* Voters Table */
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
                            onClick={(event) =>
                              handleSelectClick(event, voter.id)
                            }
                            sx={{
                              color: "#CBD5E0",
                              "&.Mui-checked": {
                                color: "#3182CE",
                              },
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {voter.name}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={voter.status}
                            size="small"
                            sx={{
                              bgcolor:
                                voter.status === "Voted"
                                  ? "#EAFDEE"
                                  : "#EDF2F7",
                              color:
                                voter.status === "Voted"
                                  ? "#2F855A"
                                  : "#4A5568",
                              fontWeight: 500,
                            }}
                          />
                        </TableCell>
                        <TableCell>{voter.email}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={(event) =>
                              handleActionMenuOpen(event, voter)
                            }
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
          )}

          {/* Action Menu */}
          <Menu
            anchorEl={actionMenuAnchor}
            open={open}
            onClose={handleActionMenuClose}
            PaperProps={{
              sx: {
                boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                mt: 1,
              },
            }}
          >
            <MenuItem
              onClick={() => currentVoter && handleResendVoterId(currentVoter)}
            >
              <MarkEmailReadIcon fontSize="small" sx={{ mr: 1 }} />
              Resend Voter ID
            </MenuItem>
            <MenuItem
              onClick={() =>
                currentVoter && handleGenerateDigitalKey(currentVoter)
              }
            >
              <VpnKeyIcon fontSize="small" sx={{ mr: 1 }} />
              Generate Digital Key
            </MenuItem>
            <MenuItem
              onClick={() =>
                currentVoter && handleRemoveRegistration(currentVoter)
              }
            >
              <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} />
              Remove Registration
            </MenuItem>
          </Menu>
        </>
      )}

      {/* Email Dialog */}
      <Dialog
        open={emailDialogOpen}
        onClose={handleEmailDialogClose}
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
            onClick={handleEmailDialogClose}
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
    </Box>
  );
};

export default ManageVoters;
