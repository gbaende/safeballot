import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  IconButton,
  Divider,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Checkbox,
  InputAdornment,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  ContentCopy as ContentCopyIcon,
  AccessTime as AccessTimeIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Link as LinkIcon,
  Check as CheckIcon,
  CalendarToday as CalendarTodayIcon,
  RemoveCircleOutline as RemoveCircleOutlineIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as AccountBalanceIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
} from "@mui/icons-material";
import { format, isValid, addHours, parse, set } from "date-fns";
import {
  LocalizationProvider,
  DatePicker,
  TimePicker,
} from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { ballotService, electionService } from "../../services/api";

const steps = [
  "Build Ballot",
  "Set Duration",
  "Select # of Participants",
  "Confirm + Pay",
];

const BallotBuilder = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [electionTitle, setElectionTitle] = useState("");
  const [questions, setQuestions] = useState([
    {
      id: 1,
      title: "Question Title Here",
      description: "",
      options: [""], // Initialize with one empty option
    },
  ]);
  const [currentQuestionId, setCurrentQuestionId] = useState(1);
  const [allowWriteIn, setAllowWriteIn] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState("12:30 AM");
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ); // Default: 1 week from now
  const [endTime, setEndTime] = useState("12:30 AM");
  const [voterCount, setVoterCount] = useState(10);
  const pricePerVoter = 0.1;
  const [totalPrice, setTotalPrice] = useState(1.0);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardholderName, setCardholderName] = useState("");
  const [billingAddress, setBillingAddress] = useState("United States");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [sameAsShipping, setSameAsShipping] = useState(false);

  // Add state for controlling date/time picker dialogs
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
  const [startTimePickerOpen, setStartTimePickerOpen] = useState(false);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  const [endTimePickerOpen, setEndTimePickerOpen] = useState(false);

  // Add state for temporary date/time values - initialize with current values
  const [startDateStr, setStartDateStr] = useState(
    format(new Date(), "MMMM d, yyyy")
  );
  const [startTimeStr, setStartTimeStr] = useState(
    format(new Date(), "h:mm a")
  );
  const [endDateStr, setEndDateStr] = useState(
    format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "MMMM d, yyyy")
  );
  const [endTimeStr, setEndTimeStr] = useState(format(new Date(), "h:mm a"));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Calculate the total price whenever voter count changes
  useEffect(() => {
    const calculatedPrice = (voterCount * pricePerVoter).toFixed(2);
    setTotalPrice(parseFloat(calculatedPrice));
  }, [voterCount, pricePerVoter]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleAddQuestion = () => {
    const newId = Math.max(...questions.map((q) => q.id), 0) + 1;
    setQuestions([
      ...questions,
      { id: newId, title: "", description: "", options: [""] },
    ]);
  };

  const handleQuestionTitleChange = (e) => {
    const updatedQuestions = questions.map((q) =>
      q.id === currentQuestionId ? { ...q, title: e.target.value } : q
    );
    setQuestions(updatedQuestions);
  };

  const handleQuestionDescriptionChange = (e) => {
    const updatedQuestions = questions.map((q) =>
      q.id === currentQuestionId ? { ...q, description: e.target.value } : q
    );
    setQuestions(updatedQuestions);
  };

  const handleOptionChange = (index, value) => {
    const currentQuestion = getCurrentQuestion();
    const updatedOptions = [...currentQuestion.options];
    updatedOptions[index] = value;

    // If this is the last option and it's not empty, add a new empty option
    if (index === updatedOptions.length - 1 && value.trim() !== "") {
      updatedOptions.push("");
    }

    const updatedQuestions = questions.map((q) =>
      q.id === currentQuestionId ? { ...q, options: updatedOptions } : q
    );
    setQuestions(updatedQuestions);
  };

  const addEmptyOption = () => {
    const currentQuestion = getCurrentQuestion();
    const updatedOptions = [...currentQuestion.options];
    updatedOptions.push("");

    const updatedQuestions = questions.map((q) =>
      q.id === currentQuestionId ? { ...q, options: updatedOptions } : q
    );
    setQuestions(updatedQuestions);
  };

  const removeOption = (index) => {
    const currentQuestion = getCurrentQuestion();
    // Don't remove if it's the last empty option
    if (
      currentQuestion.options.length === 1 &&
      currentQuestion.options[0] === ""
    ) {
      return;
    }

    const updatedOptions = currentQuestion.options.filter(
      (_, i) => i !== index
    );

    // Ensure there's always at least one empty option at the end
    if (
      updatedOptions.length === 0 ||
      updatedOptions[updatedOptions.length - 1].trim() !== ""
    ) {
      updatedOptions.push("");
    }

    const updatedQuestions = questions.map((q) =>
      q.id === currentQuestionId ? { ...q, options: updatedOptions } : q
    );
    setQuestions(updatedQuestions);
  };

  const getCurrentQuestion = () => {
    return questions.find((q) => q.id === currentQuestionId) || questions[0];
  };

  const handleVoterCountChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      setVoterCount(value);
    }
  };

  const decreaseVoterCount = () => {
    if (voterCount > 1) {
      setVoterCount(voterCount - 1);
    }
  };

  const increaseVoterCount = () => {
    setVoterCount(voterCount + 1);
  };

  // Add helper functions for date picker dialogs
  const handleOpenStartDatePicker = () => {
    setStartDatePickerOpen(true);
  };

  const handleCloseStartDatePicker = (save = false) => {
    setStartDatePickerOpen(false);
  };

  const handleOpenStartTimePicker = () => {
    setStartTimePickerOpen(true);
  };

  const handleCloseStartTimePicker = (save = false) => {
    setStartTimePickerOpen(false);
  };

  const handleOpenEndDatePicker = () => {
    setEndDatePickerOpen(true);
  };

  const handleCloseEndDatePicker = (save = false) => {
    setEndDatePickerOpen(false);
  };

  const handleOpenEndTimePicker = () => {
    setEndTimePickerOpen(true);
  };

  const handleCloseEndTimePicker = (save = false) => {
    setEndTimePickerOpen(false);
  };

  // Helper functions to work with dates
  const combineDateAndTime = (dateStr, timeStr) => {
    try {
      console.log("Combining date:", dateStr, "and time:", timeStr);

      // Parse the date string
      const datePart = parse(dateStr, "MMMM d, yyyy", new Date());
      console.log("Parsed date part:", datePart);

      // Extract hours and minutes from time string
      const timeMatch = timeStr.match(/(\d+):(\d+)\s+(AM|PM)/i);
      if (!timeMatch) {
        console.error("Invalid time format:", timeStr);
        return new Date();
      }

      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const isPM = timeMatch[3].toUpperCase() === "PM";
      console.log("Extracted time parts:", { hours, minutes, isPM });

      // Convert to 24-hour format
      if (isPM && hours < 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;

      // Create a new date with the parsed time
      const result = new Date(datePart);
      result.setHours(hours, minutes, 0, 0);
      console.log("Final combined date:", result);

      return result;
    } catch (error) {
      console.error("Error parsing date and time:", error);
      return new Date();
    }
  };

  // Update handlers for date pickers to store both string and Date formats
  const handleStartDateChange = (newDate) => {
    console.log("Start date changed:", newDate);
    if (newDate && isValid(newDate)) {
      const formattedDate = format(newDate, "MMMM d, yyyy");
      console.log("Formatted start date:", formattedDate);
      setStartDate(newDate);
      setStartDateStr(formattedDate);
    }
  };

  const handleStartTimeChange = (newTime) => {
    console.log("Start time changed:", newTime);
    if (newTime && isValid(newTime)) {
      const formattedTime = format(newTime, "h:mm a");
      console.log("Formatted start time:", formattedTime);
      setStartTimeStr(formattedTime);
    }
  };

  const handleEndDateChange = (newDate) => {
    console.log("End date changed:", newDate);
    if (newDate && isValid(newDate)) {
      const formattedDate = format(newDate, "MMMM d, yyyy");
      console.log("Formatted end date:", formattedDate);
      setEndDate(newDate);
      setEndDateStr(formattedDate);
    }
  };

  const handleEndTimeChange = (newTime) => {
    console.log("End time changed:", newTime);
    if (newTime && isValid(newTime)) {
      const formattedTime = format(newTime, "h:mm a");
      console.log("Formatted end time:", formattedTime);
      setEndTimeStr(formattedTime);
    }
  };

  // Update the submitBallot function to use the new date handling
  const submitBallot = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Get the admin token for authentication
      const token = localStorage.getItem("adminToken");
      console.log(
        "Admin token for debugging:",
        token ? `${token.substring(0, 30)}...` : "missing"
      );

      // Parse dates and times using the helper function
      const startDateTime = combineDateAndTime(startDateStr, startTimeStr);
      const endDateTime = combineDateAndTime(endDateStr, endTimeStr);

      // Validate date/time values
      if (!isValid(startDateTime) || !isValid(endDateTime)) {
        setSubmitError(
          "Invalid start or end date/time. Please check your selections."
        );
        setIsSubmitting(false);
        return;
      }

      // Check that end date is after start date
      if (endDateTime <= startDateTime) {
        setSubmitError("End date/time must be after start date/time.");
        setIsSubmitting(false);
        return;
      }

      // Format questions for API - filter out empty options
      const formattedQuestions = questions
        .map((q) => {
          // Filter out empty options first
          const validOptions = q.options.filter(
            (option) => option.trim() !== ""
          );

          // Create properly formatted choices array from options
          const choices = validOptions.map((optionText, index) => ({
            text: optionText,
            description: "",
            order: index,
          }));

          return {
            title: q.title || "Untitled Question",
            description: q.description || "",
            questionType: "single_choice",
            maxSelections: 1,
            choices: choices, // This is the key change - backend expects 'choices', not 'options'
            allow_write_in: allowWriteIn,
          };
        })
        .filter((q) => q.choices.length > 0); // Only include questions with at least one choice

      // Check if there are any valid questions
      if (formattedQuestions.length === 0) {
        setSubmitError("At least one question with options is required");
        setIsSubmitting(false);
        return;
      }

      // Prepare ballot data
      const ballotData = {
        title: electionTitle || "Untitled Ballot",
        description: "Created from SafeBallot app",
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        questions: formattedQuestions,

        // CRITICAL: Set the admin-defined number of voters allowed
        // This is the number set in Step 3 of the ballot creation process
        voterCount: parseInt(voterCount, 10),
        allowedVoters: parseInt(voterCount, 10),
        maxVoters: parseInt(voterCount, 10),

        // These start at zero - they're the runtime counters
        totalVoters: 0, // Number of registered voters
        total_voters: 0, // Same as above (snake_case)
        ballotsReceived: 0, // Number of votes cast
        ballots_received: 0, // Same as above (snake_case)
      };

      console.log(
        "Ballot data being submitted with voter count:",
        voterCount,
        JSON.stringify(ballotData, null, 2)
      );

      // First try the ballotService API approach
      try {
        console.log("Using ballotService.createBallot API...");
        const response = await ballotService.createBallot(ballotData);

        console.log("API response status:", response.status);
        console.log("API response data:", response.data);

        if (response.status >= 200 && response.status < 300 && response.data) {
          // Success! Use the ID from the response
          setSubmitSuccess(true);

          // Get the actual ballot ID from the API response
          const createdBallotId = response.data.data.id;
          console.log("Received ballot ID from API:", createdBallotId);

          // Store the ballot data in localStorage with the real ID from API
          try {
            const existingBallots = JSON.parse(
              localStorage.getItem("userBallots") || "[]"
            );

            // Use the ID returned from the API
            const newBallot = {
              ...response.data.data,
              shareableLink: generateShareableLink(response.data.data),
            };

            localStorage.setItem(
              "userBallots",
              JSON.stringify([...existingBallots, newBallot])
            );

            console.log(
              "Saved ballot to localStorage with ID:",
              createdBallotId
            );
          } catch (e) {
            console.error("Error saving to localStorage:", e);
          }

          setTimeout(() => {
            navigate("/my-elections");
          }, 1500);
          return;
        }
      } catch (apiError) {
        console.error("ballotService approach failed:", apiError);

        // Fall back to direct fetch approach
        try {
          console.log("Falling back to direct fetch API...");

          // Create fetch request with explicit headers
          const response = await fetch("http://localhost:8080/api/ballots", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(ballotData),
          });

          // Get response status and data
          const status = response.status;
          const responseData = await response.json();

          console.log("Fetch response status:", status);
          console.log("Fetch response data:", responseData);

          if (status >= 200 && status < 300) {
            // Success!
            setSubmitSuccess(true);
            setTimeout(() => {
              navigate("/my-elections");
            }, 1500);

            // Store the ballot data in localStorage to show in My Elections
            try {
              const existingBallots = JSON.parse(
                localStorage.getItem("userBallots") || "[]"
              );

              // Use the ID from the API response if available
              const newBallot = {
                ...(responseData.data || {}),
                id: responseData.data?.id || uuidv4(),
                ...ballotData,
                status: "scheduled",
                created_at: new Date().toISOString(),
                shareableLink: generateShareableLink(
                  responseData.data || { id: uuidv4(), title: ballotData.title }
                ),
              };

              localStorage.setItem(
                "userBallots",
                JSON.stringify([...existingBallots, newBallot])
              );
              console.log(
                "Saved ballot to localStorage with ID:",
                newBallot.id
              );
            } catch (e) {
              console.error("Error saving to localStorage:", e);
            }

            return;
          } else {
            throw new Error(`Error ${status}: ${JSON.stringify(responseData)}`);
          }
        } catch (fetchError) {
          console.error("All API approaches failed:", fetchError);
          // Continue to local storage fallback
        }
      }

      // Last resort: localStorage only with clear warning
      console.warn(
        "⚠️ WARNING: USING LOCAL STORAGE FALLBACK ONLY - BALLOT WILL NOT BE AVAILABLE IN DATABASE"
      );
      alert(
        "⚠️ Warning: Could not connect to server. Ballot will be saved locally only and may not be accessible to voters unless you're on the same device."
      );

      setSubmitSuccess(true);

      // Store the ballot data in localStorage to show in My Elections
      try {
        const existingBallots = JSON.parse(
          localStorage.getItem("userBallots") || "[]"
        );
        const localId = uuidv4();
        const newBallot = {
          id: localId,
          ...ballotData,
          status: "scheduled",
          created_at: new Date().toISOString(),
          _localOnly: true, // Mark as local-only ballot
        };

        // Generate a shareable voter registration link
        newBallot.shareableLink = generateShareableLink(newBallot);

        localStorage.setItem(
          "userBallots",
          JSON.stringify([...existingBallots, newBallot])
        );
        console.log(
          "⚠️ Saved ballot to localStorage ONLY (not in database):",
          newBallot.shareableLink
        );
      } catch (e) {
        console.error("Error saving to localStorage:", e);
      }

      setTimeout(() => {
        navigate("/my-elections");
      }, 1500);
    } catch (error) {
      console.error("Error submitting ballot:", error);
      setSubmitError(
        error.message || "Failed to create ballot. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to generate a shareable link
  const generateShareableLink = (ballot) => {
    const baseUrl = window.location.origin;
    // Create a URL-friendly slug from the title
    const slug = (ballot.title || "Untitled Ballot")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    // Generate a unique code using only the ID's first 8 characters
    const idPart = ballot.id.toString().substring(0, 8);
    // Format: baseUrl/voter-registration/electionId/slug-uniqueCode
    return `${baseUrl}/voter-registration/${ballot.id}/${slug}-${idPart}`;
  };

  // Add a test function to check authentication status
  const testAuthentication = async () => {
    console.log("--- Authentication Test ---");
    const token = localStorage.getItem("adminToken");
    console.log("Admin token in localStorage:", token ? "Present" : "Missing");
    if (token) {
      console.log(
        "Admin token first 20 chars:",
        token.substring(0, 20) + "..."
      );
    }

    // Test with a simple API call
    try {
      console.log("Testing API call to /elections/summary");
      const response = await electionService.getSummary();
      console.log("API call succeeded:", response.status);
      console.log("Response data:", response.data);
      alert(
        "Authentication successful! API responded with status: " +
          response.status
      );
    } catch (error) {
      console.error("API call failed:", error);
      console.error("Status:", error.response?.status);
      console.error("Data:", error.response?.data);
      alert(
        "Authentication failed! Status: " +
          (error.response?.status || "unknown")
      );
    }
  };

  // Add a direct token debugging function
  const debugTokenAuthentication = async () => {
    console.log("--- DIRECT TOKEN DEBUGGING ---");

    // Get token directly from localStorage
    const token = localStorage.getItem("adminToken");
    console.log("Raw admin token from localStorage:", token);

    // Analyze token structure if it exists
    if (token) {
      console.log("Admin token length:", token.length);
      console.log(
        "Admin token first 20 chars:",
        token.substring(0, 20) + "..."
      );
      console.log(
        "Admin token last 20 chars:",
        "..." + token.substring(token.length - 20)
      );

      try {
        // Try to parse token as JWT (check if it has 3 parts separated by dots)
        const parts = token.split(".");
        console.log(
          "Token has",
          parts.length,
          "parts",
          parts.length === 3 ? "(valid JWT format)" : "(invalid JWT format)"
        );
      } catch (e) {
        console.error("Error analyzing token:", e);
      }
    } else {
      console.error("No admin token found in localStorage");
    }

    // Try a direct axios request bypassing interceptors
    try {
      console.log("Attempting direct axios request to /api/health");
      const response = await axios.get("http://localhost:8080/api/health");
      console.log("Health check successful:", response.status, response.data);

      // If health check works, try a protected endpoint with explicit header
      try {
        console.log(
          "Attempting protected endpoint with explicit Authorization header"
        );
        const protectedResponse = await axios.get(
          "http://localhost:8080/api/elections/summary",
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          }
        );
        console.log(
          "Protected request successful:",
          protectedResponse.status,
          protectedResponse.data
        );
        alert("Authentication success! Token is working correctly.");
      } catch (protectedError) {
        console.error("Protected request failed:", protectedError);
        console.error("Status:", protectedError.response?.status);
        console.error("Data:", protectedError.response?.data);
        alert(
          "Auth failed on protected endpoint! Status: " +
            (protectedError.response?.status || "unknown")
        );
      }
    } catch (error) {
      console.error("Direct request failed:", error);
      alert(
        "Even basic health check failed! Status: " +
          (error.response?.status || "unknown")
      );
    }
  };

  // Step 1: Build Ballot Content
  const renderBuildBallot = () => (
    <>
      <Typography variant="h4" sx={{ fontWeight: 500, mb: 4 }}>
        Build Ballot
      </Typography>

      <Grid container spacing={4}>
        {/* Left Column - Content Sidebar */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Content
          </Typography>

          {questions.map((question, index) => (
            <Box
              key={question.id}
              sx={{
                mb: 2,
                p: 2,
                border:
                  question.id === currentQuestionId
                    ? "1px solid #3182CE"
                    : "1px solid #E2E8F0",
                borderRadius: "4px",
                cursor: "pointer",
                bgcolor:
                  question.id === currentQuestionId ? "#F7FAFC" : "transparent",
              }}
              onClick={() => setCurrentQuestionId(question.id)}
            >
              <Typography variant="body2" color="#3182CE" sx={{ mb: 1 }}>
                | Question {index + 1}
              </Typography>
              <Typography variant="body1">
                {question.title || "Question Title Here"}
              </Typography>
            </Box>
          ))}

          <Button
            variant="text"
            startIcon={<AddIcon />}
            onClick={handleAddQuestion}
            sx={{
              color: "#3182CE",
              textTransform: "none",
              mt: 2,
            }}
          >
            Add New Question
          </Button>
        </Grid>

        {/* Right Column - Question Editor */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 3,
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              boxShadow: "none",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                Election Title
              </Typography>
              <EditIcon sx={{ color: "#A0AEC0" }} />
            </Box>

            <Box
              sx={{
                mb: 4,
              }}
            >
              <Typography variant="body2" sx={{ mb: 1 }}>
                Election Title
              </Typography>
              <TextField
                fullWidth
                placeholder="Enter election title"
                variant="outlined"
                value={electionTitle}
                onChange={(e) => setElectionTitle(e.target.value)}
                sx={{ mb: 3 }}
              />
            </Box>

            <Box
              sx={{
                width: "100%",
                height: "1px",
                bgcolor: "#E2E8F0",
                mb: 4,
              }}
            />

            <Box
              sx={{
                mb: 4,
                p: 2,
                bgcolor: "#F7FAFC",
                borderRadius: "4px 4px 0 0",
                border: "1px solid #E2E8F0",
                borderBottom: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body1">Question 1</Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                }}
              >
                <IconButton size="small">
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton size="small">
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
                <IconButton size="small">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
                <IconButton size="small">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <Box
              sx={{
                p: 3,
                border: "1px solid #E2E8F0",
                borderRadius: "0 0 4px 4px",
                borderTop: "none",
                mb: 2,
              }}
            >
              <Typography variant="body2" sx={{ mb: 1 }}>
                Question Title
              </Typography>
              <TextField
                fullWidth
                placeholder="Question Title Here"
                variant="outlined"
                value={getCurrentQuestion().title}
                onChange={handleQuestionTitleChange}
                sx={{ mb: 3 }}
              />

              <Typography variant="body2" sx={{ mb: 1 }}>
                Description (optional)
              </Typography>
              <TextField
                fullWidth
                placeholder="Type here"
                variant="outlined"
                multiline
                rows={3}
                sx={{ mb: 3 }}
                value={getCurrentQuestion().description}
                onChange={handleQuestionDescriptionChange}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={allowWriteIn}
                    onChange={(e) => setAllowWriteIn(e.target.checked)}
                  />
                }
                label="Allow write in"
                sx={{ mb: 3 }}
              />

              {getCurrentQuestion().options.map((option, index) => (
                <Box
                  key={index}
                  sx={{ mb: 2, display: "flex", alignItems: "center" }}
                >
                  <TextField
                    fullWidth
                    placeholder="Type here"
                    variant="outlined"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    multiline
                    minRows={1}
                    maxRows={3}
                    onKeyDown={(e) => {
                      // Prevent form submission on Enter key
                      if (e.key === "Enter") {
                        e.stopPropagation();
                      }
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        alignItems: "flex-start",
                        padding: "8px 14px",
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment
                          position="start"
                          sx={{
                            alignSelf: "center",
                          }}
                        >
                          {option.trim() === "" ? (
                            <IconButton
                              size="small"
                              onClick={addEmptyOption}
                              sx={{
                                p: 0,
                                color: "#3182CE",
                                "&:hover": {
                                  backgroundColor: "transparent",
                                },
                              }}
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          ) : (
                            <Typography
                              sx={{
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                bgcolor: "#EDF2F7",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#4A5568",
                              }}
                            >
                              {String.fromCharCode(65 + index)}
                            </Typography>
                          )}
                        </InputAdornment>
                      ),
                      endAdornment: option.trim() !== "" && (
                        <InputAdornment
                          position="end"
                          sx={{
                            alignSelf: "center",
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={() => removeOption(index)}
                            edge="end"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </>
  );

  // Step 2: Set Duration Content
  const renderSetDuration = () => (
    <>
      <Typography variant="h4" sx={{ fontWeight: 500, mb: 6 }}>
        How long will the election run for?
      </Typography>

      <Box sx={{ maxWidth: "960px", mt: 5 }}>
        {/* Duration header with blue dot - moved outside */}
        <Box
          className="section-header-duration"
          sx={{
            p: 2,
            bgcolor: "#F7FAFC",
            borderRadius: "12px 12px 0 0",
            mb: 0,
            width: "100%",
            borderTop: "1px solid #E2E8F0",
            borderLeft: "1px solid #E2E8F0",
            borderRight: "1px solid #E2E8F0",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box
              sx={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                bgcolor: "#3182CE",
                mr: 1.5,
              }}
            />
            <Typography variant="h6" fontWeight={500}>
              Duration
            </Typography>
          </Box>
        </Box>

        <Paper
          sx={{
            p: 6,
            border: "1px solid #E2E8F0",
            borderRadius: "0 0 12px 12px",
            borderTop: "none",
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.05)",
            mb: 4,
            minHeight: "580px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            pt: 0,
          }}
        >
          <Box sx={{ width: "70%", maxWidth: "600px", marginLeft: 0 }}>
            {/* Election Start Time */}
            <Box sx={{ display: "flex", mb: 8 }}>
              <Box sx={{ width: "40%" }}>
                <Typography variant="body1" fontWeight={500} sx={{ mb: 1 }}>
                  Election Start Time
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Set the time and date for when your election will start
                </Typography>
              </Box>

              <Box sx={{ width: "60%" }}>
                <Box
                  sx={{
                    mb: 2,
                    border: "1px solid #E2E8F0",
                    p: 1,
                    borderRadius: "4px",
                    cursor: "pointer",
                    "&:hover": { borderColor: "#CBD5E0" },
                    width: "60%",
                    height: "40px",
                  }}
                  onClick={handleOpenStartDatePicker}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <CalendarTodayIcon
                      fontSize="small"
                      sx={{ color: "#718096", mr: 1 }}
                    />
                    <Typography variant="body2">{startDateStr}</Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    border: "1px solid #E2E8F0",
                    p: 1,
                    borderRadius: "4px",
                    cursor: "pointer",
                    "&:hover": { borderColor: "#CBD5E0" },
                    width: "60%",
                    height: "40px",
                  }}
                  onClick={handleOpenStartTimePicker}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <AccessTimeIcon
                      fontSize="small"
                      sx={{ color: "#718096", mr: 1 }}
                    />
                    <Typography variant="body2">{startTimeStr}</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Election End Time */}
            <Box sx={{ display: "flex", mb: 4 }}>
              <Box sx={{ width: "40%" }}>
                <Typography variant="body1" fontWeight={500} sx={{ mb: 1 }}>
                  Election End Time
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Set the time and date for when your election will end
                </Typography>
              </Box>

              <Box sx={{ width: "60%" }}>
                <Box
                  sx={{
                    mb: 2,
                    border: "1px solid #E2E8F0",
                    p: 1,
                    borderRadius: "4px",
                    cursor: "pointer",
                    "&:hover": { borderColor: "#CBD5E0" },
                    width: "60%",
                    height: "40px",
                  }}
                  onClick={handleOpenEndDatePicker}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <CalendarTodayIcon
                      fontSize="small"
                      sx={{ color: "#718096", mr: 1 }}
                    />
                    <Typography variant="body2">{endDateStr}</Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    border: "1px solid #E2E8F0",
                    p: 1,
                    borderRadius: "4px",
                    cursor: "pointer",
                    "&:hover": { borderColor: "#CBD5E0" },
                    width: "60%",
                    height: "40px",
                  }}
                  onClick={handleOpenEndTimePicker}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <AccessTimeIcon
                      fontSize="small"
                      sx={{ color: "#718096", mr: 1 }}
                    />
                    <Typography variant="body2">{endTimeStr}</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </>
  );

  // Step 3: Select # of Participants Content
  const renderSelectParticipants = () => (
    <>
      <Typography variant="h4" sx={{ fontWeight: 500, mb: 6 }}>
        How many voters can preregister?
      </Typography>

      <Box sx={{ maxWidth: "960px", mt: 5 }}>
        {/* Number of voters header with blue dot - moved outside */}
        <Box
          className="section-header-voters"
          sx={{
            p: 2,
            bgcolor: "#F7FAFC",
            borderRadius: "12px 12px 0 0",
            mb: 0,
            width: "100%",
            borderTop: "1px solid #E2E8F0",
            borderLeft: "1px solid #E2E8F0",
            borderRight: "1px solid #E2E8F0",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: "#3182CE",
                mr: 1.5,
              }}
            />
            <Typography variant="body1" fontWeight={500}>
              Number of voters
            </Typography>
          </Box>
        </Box>

        <Paper
          sx={{
            p: 6,
            border: "1px solid #E2E8F0",
            borderRadius: "0 0 12px 12px",
            borderTop: "none",
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.05)",
            mb: 4,
            minHeight: "340px",
          }}
        >
          {/* 4-container layout */}
          <Grid container spacing={4}>
            {/* Container 1: Left column with voter text */}
            <Grid item xs={12} md={5}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1" fontWeight={500} sx={{ mb: 1 }}>
                  Set the number of voters
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  The cost to run an election depends on the number of voters
                  allowed to preregister.
                </Typography>
              </Box>
            </Grid>

            {/* Container 2: Right column containing containers 3 and 4 */}
            <Grid item xs={12} md={7}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  height: "100%",
                }}
              >
                {/* Container 3: Voter counter */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    mb: 5,
                    width: "300px",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <IconButton
                      onClick={decreaseVoterCount}
                      sx={{ color: "#718096" }}
                    >
                      <RemoveCircleOutlineIcon />
                    </IconButton>

                    <TextField
                      value={voterCount}
                      onChange={handleVoterCountChange}
                      inputProps={{
                        min: 1,
                        style: {
                          textAlign: "center",
                          fontWeight: 500,
                          fontSize: "18px",
                        },
                      }}
                      sx={{
                        width: "80px",
                        mx: 2,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "4px",
                        },
                      }}
                    />

                    <IconButton
                      onClick={increaseVoterCount}
                      sx={{ color: "#718096" }}
                    >
                      <AddCircleOutlineIcon />
                    </IconButton>
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    voters
                  </Typography>
                </Box>

                {/* Divider */}
                <Box
                  sx={{
                    height: "1px",
                    bgcolor: "#E2E8F0",
                    width: "300px",
                    mb: 3,
                  }}
                />

                {/* Container 4: Pricing information */}
                <Box
                  sx={{
                    width: "300px",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography variant="body1" color="text.secondary">
                      Price per voter
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ textAlign: "right", minWidth: "60px" }}
                    >
                      ${pricePerVoter.toFixed(2)}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="body1" fontWeight={500}>
                      Total
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight={500}
                      sx={{ textAlign: "right", minWidth: "60px" }}
                    >
                      ${(voterCount * pricePerVoter).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </>
  );

  // Step 4: Confirm + Pay Content
  const renderConfirmAndPay = () => (
    <>
      <Typography variant="h4" sx={{ fontWeight: 500, mb: 4 }}>
        Confirm + Pay
      </Typography>

      {submitSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Ballot created successfully! Redirecting to My Elections...
        </Alert>
      )}

      {submitError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError}
        </Alert>
      )}

      <Grid
        container
        spacing={3}
        sx={{
          justifyContent: "space-between",
          mb: { xs: 8, md: 10 }, // Add responsive bottom margin
        }}
      >
        {/* Left Column - Review Election Details */}
        <Grid item xs={12} md={5.4} sx={{ width: "45%" }}>
          {/* Styled grey review header */}
          <Box
            className="section-header-review"
            sx={{
              bgcolor: "#F7FAFC",
              p: 2,
              mb: 0,
              borderRadius: "12px 12px 0 0",
              borderBottom: "1px solid #E2E8F0",
              borderTop: "1px solid #E2E8F0",
              borderLeft: "1px solid #E2E8F0",
              borderRight: "1px solid #E2E8F0",
              width: "100%",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  bgcolor: "#3182CE",
                  mr: 1.5,
                }}
              />
              <Typography variant="body1" fontWeight={500}>
                Review your election details
              </Typography>
            </Box>
          </Box>
          <Paper
            sx={{
              p: 4,
              pt: 5,
              border: "1px solid #E2E8F0",
              borderRadius: "0 0 12px 12px",
              borderTop: "none",
              boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.05)",
              height: "75%",
              overflowY: "auto",
            }}
          >
            {/* Content container with reduced width */}
            <Box sx={{ width: "90%", mx: "auto", py: 2 }}>
              {/* Ballot Details */}
              <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                Ballot Details
              </Typography>
              <Box
                sx={{
                  height: "1px",
                  bgcolor: "#E2E8F0",
                  width: "100%",
                  mb: 2,
                }}
              />

              <Box sx={{ mb: 6 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Title:
                  </Typography>
                  <Typography variant="body2">
                    {electionTitle || "Untitled Ballot"}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Ballot:
                  </Typography>
                  <Typography variant="body2">
                    {questions.length} Question
                    {questions.length !== 1 ? "s" : ""}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" fontWeight={600}>
                  Duration
                </Typography>
                <Box
                  sx={{
                    height: "1px",
                    bgcolor: "#E2E8F0",
                    width: "100%",
                    mt: 1,
                    mb: 1,
                  }}
                />
              </Box>

              <Box sx={{ mb: 7 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Starts:
                  </Typography>
                  <Typography variant="body2">
                    {startDateStr}, {startTimeStr}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Ends:
                  </Typography>
                  <Typography variant="body2">
                    {endDateStr}, {endTimeStr}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" fontWeight={600}>
                  Number of Voters
                </Typography>
                <Box
                  sx={{
                    height: "1px",
                    bgcolor: "#E2E8F0",
                    width: "100%",
                    mt: 1,
                    mb: 1,
                  }}
                />
              </Box>

              <Box sx={{ mb: 8 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Voters:
                  </Typography>
                  <Typography variant="body2">
                    {voterCount} voter{voterCount !== 1 ? "s" : ""} x $
                    {pricePerVoter.toFixed(2)}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ pt: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid #E2E8F0",
                    pt: 2,
                  }}
                >
                  <Typography variant="body1" fontWeight={600}>
                    Total Amount:
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    ${totalPrice.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Right Column - Payment Details */}
        <Grid item xs={12} md={6} sx={{ width: "50%" }}>
          {/* Styled grey payment header */}
          <Box
            className="section-header-payment"
            sx={{
              bgcolor: "#F7FAFC",
              p: 2,
              mb: 0,
              borderRadius: "12px 12px 0 0",
              borderBottom: "1px solid #E2E8F0",
              borderTop: "1px solid #E2E8F0",
              borderLeft: "1px solid #E2E8F0",
              borderRight: "1px solid #E2E8F0",
              width: "100%",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  bgcolor: "#3182CE",
                  mr: 1.5,
                }}
              />
              <Typography variant="body1" fontWeight={500}>
                Payment Details
              </Typography>
            </Box>
          </Box>
          <Paper
            sx={{
              p: 4,
              border: "1px solid #E2E8F0",
              borderRadius: "0 0 12px 12px",
              borderTop: "none",
              boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.05)",
              height: "100%",
            }}
          >
            {/* Payment Method */}
            <Typography variant="body1" fontWeight={500} sx={{ mb: 2 }}>
              Payment method
            </Typography>

            <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
              <Box
                sx={{
                  p: 2,
                  border:
                    paymentMethod === "card"
                      ? "2px solid #3182CE"
                      : "1px solid #E2E8F0",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                  width: "50%",
                }}
                onClick={() => setPaymentMethod("card")}
              >
                <CreditCardIcon
                  sx={{ fontSize: 32, color: "#4A5568", mb: 1 }}
                />
                <Typography variant="body2">Card</Typography>
              </Box>

              <Box
                sx={{
                  p: 2,
                  border:
                    paymentMethod === "bank"
                      ? "2px solid #3182CE"
                      : "1px solid #E2E8F0",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                  width: "50%",
                }}
                onClick={() => setPaymentMethod("bank")}
              >
                <AccountBalanceIcon
                  sx={{ fontSize: 32, color: "#4A5568", mb: 1 }}
                />
                <Typography variant="body2">US bank account</Typography>
              </Box>
            </Box>

            {/* Card Holder Name */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight={500} sx={{ mb: 1 }}>
                Card holder name
              </Typography>
              <TextField
                fullWidth
                placeholder="Ex. John Doe"
                variant="outlined"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
              />
            </Box>

            {/* Billing Address */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight={500} sx={{ mb: 1 }}>
                Billing address
              </Typography>
              <Select
                fullWidth
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                displayEmpty
                IconComponent={KeyboardArrowDownIcon}
                sx={{ mb: 2 }}
              >
                <MenuItem value="United States">United States</MenuItem>
                <MenuItem value="Canada">Canada</MenuItem>
                <MenuItem value="United Kingdom">United Kingdom</MenuItem>
              </Select>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                    Zip code
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Ex. 73923"
                    variant="outlined"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                    City
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Ex. New York"
                    variant="outlined"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Billing Address Checkbox */}
            <Box sx={{ mb: 4 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={sameAsShipping}
                    onChange={(e) => setSameAsShipping(e.target.checked)}
                    sx={{
                      color: "#CBD5E0",
                      "&.Mui-checked": {
                        color: "#3182CE",
                      },
                    }}
                  />
                }
                label="Billing address is same as shipping"
              />
            </Box>

            <Box
              sx={{ mt: 4, display: "flex", justifyContent: "space-between" }}
            >
              <Button
                onClick={handleBack}
                sx={{
                  color: "#4A5568",
                  borderColor: "#E2E8F0",
                  textTransform: "none",
                  borderRadius: "4px",
                }}
                variant="outlined"
              >
                Back
              </Button>

              <Button
                variant="contained"
                onClick={submitBallot}
                disabled={isSubmitting || submitSuccess}
                sx={{
                  background:
                    "linear-gradient(90deg, #4478EB 0%, #6FA0FF 100%)",
                  color: "white",
                  textTransform: "none",
                  borderRadius: "4px",
                  minWidth: "150px",
                }}
              >
                {isSubmitting ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  `Submit and Pay $${totalPrice.toFixed(2)}`
                )}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </>
  );

  // Date and Time Picker Dialogs
  const renderDateTimePickerDialogs = () => (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      {/* Start Date Picker Dialog */}
      <Dialog
        open={startDatePickerOpen}
        onClose={() => handleCloseStartDatePicker(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Select Start Date</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <DatePicker
              label="Election Start Date"
              value={startDate}
              onChange={handleStartDateChange}
              renderInput={(params) => <TextField {...params} fullWidth />}
              inputFormat="MMMM d, yyyy"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleCloseStartDatePicker(false)}>
            Cancel
          </Button>
          <Button onClick={() => handleCloseStartDatePicker(true)}>OK</Button>
        </DialogActions>
      </Dialog>

      {/* Start Time Picker Dialog */}
      <Dialog
        open={startTimePickerOpen}
        onClose={() => handleCloseStartTimePicker(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Select Start Time</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <TimePicker
              label="Election Start Time"
              value={combineDateAndTime(startDateStr, startTimeStr)}
              onChange={handleStartTimeChange}
              renderInput={(params) => <TextField {...params} fullWidth />}
              ampm={true}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleCloseStartTimePicker(false)}>
            Cancel
          </Button>
          <Button onClick={() => handleCloseStartTimePicker(true)}>OK</Button>
        </DialogActions>
      </Dialog>

      {/* End Date Picker Dialog */}
      <Dialog
        open={endDatePickerOpen}
        onClose={() => handleCloseEndDatePicker(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Select End Date</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <DatePicker
              label="Election End Date"
              value={endDate}
              onChange={handleEndDateChange}
              renderInput={(params) => <TextField {...params} fullWidth />}
              inputFormat="MMMM d, yyyy"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleCloseEndDatePicker(false)}>
            Cancel
          </Button>
          <Button onClick={() => handleCloseEndDatePicker(true)}>OK</Button>
        </DialogActions>
      </Dialog>

      {/* End Time Picker Dialog */}
      <Dialog
        open={endTimePickerOpen}
        onClose={() => handleCloseEndTimePicker(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Select End Time</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <TimePicker
              label="Election End Time"
              value={combineDateAndTime(endDateStr, endTimeStr)}
              onChange={handleEndTimeChange}
              renderInput={(params) => <TextField {...params} fullWidth />}
              ampm={true}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleCloseEndTimePicker(false)}>
            Cancel
          </Button>
          <Button onClick={() => handleCloseEndTimePicker(true)}>OK</Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );

  return (
    <Box sx={{ p: 4 }}>
      {/* Test Authentication Buttons */}
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          onClick={testAuthentication}
          sx={{ mb: 2 }}
        >
          Test Authentication
        </Button>
        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={debugTokenAuthentication}
          sx={{ mb: 2 }}
        >
          Debug Token
        </Button>
      </Box>

      {/* Stepper */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Box sx={{ width: "70%", display: "flex", alignItems: "center" }}>
          {steps.map((label, index) => (
            <React.Fragment key={label}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  "&:hover": {
                    opacity: 0.8,
                  },
                }}
                onClick={() => setActiveStep(index)}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    bgcolor: index === activeStep ? "#3182CE" : "#E2E8F0",
                    color: index === activeStep ? "white" : "#4A5568",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    mr: 1,
                  }}
                >
                  {index + 1}
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: index === activeStep ? "#3182CE" : "#4A5568",
                    fontWeight: index === activeStep ? 600 : 400,
                  }}
                >
                  {label}
                </Typography>
              </Box>
              {index < steps.length - 1 && (
                <Box
                  sx={{
                    width: "30px",
                    height: "2px",
                    bgcolor: "#94A3B8",
                    mx: 2,
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </Box>

        {activeStep < steps.length - 1 && (
          <Button
            variant="contained"
            onClick={() => {
              if (activeStep < steps.length - 1) {
                setActiveStep(activeStep + 1);
              }
            }}
            sx={{
              bgcolor: "#2D3748",
              color: "#FFFFFF",
              "&:hover": {
                bgcolor: "#1A202C",
              },
              borderRadius: "4px",
              px: 4,
            }}
          >
            Next
          </Button>
        )}
      </Box>

      <Box
        sx={{
          width: "100%",
          height: "2px",
          bgcolor: "#94A3B8",
          mb: 4,
        }}
      />

      {/* Content based on active step */}
      {activeStep === 0 && renderBuildBallot()}
      {activeStep === 1 && renderSetDuration()}
      {activeStep === 2 && renderSelectParticipants()}
      {activeStep === 3 && renderConfirmAndPay()}

      {/* Render date/time picker dialogs */}
      {renderDateTimePickerDialogs()}
    </Box>
  );
};

export default BallotBuilder;
