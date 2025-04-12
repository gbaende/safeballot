import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Chip,
  FormHelperText,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { format } from "date-fns";

const steps = [
  "Build Ballot",
  "Set Duration",
  "Select Participants",
  "Confirm & Pay",
];

const BallotBuilder = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [ballotData, setBallotData] = useState({
    title: "",
    description: "",
    positions: [
      { title: "", description: "", candidates: [{ name: "", bio: "" }] },
    ],
    startDate: null,
    endDate: null,
    timeZone: "UTC",
    allowAbstain: true,
    allowWriteIn: false,
    voters: [],
    uploadedVoters: [],
    verificationMethod: "email",
    notificationMethod: "email",
    reminderEmails: true,
    estimatedCost: 49.99,
  });
  const [errors, setErrors] = useState({});
  const [openPositionDialog, setOpenPositionDialog] = useState(false);
  const [openCandidateDialog, setOpenCandidateDialog] = useState(false);
  const [currentPositionIndex, setCurrentPositionIndex] = useState(null);
  const [currentCandidateData, setCurrentCandidateData] = useState({
    name: "",
    bio: "",
  });
  const [currentPositionData, setCurrentPositionData] = useState({
    title: "",
    description: "",
  });

  // Mock data for voter search
  const availableVoters = [
    { id: 1, name: "John Smith", email: "john.smith@example.com" },
    { id: 2, name: "Sarah Johnson", email: "sarah.johnson@example.com" },
    { id: 3, name: "Michael Brown", email: "michael.brown@example.com" },
    { id: 4, name: "Emily Davis", email: "emily.davis@example.com" },
    { id: 5, name: "David Wilson", email: "david.wilson@example.com" },
    { id: 6, name: "Jennifer Lee", email: "jennifer.lee@example.com" },
    { id: 7, name: "Robert Garcia", email: "robert.garcia@example.com" },
    { id: 8, name: "Maria Rodriguez", email: "maria.rodriguez@example.com" },
    { id: 9, name: "James Anderson", email: "james.anderson@example.com" },
    { id: 10, name: "Patricia Martin", email: "patricia.martin@example.com" },
  ];

  const handleNext = () => {
    let isValid = false;

    switch (activeStep) {
      case 0:
        isValid = validateStep1();
        break;
      case 1:
        isValid = validateStep2();
        break;
      case 2:
        isValid = validateStep3();
        break;
      default:
        isValid = true;
        break;
    }

    if (isValid) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!ballotData.title) newErrors.title = "Election title is required";
    if (!ballotData.description)
      newErrors.description = "Description is required";

    if (ballotData.positions.length === 0) {
      newErrors.positions = "At least one position is required";
    } else {
      // Validate each position
      let positionErrors = false;
      ballotData.positions.forEach((position, index) => {
        if (!position.title) {
          newErrors[`position_${index}_title`] = "Position title is required";
          positionErrors = true;
        }
        if (position.candidates.length === 0) {
          newErrors[`position_${index}_candidates`] =
            "At least one candidate is required";
          positionErrors = true;
        } else {
          // Validate each candidate
          position.candidates.forEach((candidate, candIndex) => {
            if (!candidate.name) {
              newErrors[`position_${index}_candidate_${candIndex}_name`] =
                "Candidate name is required";
              positionErrors = true;
            }
          });
        }
      });

      if (positionErrors) {
        newErrors.positions = "Please fix errors in positions or candidates";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!ballotData.startDate) newErrors.startDate = "Start date is required";
    if (!ballotData.endDate) newErrors.endDate = "End date is required";
    if (
      ballotData.startDate &&
      ballotData.endDate &&
      ballotData.startDate >= ballotData.endDate
    ) {
      newErrors.endDate = "End date must be after start date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (
      ballotData.voters.length === 0 &&
      ballotData.uploadedVoters.length === 0
    ) {
      newErrors.voters = "At least one voter is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBallotData({
      ...ballotData,
      [name]: value,
    });

    // Clear error when field is updated
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    setBallotData({
      ...ballotData,
      [name]: checked,
    });
  };

  const handleDateChange = (name, value) => {
    setBallotData({
      ...ballotData,
      [name]: value,
    });

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const addPosition = () => {
    setCurrentPositionData({ title: "", description: "" });
    setOpenPositionDialog(true);
  };

  const handleSavePosition = () => {
    if (currentPositionIndex !== null) {
      // Edit existing position
      const updatedPositions = [...ballotData.positions];
      updatedPositions[currentPositionIndex] = {
        ...updatedPositions[currentPositionIndex],
        title: currentPositionData.title,
        description: currentPositionData.description,
      };

      setBallotData({
        ...ballotData,
        positions: updatedPositions,
      });
    } else {
      // Add new position
      setBallotData({
        ...ballotData,
        positions: [
          ...ballotData.positions,
          {
            title: currentPositionData.title,
            description: currentPositionData.description,
            candidates: [],
          },
        ],
      });
    }

    setOpenPositionDialog(false);
    setCurrentPositionIndex(null);
  };

  const editPosition = (index) => {
    setCurrentPositionIndex(index);
    setCurrentPositionData({
      title: ballotData.positions[index].title,
      description: ballotData.positions[index].description,
    });
    setOpenPositionDialog(true);
  };

  const deletePosition = (index) => {
    const updatedPositions = ballotData.positions.filter((_, i) => i !== index);
    setBallotData({
      ...ballotData,
      positions: updatedPositions,
    });
  };

  const addCandidate = (positionIndex) => {
    setCurrentPositionIndex(positionIndex);
    setCurrentCandidateData({ name: "", bio: "" });
    setOpenCandidateDialog(true);
  };

  const handleSaveCandidate = () => {
    if (!currentCandidateData.name) return;

    const updatedPositions = [...ballotData.positions];
    updatedPositions[currentPositionIndex].candidates.push(
      currentCandidateData
    );

    setBallotData({
      ...ballotData,
      positions: updatedPositions,
    });

    setOpenCandidateDialog(false);
    setCurrentCandidateData({ name: "", bio: "" });
  };

  const deleteCandidate = (positionIndex, candidateIndex) => {
    const updatedPositions = [...ballotData.positions];
    updatedPositions[positionIndex].candidates = updatedPositions[
      positionIndex
    ].candidates.filter((_, i) => i !== candidateIndex);

    setBallotData({
      ...ballotData,
      positions: updatedPositions,
    });
  };

  const handleVotersChange = (event, value) => {
    setBallotData({
      ...ballotData,
      voters: value,
    });

    if (errors.voters) {
      setErrors({
        ...errors,
        voters: "",
      });
    }
  };

  const handleSubmit = () => {
    // In a real app, this would submit the election data to the server
    console.log("Ballot data submitted:", ballotData);
    navigate("/my-elections");
  };

  const renderStep1 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Basic Information
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            label="Election Title"
            name="title"
            value={ballotData.title}
            onChange={handleChange}
            error={!!errors.title}
            helperText={errors.title}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            label="Description"
            name="description"
            value={ballotData.description}
            onChange={handleChange}
            multiline
            rows={3}
            error={!!errors.description}
            helperText={errors.description}
          />
        </Grid>
      </Grid>

      <Box
        sx={{
          mt: 4,
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6">Positions & Candidates</Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addPosition}
        >
          Add Position
        </Button>
      </Box>

      {errors.positions && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.positions}
        </Alert>
      )}

      {ballotData.positions.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 2, textAlign: "center" }}
        >
          No positions added yet. Click "Add Position" to create your first
          position.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {ballotData.positions.map((position, posIndex) => (
            <Grid item xs={12} key={posIndex}>
              <Card variant="outlined">
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="h6">
                        {position.title || "Untitled Position"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {position.description || "No description provided"}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton onClick={() => editPosition(posIndex)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => deletePosition(posIndex)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <Typography variant="subtitle1">Candidates</Typography>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => addCandidate(posIndex)}
                    >
                      Add Candidate
                    </Button>
                  </Box>

                  {position.candidates.length === 0 ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1, mb: 1 }}
                    >
                      No candidates added yet.
                    </Typography>
                  ) : (
                    <List dense>
                      {position.candidates.map((candidate, candIndex) => (
                        <ListItem key={candIndex}>
                          <ListItemText
                            primary={candidate.name}
                            secondary={candidate.bio}
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              onClick={() =>
                                deleteCandidate(posIndex, candIndex)
                              }
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  )}

                  {errors[`position_${posIndex}_candidates`] && (
                    <FormHelperText error>
                      {errors[`position_${posIndex}_candidates`]}
                    </FormHelperText>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  const renderStep2 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Election Duration
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              label="Start Date & Time"
              value={ballotData.startDate}
              onChange={(value) => handleDateChange("startDate", value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  required
                  error={!!errors.startDate}
                  helperText={errors.startDate}
                />
              )}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} md={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              label="End Date & Time"
              value={ballotData.endDate}
              onChange={(value) => handleDateChange("endDate", value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  required
                  error={!!errors.endDate}
                  helperText={errors.endDate}
                />
              )}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel id="timezone-label">Time Zone</InputLabel>
            <Select
              labelId="timezone-label"
              id="timeZone"
              name="timeZone"
              value={ballotData.timeZone}
              label="Time Zone"
              onChange={handleChange}
            >
              <MenuItem value="UTC">UTC</MenuItem>
              <MenuItem value="EST">Eastern Time (EST)</MenuItem>
              <MenuItem value="CST">Central Time (CST)</MenuItem>
              <MenuItem value="MST">Mountain Time (MST)</MenuItem>
              <MenuItem value="PST">Pacific Time (PST)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Voting Options
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={ballotData.allowAbstain}
                onChange={handleSwitchChange}
                name="allowAbstain"
                color="primary"
              />
            }
            label="Allow voters to abstain"
          />
          <FormHelperText>
            Voters can choose to abstain from voting for specific positions
          </FormHelperText>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={ballotData.allowWriteIn}
                onChange={handleSwitchChange}
                name="allowWriteIn"
                color="primary"
              />
            }
            label="Allow write-in candidates"
          />
          <FormHelperText>
            Voters can write in names of candidates not on the ballot
          </FormHelperText>
        </Grid>
      </Grid>
    </Box>
  );

  const renderStep3 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Invite Voters
      </Typography>

      {errors.voters && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.voters}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Autocomplete
            multiple
            id="voters"
            options={availableVoters}
            getOptionLabel={(option) => `${option.name} (${option.email})`}
            value={ballotData.voters}
            onChange={handleVotersChange}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="Search and select voters"
                placeholder="Add voters"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={`${option.name} (${option.email})`}
                  {...getTagProps({ index })}
                  size="small"
                />
              ))
            }
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Or upload a list of voters
          </Typography>
          <Button
            variant="outlined"
            component="label"
            startIcon={<CloudUploadIcon />}
            sx={{ mt: 1 }}
          >
            Upload CSV File
            <input
              type="file"
              hidden
              accept=".csv"
              onChange={(e) => {
                // In a real app, this would handle file upload
                if (e.target.files.length > 0) {
                  setBallotData({
                    ...ballotData,
                    uploadedVoters: [
                      {
                        name: e.target.files[0].name,
                        count: Math.floor(Math.random() * 50) + 10, // Random number for demo
                      },
                    ],
                  });
                }
              }}
            />
          </Button>
          <FormHelperText>
            Upload a CSV file with columns: Name, Email, Organization (optional)
          </FormHelperText>

          {ballotData.uploadedVoters.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                Uploaded: {ballotData.uploadedVoters[0].name} (
                {ballotData.uploadedVoters[0].count} voters)
              </Typography>
            </Box>
          )}
        </Grid>

        <Grid item xs={12} sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Voter Verification
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="verification-method-label">
              Verification Method
            </InputLabel>
            <Select
              labelId="verification-method-label"
              id="verificationMethod"
              name="verificationMethod"
              value={ballotData.verificationMethod}
              label="Verification Method"
              onChange={handleChange}
            >
              <MenuItem value="email">Email Link</MenuItem>
              <MenuItem value="code">Access Code</MenuItem>
              <MenuItem value="sso">Single Sign-On</MenuItem>
            </Select>
            <FormHelperText>
              How voters will authenticate to access the ballot
            </FormHelperText>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="notification-method-label">
              Notification Method
            </InputLabel>
            <Select
              labelId="notification-method-label"
              id="notificationMethod"
              name="notificationMethod"
              value={ballotData.notificationMethod}
              label="Notification Method"
              onChange={handleChange}
            >
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="sms">SMS Text Message</MenuItem>
              <MenuItem value="both">Both Email & SMS</MenuItem>
            </Select>
            <FormHelperText>
              How voters will be notified about the election
            </FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={ballotData.reminderEmails}
                onChange={handleSwitchChange}
                name="reminderEmails"
                color="primary"
              />
            }
            label="Send reminder emails to voters who haven't voted"
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderStep4 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review Your Election
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Election Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Title
              </Typography>
              <Typography variant="body1">{ballotData.title}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Duration
              </Typography>
              <Typography variant="body1">
                {ballotData.startDate && ballotData.endDate
                  ? `${format(
                      ballotData.startDate,
                      "MMM d, yyyy h:mm a"
                    )} - ${format(ballotData.endDate, "MMM d, yyyy h:mm a")} (${
                      ballotData.timeZone
                    })`
                  : "Not set"}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body1">{ballotData.description}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Positions ({ballotData.positions.length})
          </Typography>
          {ballotData.positions.map((position, index) => (
            <Box
              key={index}
              sx={{ mb: index !== ballotData.positions.length - 1 ? 2 : 0 }}
            >
              <Typography variant="subtitle1">{position.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {position.candidates.length} candidate
                {position.candidates.length !== 1 ? "s" : ""}
              </Typography>
              {index !== ballotData.positions.length - 1 && (
                <Divider sx={{ mt: 1 }} />
              )}
            </Box>
          ))}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Voters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Selected Voters
              </Typography>
              <Typography variant="body1">
                {ballotData.voters.length} voter(s)
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Uploaded Voters
              </Typography>
              <Typography variant="body1">
                {ballotData.uploadedVoters.length > 0
                  ? `${ballotData.uploadedVoters[0].count} voter(s) from CSV`
                  : "None"}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Verification
              </Typography>
              <Typography variant="body1">
                {ballotData.verificationMethod}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Notifications
              </Typography>
              <Typography variant="body1">
                {ballotData.notificationMethod}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Payment Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Base Price
              </Typography>
              <Typography variant="body1">
                ${ballotData.estimatedCost.toFixed(2)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Additional Voters
              </Typography>
              <Typography variant="body1">$0.00</Typography>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" fontWeight="bold">
                Total
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" fontWeight="bold">
                ${ballotData.estimatedCost.toFixed(2)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Create Election
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper elevation={3} sx={{ p: 4 }}>
        {activeStep === 0 && renderStep1()}
        {activeStep === 1 && renderStep2()}
        {activeStep === 2 && renderStep3()}
        {activeStep === 3 && renderStep4()}

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
          <Button
            variant="outlined"
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Back
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button variant="contained" onClick={handleSubmit}>
              Create Election
            </Button>
          ) : (
            <Button variant="contained" onClick={handleNext}>
              Next
            </Button>
          )}
        </Box>
      </Paper>

      {/* Position Dialog */}
      <Dialog
        open={openPositionDialog}
        onClose={() => setOpenPositionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {currentPositionIndex !== null ? "Edit Position" : "Add Position"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              id="positionTitle"
              label="Position Title"
              type="text"
              fullWidth
              variant="outlined"
              value={currentPositionData.title}
              onChange={(e) =>
                setCurrentPositionData({
                  ...currentPositionData,
                  title: e.target.value,
                })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              id="positionDescription"
              label="Description"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={currentPositionData.description}
              onChange={(e) =>
                setCurrentPositionData({
                  ...currentPositionData,
                  description: e.target.value,
                })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPositionDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSavePosition}
            variant="contained"
            disabled={!currentPositionData.title}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Candidate Dialog */}
      <Dialog
        open={openCandidateDialog}
        onClose={() => setOpenCandidateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Candidate</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              id="candidateName"
              label="Candidate Name"
              type="text"
              fullWidth
              variant="outlined"
              value={currentCandidateData.name}
              onChange={(e) =>
                setCurrentCandidateData({
                  ...currentCandidateData,
                  name: e.target.value,
                })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              id="candidateBio"
              label="Candidate Bio (Optional)"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={currentCandidateData.bio}
              onChange={(e) =>
                setCurrentCandidateData({
                  ...currentCandidateData,
                  bio: e.target.value,
                })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCandidateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSaveCandidate}
            variant="contained"
            disabled={!currentCandidateData.name}
          >
            Add Candidate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BallotBuilder;
