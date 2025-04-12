import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  InputAdornment,
  FormHelperText,
  Switch,
  FormControlLabel,
  Stack,
  Chip,
  Snackbar,
  Alert,
  Radio,
  RadioGroup,
  Input,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  RadioButtonChecked as RadioButtonCheckedIcon,
  CheckBox as CheckBoxIcon,
  ShortText as ShortTextIcon,
  Subject as SubjectIcon,
  CreditCard as CreditCardIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  Ballot as BallotIcon,
} from "@mui/icons-material";
import MainLayout from "../components/Layout/MainLayout";
import {
  setBallotBuilderStep,
  updateBallotTitle,
  updateBallotDescription,
  addBallotQuestion,
  updateBallotQuestion,
  removeBallotQuestion,
  setElectionDuration,
  setParticipantsCount,
  resetBallotBuilder,
  createElectionRequest,
  createElectionSuccess,
} from "../store/electionSlice";

// Styled components
const StyledStepper = styled(Stepper)(({ theme }) => ({
  "& .MuiStepLabel-root .Mui-completed": {
    color: theme.palette.secondary.main,
  },
  "& .MuiStepLabel-root .Mui-active": {
    color: theme.palette.secondary.main,
  },
}));

const StepIconContainer = styled("div")(({ theme, active, completed }) => ({
  height: 36,
  width: 36,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  backgroundColor:
    completed || active
      ? theme.palette.secondary.main
      : theme.palette.grey[200],
  color:
    completed || active
      ? theme.palette.common.white
      : theme.palette.text.secondary,
  transition: "all 0.3s ease-in-out",
}));

const ActionButton = styled(Button)(({ theme }) => ({
  textTransform: "none",
  borderRadius: "8px",
  fontWeight: 600,
  boxShadow: "none",
  "&:hover": {
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
  },
}));

const QuestionCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
  marginBottom: theme.spacing(3),
  "&:hover": {
    boxShadow: "0px 8px 25px rgba(0, 0, 0, 0.1)",
  },
}));

const OptionContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(1),
}));

const PricingCard = styled(Card)(({ theme, selected }) => ({
  borderRadius: theme.shape.borderRadius,
  boxShadow: selected
    ? "0px 4px 20px rgba(68, 120, 235, 0.2)"
    : "0px 4px 20px rgba(0, 0, 0, 0.05)",
  border: selected
    ? `2px solid ${theme.palette.secondary.main}`
    : "1px solid transparent",
  transition: "all 0.3s ease-in-out",
  cursor: "pointer",
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: "0px 8px 25px rgba(0, 0, 0, 0.1)",
  },
}));

// Custom step icon
const CustomStepIcon = ({ active, completed, icon }) => {
  const getStepIcon = (stepIcon) => {
    switch (stepIcon) {
      case 1:
        return <BallotIcon />;
      case 2:
        return <CalendarIcon />;
      case 3:
        return <PeopleIcon />;
      case 4:
        return <CreditCardIcon />;
      default:
        return <CheckIcon />;
    }
  };

  return (
    <StepIconContainer active={active} completed={completed}>
      {completed ? <CheckIcon /> : getStepIcon(icon)}
    </StepIconContainer>
  );
};

// Mock data for pricing
const pricingOptions = [
  { id: 1, voters: 25, price: 49 },
  { id: 2, voters: 50, price: 79 },
  { id: 3, voters: 100, price: 129 },
  { id: 4, voters: 250, price: 249 },
  { id: 5, voters: 500, price: 399 },
];

// Question types
const questionTypes = [
  { id: "single", label: "Single Choice", icon: <RadioButtonCheckedIcon /> },
  { id: "multiple", label: "Multiple Choice", icon: <CheckBoxIcon /> },
  { id: "text", label: "Text Response", icon: <ShortTextIcon /> },
];

const BallotBuilder = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { ballotBuilderState } = useSelector((state) => state.elections);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(null);
  const [editingMode, setEditingMode] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState({
    title: "",
    type: "single",
    required: true,
    options: [""],
  });

  const [paymentMethod, setPaymentMethod] = useState("credit");
  const [cardDetails, setCardDetails] = useState({
    number: "",
    name: "",
    expiry: "",
    cvc: "",
  });

  const handleCardDetailsChange = (event) => {
    setCardDetails({
      ...cardDetails,
      [event.target.name]: event.target.value,
    });
  };

  const handlePaymentMethodChange = (event) => {
    setPaymentMethod(event.target.value);
  };

  const steps = [
    "Build Your Ballot",
    "Set Duration",
    "Select # of Participants",
    "Confirm & Pay",
  ];

  // Handle step change
  const handleNext = () => {
    if (ballotBuilderState.currentStep === 0 && !validateBallotStep()) {
      setSnackbarMessage("Please add at least one question to your ballot");
      setSnackbarOpen(true);
      return;
    }

    if (ballotBuilderState.currentStep === 1 && !validateDurationStep()) {
      setSnackbarMessage("Please select valid start and end dates");
      setSnackbarOpen(true);
      return;
    }

    if (ballotBuilderState.currentStep === 2 && !validateParticipantsStep()) {
      setSnackbarMessage("Please select the number of participants");
      setSnackbarOpen(true);
      return;
    }

    dispatch(setBallotBuilderStep(ballotBuilderState.currentStep + 1));
  };

  const handleBack = () => {
    dispatch(setBallotBuilderStep(ballotBuilderState.currentStep - 1));
  };

  const handleReset = () => {
    dispatch(resetBallotBuilder());
  };

  // Validation functions
  const validateBallotStep = () => {
    return (
      ballotBuilderState.ballot.title.trim() !== "" &&
      ballotBuilderState.ballot.questions.length > 0
    );
  };

  const validateDurationStep = () => {
    return (
      ballotBuilderState.duration.startDate &&
      ballotBuilderState.duration.endDate &&
      new Date(ballotBuilderState.duration.endDate) >
        new Date(ballotBuilderState.duration.startDate)
    );
  };

  const validateParticipantsStep = () => {
    return ballotBuilderState.participants > 0;
  };

  const validatePaymentStep = () => {
    if (paymentMethod === "credit") {
      return (
        cardDetails.number &&
        cardDetails.name &&
        cardDetails.expiry &&
        cardDetails.cvc
      );
    }
    return true;
  };

  // Ballot title and description update
  const handleBallotTitleChange = (event) => {
    dispatch(updateBallotTitle(event.target.value));
  };

  const handleBallotDescriptionChange = (event) => {
    dispatch(updateBallotDescription(event.target.value));
  };

  // Question editor functions
  const handleAddQuestion = () => {
    setCurrentQuestion({
      title: "",
      type: "single",
      required: true,
      options: [""],
    });
    setEditingMode(true);
    setCurrentQuestionIndex(null);
  };

  const handleQuestionChange = (field, value) => {
    setCurrentQuestion({
      ...currentQuestion,
      [field]: value,
    });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    handleQuestionChange("options", newOptions);
  };

  const handleAddOption = () => {
    handleQuestionChange("options", [...currentQuestion.options, ""]);
  };

  const handleRemoveOption = (index) => {
    const newOptions = currentQuestion.options.filter((_, i) => i !== index);
    handleQuestionChange("options", newOptions);
  };

  const handleSaveQuestion = () => {
    if (currentQuestion.title.trim() === "") {
      setSnackbarMessage("Question title cannot be empty");
      setSnackbarOpen(true);
      return;
    }

    if (
      currentQuestion.type !== "text" &&
      (currentQuestion.options.length < 2 ||
        currentQuestion.options.some((option) => option.trim() === ""))
    ) {
      setSnackbarMessage("Please add at least two non-empty options");
      setSnackbarOpen(true);
      return;
    }

    if (currentQuestionIndex !== null) {
      dispatch(
        updateBallotQuestion({
          index: currentQuestionIndex,
          question: currentQuestion,
        })
      );
    } else {
      dispatch(addBallotQuestion(currentQuestion));
    }

    setEditingMode(false);
    setCurrentQuestionIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingMode(false);
    setCurrentQuestionIndex(null);
  };

  const handleEditQuestion = (index) => {
    setCurrentQuestion({ ...ballotBuilderState.ballot.questions[index] });
    setCurrentQuestionIndex(index);
    setEditingMode(true);
  };

  const handleRemoveQuestion = (index) => {
    dispatch(removeBallotQuestion(index));
  };

  // Duration step handlers
  const handleStartDateChange = (date) => {
    dispatch(
      setElectionDuration({
        ...ballotBuilderState.duration,
        startDate: date,
      })
    );
  };

  const handleEndDateChange = (date) => {
    dispatch(
      setElectionDuration({
        ...ballotBuilderState.duration,
        endDate: date,
      })
    );
  };

  // Participants step handlers
  const handleParticipantsChange = (option) => {
    dispatch(setParticipantsCount(option.voters));
  };

  // Create election handler
  const handleCreateElection = () => {
    if (!validatePaymentStep()) {
      setSnackbarMessage("Please fill in all payment details");
      setSnackbarOpen(true);
      return;
    }

    dispatch(createElectionRequest());

    // Simulating API call
    setTimeout(() => {
      dispatch(
        createElectionSuccess({
          id: Math.floor(Math.random() * 1000),
          title: ballotBuilderState.ballot.title,
          description: ballotBuilderState.ballot.description,
          status: "Registration",
          startDate: new Date(ballotBuilderState.duration.startDate)
            .toISOString()
            .split("T")[0],
          endDate: new Date(ballotBuilderState.duration.endDate)
            .toISOString()
            .split("T")[0],
          totalVoters: ballotBuilderState.participants,
          votedCount: 0,
          participation: 0,
        })
      );

      navigate("/my-elections");
    }, 1500);
  };

  // Snackbar close handler
  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  // Get selected pricing
  const getSelectedPricing = () => {
    return (
      pricingOptions.find(
        (option) => option.voters === ballotBuilderState.participants
      ) || null
    );
  };

  return (
    <MainLayout>
      <Box>
        <Box mb={4}>
          <Typography variant="h4" fontWeight={700}>
            Create New Election
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Follow the steps below to create your election ballot
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={3}>
            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: 2, position: "sticky", top: 24 }}
            >
              <StyledStepper
                activeStep={ballotBuilderState.currentStep}
                orientation="vertical"
              >
                {steps.map((label, index) => (
                  <Step key={label}>
                    <StepLabel StepIconComponent={CustomStepIcon}>
                      <Typography
                        fontWeight={
                          ballotBuilderState.currentStep === index ? 600 : 400
                        }
                      >
                        {label}
                      </Typography>
                    </StepLabel>
                  </Step>
                ))}
              </StyledStepper>

              {ballotBuilderState.currentStep === steps.length && (
                <Box p={3}>
                  <Typography>
                    All steps completed - you&apos;re finished
                  </Typography>
                  <Button onClick={handleReset} sx={{ mt: 1, mr: 1 }}>
                    Reset
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={9}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 2 }}>
              {/* Step 1: Build Ballot */}
              {ballotBuilderState.currentStep === 0 && (
                <Box>
                  <Typography variant="h5" fontWeight={600} mb={3}>
                    Build Your Ballot
                  </Typography>

                  <Grid container spacing={3} mb={4}>
                    <Grid item xs={12}>
                      <TextField
                        label="Election Title"
                        variant="outlined"
                        fullWidth
                        value={ballotBuilderState.ballot.title}
                        onChange={handleBallotTitleChange}
                        placeholder="e.g., Board of Directors Election 2023"
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Election Description"
                        variant="outlined"
                        fullWidth
                        multiline
                        rows={3}
                        value={ballotBuilderState.ballot.description}
                        onChange={handleBallotDescriptionChange}
                        placeholder="Provide a brief description of this election"
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ mb: 3 }} />

                  <Box mb={3}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={2}
                    >
                      <Typography variant="h6" fontWeight={600}>
                        Questions
                      </Typography>
                      {!editingMode && (
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={handleAddQuestion}
                          sx={{
                            background:
                              "linear-gradient(45deg, #4478EB 30%, #6FA0FF 90%)",
                            color: "white",
                            textTransform: "none",
                            fontWeight: 600,
                          }}
                        >
                          Add Question
                        </Button>
                      )}
                    </Box>

                    {editingMode ? (
                      <QuestionCard>
                        <CardContent>
                          <TextField
                            label="Question Title"
                            variant="outlined"
                            fullWidth
                            value={currentQuestion.title}
                            onChange={(e) =>
                              handleQuestionChange("title", e.target.value)
                            }
                            placeholder="e.g., Who do you want to elect as CEO?"
                            required
                            sx={{ mb: 3 }}
                          />

                          <FormControl
                            fullWidth
                            variant="outlined"
                            sx={{ mb: 3 }}
                          >
                            <InputLabel id="question-type-label">
                              Question Type
                            </InputLabel>
                            <Select
                              labelId="question-type-label"
                              id="question-type"
                              value={currentQuestion.type}
                              onChange={(e) =>
                                handleQuestionChange("type", e.target.value)
                              }
                              label="Question Type"
                            >
                              {questionTypes.map((type) => (
                                <MenuItem key={type.id} value={type.id}>
                                  <Box display="flex" alignItems="center">
                                    {type.icon}
                                    <Typography sx={{ ml: 1 }}>
                                      {type.label}
                                    </Typography>
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          <FormControlLabel
                            control={
                              <Switch
                                checked={currentQuestion.required}
                                onChange={(e) =>
                                  handleQuestionChange(
                                    "required",
                                    e.target.checked
                                  )
                                }
                                color="primary"
                              />
                            }
                            label="Required question"
                            sx={{ mb: 3 }}
                          />

                          {currentQuestion.type !== "text" && (
                            <Box>
                              <Typography
                                variant="subtitle1"
                                fontWeight={600}
                                mb={2}
                              >
                                Options
                              </Typography>

                              {currentQuestion.options.map((option, index) => (
                                <OptionContainer key={index}>
                                  {currentQuestion.type === "single" && (
                                    <RadioButtonCheckedIcon
                                      color="primary"
                                      sx={{ mr: 1 }}
                                    />
                                  )}
                                  {currentQuestion.type === "multiple" && (
                                    <CheckBoxIcon
                                      color="primary"
                                      sx={{ mr: 1 }}
                                    />
                                  )}
                                  <TextField
                                    variant="standard"
                                    fullWidth
                                    value={option}
                                    onChange={(e) =>
                                      handleOptionChange(index, e.target.value)
                                    }
                                    placeholder={`Option ${index + 1}`}
                                    InputProps={{
                                      disableUnderline: true,
                                    }}
                                  />
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRemoveOption(index)}
                                    disabled={
                                      currentQuestion.options.length <= 1
                                    }
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </OptionContainer>
                              ))}

                              <Button
                                startIcon={<AddIcon />}
                                onClick={handleAddOption}
                                sx={{ mt: 1 }}
                              >
                                Add Option
                              </Button>
                            </Box>
                          )}

                          <Box display="flex" justifyContent="flex-end" mt={3}>
                            <Button
                              variant="outlined"
                              onClick={handleCancelEdit}
                              sx={{ mr: 2 }}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="contained"
                              color="primary"
                              onClick={handleSaveQuestion}
                              sx={{
                                background:
                                  "linear-gradient(45deg, #4478EB 30%, #6FA0FF 90%)",
                                color: "white",
                              }}
                            >
                              Save Question
                            </Button>
                          </Box>
                        </CardContent>
                      </QuestionCard>
                    ) : (
                      <Box>
                        {ballotBuilderState.ballot.questions.length === 0 ? (
                          <Box
                            sx={{
                              p: 4,
                              border: "2px dashed #E0E0E0",
                              borderRadius: 2,
                              textAlign: "center",
                            }}
                          >
                            <Typography color="text.secondary" mb={2}>
                              No questions added yet
                            </Typography>
                            <Button
                              variant="contained"
                              startIcon={<AddIcon />}
                              onClick={handleAddQuestion}
                              sx={{
                                background:
                                  "linear-gradient(45deg, #4478EB 30%, #6FA0FF 90%)",
                                color: "white",
                                textTransform: "none",
                                fontWeight: 600,
                              }}
                            >
                              Add Your First Question
                            </Button>
                          </Box>
                        ) : (
                          <Box>
                            {ballotBuilderState.ballot.questions.map(
                              (question, index) => (
                                <QuestionCard key={index}>
                                  <CardContent>
                                    <Box
                                      display="flex"
                                      justifyContent="space-between"
                                      alignItems="flex-start"
                                    >
                                      <Box>
                                        <Typography
                                          variant="h6"
                                          fontWeight={600}
                                          mb={1}
                                        >
                                          {question.title}
                                        </Typography>
                                        <Box
                                          display="flex"
                                          alignItems="center"
                                          mb={2}
                                        >
                                          <Chip
                                            label={
                                              questionTypes.find(
                                                (t) => t.id === question.type
                                              )?.label || "Question"
                                            }
                                            size="small"
                                            icon={
                                              questionTypes.find(
                                                (t) => t.id === question.type
                                              )?.icon
                                            }
                                            sx={{ mr: 1 }}
                                          />
                                          {question.required && (
                                            <Chip
                                              label="Required"
                                              size="small"
                                              color="primary"
                                            />
                                          )}
                                        </Box>
                                      </Box>

                                      <Box>
                                        <IconButton
                                          onClick={() =>
                                            handleEditQuestion(index)
                                          }
                                        >
                                          <EditIcon />
                                        </IconButton>
                                        <IconButton
                                          onClick={() =>
                                            handleRemoveQuestion(index)
                                          }
                                        >
                                          <DeleteIcon />
                                        </IconButton>
                                      </Box>
                                    </Box>

                                    {question.type !== "text" && (
                                      <Box>
                                        <Divider sx={{ mb: 2 }} />
                                        <Typography
                                          variant="subtitle2"
                                          fontWeight={600}
                                          mb={1}
                                        >
                                          Options:
                                        </Typography>
                                        <Grid container spacing={1}>
                                          {question.options.map(
                                            (option, optionIndex) => (
                                              <Grid
                                                item
                                                xs={12}
                                                sm={6}
                                                key={optionIndex}
                                              >
                                                <Box
                                                  display="flex"
                                                  alignItems="center"
                                                >
                                                  {question.type ===
                                                    "single" && (
                                                    <RadioButtonCheckedIcon
                                                      color="primary"
                                                      fontSize="small"
                                                      sx={{ mr: 1 }}
                                                    />
                                                  )}
                                                  {question.type ===
                                                    "multiple" && (
                                                    <CheckBoxIcon
                                                      color="primary"
                                                      fontSize="small"
                                                      sx={{ mr: 1 }}
                                                    />
                                                  )}
                                                  <Typography variant="body2">
                                                    {option}
                                                  </Typography>
                                                </Box>
                                              </Grid>
                                            )
                                          )}
                                        </Grid>
                                      </Box>
                                    )}
                                  </CardContent>
                                </QuestionCard>
                              )
                            )}
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              {/* Step 2: Set Duration */}
              {ballotBuilderState.currentStep === 1 && (
                <Box>
                  <Typography variant="h5" fontWeight={600} mb={3}>
                    Set Election Duration
                  </Typography>

                  <Typography variant="body1" mb={4}>
                    Choose when your election will start and end. Voters will be
                    able to cast their votes during this time period.
                  </Typography>

                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <Grid container spacing={4} mb={4}>
                      <Grid item xs={12} md={6}>
                        <DateTimePicker
                          label="Start Date & Time"
                          value={ballotBuilderState.duration.startDate}
                          onChange={handleStartDateChange}
                          renderInput={(params) => (
                            <TextField {...params} fullWidth />
                          )}
                          minDate={new Date()}
                        />
                        <FormHelperText>
                          Your election will be in "Registration" status until
                          this date
                        </FormHelperText>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <DateTimePicker
                          label="End Date & Time"
                          value={ballotBuilderState.duration.endDate}
                          onChange={handleEndDateChange}
                          renderInput={(params) => (
                            <TextField {...params} fullWidth />
                          )}
                          minDate={
                            ballotBuilderState.duration.startDate || new Date()
                          }
                        />
                        <FormHelperText>
                          Your election will automatically close on this date
                        </FormHelperText>
                      </Grid>
                    </Grid>
                  </LocalizationProvider>

                  <Divider sx={{ mb: 4 }} />

                  <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    Election Timeline
                  </Typography>

                  <Box
                    sx={{
                      p: 3,
                      backgroundColor: "rgba(68, 120, 235, 0.05)",
                      borderRadius: 2,
                    }}
                  >
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <Box textAlign="center">
                          <Typography
                            variant="subtitle2"
                            fontWeight={600}
                            color="text.secondary"
                            mb={1}
                          >
                            Registration Phase
                          </Typography>
                          <Chip
                            label="Registration"
                            color="info"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Box textAlign="center">
                          <Typography
                            variant="subtitle2"
                            fontWeight={600}
                            color="text.secondary"
                            mb={1}
                          >
                            Voting Phase
                          </Typography>
                          <Chip
                            label="Live"
                            color="success"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Box textAlign="center">
                          <Typography
                            variant="subtitle2"
                            fontWeight={600}
                            color="text.secondary"
                            mb={1}
                          >
                            Results Phase
                          </Typography>
                          <Chip
                            label="Completed"
                            sx={{
                              fontWeight: 600,
                              backgroundColor: "#9E9E9E20",
                              color: "#9E9E9E",
                            }}
                          />
                        </Box>
                      </Grid>
                    </Grid>

                    <Box
                      mt={3}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Box textAlign="center">
                        <Typography variant="body2" fontWeight={500}>
                          Now
                        </Typography>
                      </Box>
                      <Box textAlign="center">
                        <Typography variant="body2" fontWeight={500}>
                          {ballotBuilderState.duration.startDate
                            ? new Date(
                                ballotBuilderState.duration.startDate
                              ).toLocaleDateString()
                            : "Start Date"}
                        </Typography>
                      </Box>
                      <Box textAlign="center">
                        <Typography variant="body2" fontWeight={500}>
                          {ballotBuilderState.duration.endDate
                            ? new Date(
                                ballotBuilderState.duration.endDate
                              ).toLocaleDateString()
                            : "End Date"}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Step 3: Select Participants */}
              {ballotBuilderState.currentStep === 2 && (
                <Box>
                  <Typography variant="h5" fontWeight={600} mb={3}>
                    Select Number of Participants
                  </Typography>

                  <Typography variant="body1" mb={4}>
                    Choose how many voters will participate in your election.
                    This determines the pricing.
                  </Typography>

                  <Grid container spacing={3} mb={4}>
                    {pricingOptions.map((option) => (
                      <Grid item xs={12} sm={6} md={4} key={option.id}>
                        <PricingCard
                          selected={
                            ballotBuilderState.participants === option.voters
                          }
                          onClick={() => handleParticipantsChange(option)}
                        >
                          <CardContent>
                            <Box
                              display="flex"
                              justifyContent="space-between"
                              alignItems="center"
                              mb={2}
                            >
                              <Typography variant="h6" fontWeight={600}>
                                {option.voters} Voters
                              </Typography>
                              {ballotBuilderState.participants ===
                                option.voters && (
                                <CheckIcon color="secondary" />
                              )}
                            </Box>

                            <Typography variant="h4" fontWeight={700} mb={1}>
                              ${option.price}
                            </Typography>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                              mb={2}
                            >
                              One-time payment
                            </Typography>

                            <Divider sx={{ mb: 2 }} />

                            <Stack spacing={1}>
                              <Box display="flex" alignItems="center">
                                <CheckIcon
                                  color="success"
                                  fontSize="small"
                                  sx={{ mr: 1 }}
                                />
                                <Typography variant="body2">
                                  Up to {option.voters} voters
                                </Typography>
                              </Box>
                              <Box display="flex" alignItems="center">
                                <CheckIcon
                                  color="success"
                                  fontSize="small"
                                  sx={{ mr: 1 }}
                                />
                                <Typography variant="body2">
                                  Secure digital ballots
                                </Typography>
                              </Box>
                              <Box display="flex" alignItems="center">
                                <CheckIcon
                                  color="success"
                                  fontSize="small"
                                  sx={{ mr: 1 }}
                                />
                                <Typography variant="body2">
                                  Real-time results
                                </Typography>
                              </Box>
                              <Box display="flex" alignItems="center">
                                <CheckIcon
                                  color="success"
                                  fontSize="small"
                                  sx={{ mr: 1 }}
                                />
                                <Typography variant="body2">
                                  Email notifications
                                </Typography>
                              </Box>
                            </Stack>
                          </CardContent>
                        </PricingCard>
                      </Grid>
                    ))}
                  </Grid>

                  <Box
                    sx={{
                      p: 3,
                      backgroundColor: "rgba(68, 120, 235, 0.05)",
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={600} mb={2}>
                      Need more voters?
                    </Typography>
                    <Typography variant="body2" mb={2}>
                      Contact us for custom pricing options for elections with
                      more than 500 voters.
                    </Typography>
                    <Button variant="outlined" color="primary">
                      Contact Sales
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Step 4: Confirm & Pay */}
              {ballotBuilderState.currentStep === 3 && (
                <Box>
                  <Typography variant="h5" fontWeight={600} mb={3}>
                    Confirm & Pay
                  </Typography>

                  <Grid container spacing={4}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" fontWeight={600} mb={2}>
                        Order Summary
                      </Typography>

                      <Paper
                        elevation={0}
                        sx={{
                          p: 3,
                          borderRadius: 2,
                          border: "1px solid #E0E0E0",
                          mb: 3,
                        }}
                      >
                        <Typography variant="subtitle1" fontWeight={600} mb={2}>
                          {ballotBuilderState.ballot.title}
                        </Typography>

                        <Divider sx={{ mb: 2 }} />

                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          mb={1}
                        >
                          <Typography variant="body2">
                            Election Package ({ballotBuilderState.participants}{" "}
                            voters)
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            ${getSelectedPricing()?.price || 0}
                          </Typography>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography variant="subtitle1" fontWeight={600}>
                            Total
                          </Typography>
                          <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            color="secondary"
                          >
                            ${getSelectedPricing()?.price || 0}
                          </Typography>
                        </Box>
                      </Paper>

                      <Typography variant="h6" fontWeight={600} mb={2}>
                        Election Details
                      </Typography>

                      <Paper
                        elevation={0}
                        sx={{
                          p: 3,
                          borderRadius: 2,
                          border: "1px solid #E0E0E0",
                        }}
                      >
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">
                              Title:
                            </Typography>
                          </Grid>
                          <Grid item xs={8}>
                            <Typography variant="body2" fontWeight={500}>
                              {ballotBuilderState.ballot.title}
                            </Typography>
                          </Grid>

                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">
                              Questions:
                            </Typography>
                          </Grid>
                          <Grid item xs={8}>
                            <Typography variant="body2" fontWeight={500}>
                              {ballotBuilderState.ballot.questions.length}
                            </Typography>
                          </Grid>

                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">
                              Start Date:
                            </Typography>
                          </Grid>
                          <Grid item xs={8}>
                            <Typography variant="body2" fontWeight={500}>
                              {ballotBuilderState.duration.startDate
                                ? new Date(
                                    ballotBuilderState.duration.startDate
                                  ).toLocaleString()
                                : "Not set"}
                            </Typography>
                          </Grid>

                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">
                              End Date:
                            </Typography>
                          </Grid>
                          <Grid item xs={8}>
                            <Typography variant="body2" fontWeight={500}>
                              {ballotBuilderState.duration.endDate
                                ? new Date(
                                    ballotBuilderState.duration.endDate
                                  ).toLocaleString()
                                : "Not set"}
                            </Typography>
                          </Grid>

                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">
                              Voters:
                            </Typography>
                          </Grid>
                          <Grid item xs={8}>
                            <Typography variant="body2" fontWeight={500}>
                              {ballotBuilderState.participants}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" fontWeight={600} mb={2}>
                        Payment Method
                      </Typography>

                      <Paper
                        elevation={0}
                        sx={{
                          p: 3,
                          borderRadius: 2,
                          border: "1px solid #E0E0E0",
                          mb: 3,
                        }}
                      >
                        <FormControl
                          component="fieldset"
                          sx={{ width: "100%", mb: 2 }}
                        >
                          <RadioGroup
                            aria-label="payment-method"
                            name="payment-method"
                            value={paymentMethod}
                            onChange={handlePaymentMethodChange}
                          >
                            <FormControlLabel
                              value="credit"
                              control={<Radio />}
                              label="Credit Card"
                              sx={{ mb: 1 }}
                            />
                            <FormControlLabel
                              value="paypal"
                              control={<Radio />}
                              label="PayPal"
                            />
                          </RadioGroup>
                        </FormControl>

                        {paymentMethod === "credit" && (
                          <Box>
                            <TextField
                              label="Card Number"
                              variant="outlined"
                              fullWidth
                              name="number"
                              value={cardDetails.number}
                              onChange={handleCardDetailsChange}
                              placeholder="1234 5678 9012 3456"
                              sx={{ mb: 2 }}
                            />

                            <TextField
                              label="Cardholder Name"
                              variant="outlined"
                              fullWidth
                              name="name"
                              value={cardDetails.name}
                              onChange={handleCardDetailsChange}
                              placeholder="John Smith"
                              sx={{ mb: 2 }}
                            />

                            <Grid container spacing={2}>
                              <Grid item xs={6}>
                                <TextField
                                  label="Expiry Date"
                                  variant="outlined"
                                  fullWidth
                                  name="expiry"
                                  value={cardDetails.expiry}
                                  onChange={handleCardDetailsChange}
                                  placeholder="MM/YY"
                                />
                              </Grid>
                              <Grid item xs={6}>
                                <TextField
                                  label="CVC"
                                  variant="outlined"
                                  fullWidth
                                  name="cvc"
                                  value={cardDetails.cvc}
                                  onChange={handleCardDetailsChange}
                                  placeholder="123"
                                />
                              </Grid>
                            </Grid>
                          </Box>
                        )}

                        {paymentMethod === "paypal" && (
                          <Box sx={{ textAlign: "center", py: 3 }}>
                            <Typography variant="body1" mb={2}>
                              You will be redirected to PayPal to complete your
                              payment.
                            </Typography>
                            <img
                              src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg"
                              alt="PayPal"
                              width={111}
                              height={69}
                            />
                          </Box>
                        )}
                      </Paper>

                      <Typography variant="body2" color="text.secondary" mb={2}>
                        By clicking "Create Election", you agree to our Terms of
                        Service and Privacy Policy. You will be charged $
                        {getSelectedPricing()?.price || 0}.
                      </Typography>

                      <ActionButton
                        fullWidth
                        variant="contained"
                        color="secondary"
                        size="large"
                        onClick={handleCreateElection}
                        sx={{
                          background:
                            "linear-gradient(45deg, #4478EB 30%, #6FA0FF 90%)",
                          color: "white",
                          py: 1.5,
                        }}
                      >
                        Create Election
                      </ActionButton>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Navigation buttons */}
              {ballotBuilderState.currentStep < steps.length && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 4,
                  }}
                >
                  <Button
                    onClick={handleBack}
                    disabled={
                      ballotBuilderState.currentStep === 0 || editingMode
                    }
                    startIcon={<ArrowBackIcon />}
                  >
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={
                      ballotBuilderState.currentStep === steps.length - 1
                        ? handleCreateElection
                        : handleNext
                    }
                    disabled={editingMode}
                    endIcon={
                      ballotBuilderState.currentStep ===
                      steps.length - 1 ? null : (
                        <ArrowForwardIcon />
                      )
                    }
                    sx={{
                      background:
                        "linear-gradient(45deg, #4478EB 30%, #6FA0FF 90%)",
                      color: "white",
                    }}
                  >
                    {ballotBuilderState.currentStep === steps.length - 1
                      ? "Create Election"
                      : "Continue"}
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="error"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
};

export default BallotBuilder;
