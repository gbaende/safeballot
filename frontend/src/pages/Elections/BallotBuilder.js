import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  TextField,
  MenuItem,
  FormControlLabel,
  IconButton,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Checkbox,
  Switch,
  InputAdornment,
  Tooltip,
  Menu,
  Select,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  ContentCopy as ContentCopyIcon,
  AccessTime as AccessTimeIcon,
  CalendarToday as CalendarTodayIcon,
  RemoveCircleOutline as RemoveCircleOutlineIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as AccountBalanceIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  FormatColorText as FormatColorTextIcon,
  Error as ErrorIcon,
  PhotoCamera as PhotoCameraIcon,
} from "@mui/icons-material";
import { format, isValid, parse } from "date-fns";
import {
  LocalizationProvider,
  DatePicker,
  TimePicker,
} from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import {
  ballotService,
  electionService,
  stripeService,
} from "../../services/api";

// Import Mock Payment component
import MockPaymentForm from "../../components/MockPaymentForm";
import TextareaAutosize from "@mui/material/TextareaAutosize";
import {
  compressMultipleImages,
  formatFileSize,
} from "../../utils/imageCompression";
import { copyToClipboard } from "../../utils/clipboard";

const steps = [
  "Build Ballot",
  "Set Duration",
  "Select # of Participants",
  "Confirm + Pay",
];

// Helper function to combine date and time strings into a JS Date object.
// Declared **outside** the component so it is hoisted and available before first render.
export function combineDateAndTime(dateStr, timeStr) {
  try {
    if (process.env.NODE_ENV === "development") {
      console.log("Combining date:", dateStr, "and time:", timeStr);
    }

    // Parse the date string (e.g. "January 1, 2024")
    const datePart = parse(dateStr, "MMMM d, yyyy", new Date());
    if (process.env.NODE_ENV === "development") {
      console.log("Parsed date part:", datePart);
    }

    // Extract hours and minutes from time string (e.g. "3:45 PM")
    const timeMatch = timeStr.match(/(\d+):(\d+)\s+(AM|PM)/i);
    if (!timeMatch) {
      console.error("Invalid time format:", timeStr);
      return new Date();
    }

    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const isPM = timeMatch[3].toUpperCase() === "PM";

    // Convert to 24-hour format
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;

    // Create the combined date
    const result = new Date(datePart);
    result.setHours(hours, minutes, 0, 0);

    if (process.env.NODE_ENV === "development") {
      console.log("Final combined date:", result);
    }

    return result;
  } catch (error) {
    console.error("Error parsing date and time:", error);
    return new Date();
  }
}

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
  const [quickBallot, setQuickBallot] = useState(false);
  const [useSDFCBrand, setUseSDFCBrand] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [startDateStr, setStartDateStr] = useState(
    format(new Date(), "MMMM d, yyyy")
  );
  const [startTimeStr, setStartTimeStr] = useState(
    format(new Date(), "h:mm a")
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ); // Default: 1 week from now
  const [endDateStr, setEndDateStr] = useState(
    format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "MMMM d, yyyy")
  );
  const [endTimeStr, setEndTimeStr] = useState(format(new Date(), "h:mm a"));

  const [voterCount, setVoterCount] = useState(10);
  const pricePerVoter = 0.5;
  const [totalPrice, setTotalPrice] = useState(1.0);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardholderName, setCardholderName] = useState("");
  const [billingAddress, setBillingAddress] = useState("United States");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");

  // Add state for controlling date/time picker dialogs
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
  const [startTimePickerOpen, setStartTimePickerOpen] = useState(false);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  const [endTimePickerOpen, setEndTimePickerOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentClientSecret, setPaymentClientSecret] = useState(null);

  // Add a state variable to track greyified lines for each question
  const [greyifiedLines, setGreyifiedLines] = useState({});

  // Store uploaded images keyed by questionId_optionIndex
  const [optionImages, setOptionImages] = useState({});

  // Handle image upload for an option
  const handleOptionImageChange = (questionId, optionIndex, event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const key = `${questionId}_${optionIndex}`;
    const preview = URL.createObjectURL(file);

    setOptionImages((prev) => ({
      ...prev,
      [key]: { file, preview },
    }));
  };

  // Convert file object to base64 string
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Memoized combined Date objects to avoid recomputation on every render
  const startDateTimeCombined = useMemo(
    () => combineDateAndTime(startDateStr, startTimeStr),
    [startDateStr, startTimeStr]
  );

  const endDateTimeCombined = useMemo(
    () => combineDateAndTime(endDateStr, endTimeStr),
    [endDateStr, endTimeStr]
  );

  // Function to toggle whether a line is greyified
  const toggleGreyifyLine = (questionId, optionIndex, lineIndex) => {
    setGreyifiedLines((prev) => {
      // Create a unique key for tracking this specific line
      const key = `${questionId}_${optionIndex}_${lineIndex}`;

      // Toggle the current state
      return {
        ...prev,
        [key]: !prev[key],
      };
    });
  };

  // Helper function to get if a line is greyified
  const isLineGreyified = (questionId, optionIndex, lineIndex) => {
    const key = `${questionId}_${optionIndex}_${lineIndex}`;
    return greyifiedLines[key] || false;
  };

  // Calculate the total price whenever voter count changes
  useEffect(() => {
    const validVoterCount =
      typeof voterCount === "string"
        ? parseInt(voterCount, 10) || 1
        : voterCount || 1;
    const calculatedPrice = (validVoterCount * pricePerVoter).toFixed(2);
    setTotalPrice(parseFloat(calculatedPrice));
  }, [voterCount, pricePerVoter]);

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
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
    if (currentQuestionId) {
      const currentQuestion = getCurrentQuestion();
      const updatedOptions = [...currentQuestion.options];
      updatedOptions[index] = value;

      // If this is the last option and it's not empty, add a new empty option
      if (index === updatedOptions.length - 1 && value.trim() !== "") {
        updatedOptions.push("");
      }

      setQuestions(
        questions.map((q) =>
          q.id === currentQuestionId ? { ...q, options: updatedOptions } : q
        )
      );
    }
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
    const inputValue = e.target.value;

    // Allow empty string for editing
    if (inputValue === "") {
      setVoterCount("");
      return;
    }

    const value = parseInt(inputValue, 10);
    if (!isNaN(value) && value >= 1) {
      setVoterCount(value);
    }
  };

  const decreaseVoterCount = () => {
    setVoterCount((prevCount) => {
      const currentCount =
        typeof prevCount === "string"
          ? parseInt(prevCount, 10) || 1
          : prevCount;
      return Math.max(1, currentCount - 1);
    });
  };

  const increaseVoterCount = () => {
    setVoterCount((prevCount) => {
      const currentCount =
        typeof prevCount === "string"
          ? parseInt(prevCount, 10) || 1
          : prevCount;
      return currentCount + 1;
    });
  };

  // Handle blur event to ensure valid value
  const handleVoterCountBlur = () => {
    if (typeof voterCount === "string" || voterCount < 1) {
      setVoterCount(1);
    }
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

  // Create a function to get Stripe payment intent
  const createPaymentIntent = async () => {
    if (totalPrice <= 0) return null;

    try {
      setIsSubmitting(true);
      // Create a payment intent with the current total price
      const clientSecret = await stripeService.createPaymentIntent(totalPrice);

      if (clientSecret) {
        setPaymentClientSecret(clientSecret);
        return clientSecret;
      } else {
        console.error("No client secret returned from payment intent creation");
        setPaymentError("Failed to initialize payment. Please try again.");
        return null;
      }
    } catch (err) {
      console.error("Error creating payment intent:", err);
      setPaymentError(
        "Failed to initialize payment system. Please try again later."
      );
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Payment intent creation disabled - bypassing payment for development
  // useEffect(() => {
  //   if (activeStep === 3 && totalPrice > 0 && !paymentClientSecret) {
  //     createPaymentIntent();
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [activeStep, totalPrice, paymentClientSecret]);

  // Update the submitBallot function to handle Stripe payment with Payment Intents
  const submitBallot = async (paymentIntent, paymentMethod) => {
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
      const formattedQuestions = (
        await Promise.all(
          questions.map(async (q) => {
            const validOptions = q.options.filter((option) =>
              typeof option === "string" ? option.trim() !== "" : true
            );

            // Create properly formatted choices array from options, including compressed images if uploaded
            const choices = await Promise.all(
              validOptions.map(async (optionText, index) => {
                const key = `${q.id}_${index}`;
                let imageData = undefined;
                if (optionImages[key]?.file) {
                  try {
                    // Compress image before converting to base64
                    const { compressedImages } = await compressMultipleImages(
                      { [key]: optionImages[key] },
                      {
                        maxWidth: 600,
                        maxHeight: 400,
                        quality: 0.6,
                        format: "image/jpeg",
                      }
                    );
                    imageData = compressedImages[key]?.compressedData;

                    if (imageData) {
                      console.log(
                        `Compressed image for ${key}: ${formatFileSize(
                          compressedImages[key].compressedSize
                        )}`
                      );
                    }
                  } catch (e) {
                    console.error("Error compressing image", e);
                    // Fallback to original method
                    try {
                      imageData = await fileToBase64(optionImages[key].file);
                    } catch (fallbackError) {
                      console.error(
                        "Error converting file to base64",
                        fallbackError
                      );
                    }
                  }
                }

                return {
                  text: optionText,
                  description: "",
                  order: index,
                  image: imageData,
                };
              })
            );

            return {
              title: q.title || "Untitled Question",
              description: q.description || "",
              questionType: "single_choice",
              maxSelections: 1,
              choices: choices, // This is the key change - backend expects 'choices', not 'options'
              allow_write_in: allowWriteIn,
            };
          })
        )
      ).filter((q) => q.choices.length > 0); // Only include questions with at least one choice

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

        // Quick ballot flag – enables anonymous voting flow on the backend
        quickBallot: quickBallot,
        brand: useSDFCBrand ? "sdfc" : undefined,

        // These start at zero - they're the runtime counters
        totalVoters: 0, // Number of registered voters
        total_voters: 0, // Same as above (snake_case)
        ballotsReceived: 0, // Number of votes cast
        ballots_received: 0, // Same as above (snake_case)
      };

      // If we have a payment method ID from Stripe, add it to the data
      if (paymentIntent && paymentMethod) {
        ballotData.paymentIntentId = paymentIntent.id;
        ballotData.paymentMethodId = paymentMethod.id;
        ballotData.paymentAmount = totalPrice;
        ballotData.paymentStatus = "completed";
      }

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

            // Ensure quickBallot flag is present when creating shareable link
            const ballotForLink = {
              ...response.data.data,
              quickBallot: ballotData.quickBallot,
              brand: ballotData.brand,
            };

            const newBallot = {
              ...ballotForLink,
              shareableLink: generateShareableLink(ballotForLink),
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
          const apiUrl =
            process.env.NODE_ENV === "production"
              ? "/api"
              : "http://localhost:8080/api";
          const response = await fetch(`${apiUrl}/ballots`, {
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

              // Ensure quickBallot flag is present when creating shareable link
              const ballotForLink2 = {
                ...(responseData.data || {}),
                quickBallot: ballotData.quickBallot,
                brand: ballotData.brand,
                id: responseData.data?.id || uuidv4(),
                title: ballotData.title,
              };

              const newBallot = {
                ...ballotForLink2,
                ...ballotData,
                status: "scheduled",
                created_at: new Date().toISOString(),
                shareableLink: generateShareableLink(ballotForLink2),
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
      setPaymentError(error.message || "Payment processing failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to generate a shareable link
  const generateShareableLink = (ballot) => {
    const baseUrl = window.location.origin;
    const slug = (ballot.title || "Untitled Ballot")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const idPart = ballot.id.toString().substring(0, 8);

    if (ballot.quickBallot) {
      const brandPrefix = ballot.brand
        ? `/${ballot.brand}`
        : useSDFCBrand
        ? "/sdfc"
        : "";
      console.log("[SHARE LINK] quickBallot brand check", {
        brand: ballot.brand,
        useSDFCBrand,
        brandPrefix,
      });
      return `${baseUrl}${brandPrefix}/vote/${ballot.id}/${slug}-${idPart}`;
    }

    return `${baseUrl}/voter-registration/${ballot.id}/${slug}-${idPart}`;
  };

  // Step 1: Build Ballot Content
  const renderBuildBallot = () => (
    <>
      <Typography variant="h4" sx={{ fontWeight: 500, mb: 4 }}>
        Build Ballot
      </Typography>

      <Grid container spacing={{ xs: 2, md: 4 }}>
        {/* Left Column - Content Sidebar */}
        <Grid item xs={12} md={4}>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              fontWeight: 600,
              fontSize: { xs: "1.1rem", md: "1.25rem" },
            }}
          >
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
              p: { xs: 2, sm: 3 },
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
                flexDirection: { xs: "column", sm: "row" },
                gap: { xs: 1, sm: 0 },
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 500,
                  fontSize: { xs: "1.1rem", md: "1.25rem" },
                }}
              >
                Election Title
              </Typography>
              <EditIcon
                sx={{ color: "#A0AEC0", display: { xs: "none", sm: "block" } }}
              />
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

              {/* Quick Voting toggle */}
              <FormControlLabel
                control={
                  <Switch
                    checked={quickBallot}
                    onChange={(e) => {
                      setQuickBallot(e.target.checked);
                      if (!e.target.checked) {
                        // If quick voting is disabled, also disable SDFC brand toggle
                        setUseSDFCBrand(false);
                      }
                    }}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Enable Quick Voting</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Allow voters to cast their vote without registration or
                      verification
                    </Typography>
                  </Box>
                }
                sx={{ mb: 2 }}
              />

              {/* SDFC branding toggle – only meaningful when quick voting */}
              <FormControlLabel
                sx={{ alignItems: "flex-start", mb: 2, ml: 0 }}
                control={
                  <Switch
                    checked={useSDFCBrand}
                    onChange={(e) => setUseSDFCBrand(e.target.checked)}
                    color="primary"
                    disabled={!quickBallot}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">
                      San Diego FC Branding
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Prepend /sdfc to the quick-vote link and show club
                      branding
                    </Typography>
                  </Box>
                }
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
                p: { xs: 1.5, sm: 2 },
                bgcolor: "#F7FAFC",
                borderRadius: "4px 4px 0 0",
                border: "1px solid #E2E8F0",
                borderBottom: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexDirection: { xs: "column", sm: "row" },
                gap: { xs: 1, sm: 0 },
              }}
            >
              <Typography
                variant="body1"
                sx={{ fontSize: { xs: "0.9rem", md: "1rem" } }}
              >
                Question 1
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: { xs: 0.5, sm: 1 },
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
                p: { xs: 2, sm: 3 },
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
                  sx={{ mb: 2, display: "flex", flexDirection: "column" }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <TextField
                      fullWidth
                      placeholder="Type here"
                      variant="outlined"
                      value={option}
                      onChange={(e) =>
                        handleOptionChange(index, e.target.value)
                      }
                      multiline
                      minRows={1}
                      maxRows={3}
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
                            sx={{ alignSelf: "center" }}
                          >
                            {option.trim() === "" ? (
                              <IconButton
                                size="small"
                                onClick={addEmptyOption}
                                sx={{
                                  p: 0,
                                  color: "#3182CE",
                                  "&:hover": { backgroundColor: "transparent" },
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
                            sx={{ alignSelf: "center" }}
                          >
                            <IconButton
                              size="small"
                              component="label"
                              sx={{ mr: 0.5 }}
                            >
                              <PhotoCameraIcon fontSize="small" />
                              <input
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) =>
                                  handleOptionImageChange(
                                    currentQuestionId,
                                    index,
                                    e
                                  )
                                }
                              />
                            </IconButton>
                            <GreyifyButton
                              option={option}
                              questionId={currentQuestionId}
                              optionIndex={index}
                            />
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

                  {/* Preview image if uploaded */}
                  {optionImages[`${currentQuestionId}_${index}`]?.preview && (
                    <Box sx={{ mt: 1 }}>
                      <img
                        src={
                          optionImages[`${currentQuestionId}_${index}`].preview
                        }
                        alt="preview"
                        style={{
                          width: "80px",
                          height: "80px",
                          objectFit: "cover",
                          borderRadius: "4px",
                        }}
                      />
                    </Box>
                  )}
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
      <Typography
        variant="h4"
        sx={{
          fontWeight: 500,
          mb: { xs: 3, md: 6 },
          fontSize: { xs: "1.5rem", md: "2.125rem" },
        }}
      >
        How long will the election run for?
      </Typography>

      <Box sx={{ maxWidth: "960px", mt: { xs: 2, md: 5 } }}>
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
            p: { xs: 3, sm: 4, md: 6 },
            border: "1px solid #E2E8F0",
            borderRadius: "0 0 12px 12px",
            borderTop: "none",
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.05)",
            mb: 4,
            minHeight: { xs: "auto", md: "580px" },
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            pt: 0,
          }}
        >
          <Box
            sx={{
              width: { xs: "100%", md: "70%" },
              maxWidth: "600px",
              marginLeft: 0,
            }}
          >
            {/* Election Start Time */}
            <Box
              sx={{
                display: "flex",
                mb: { xs: 4, md: 8 },
                flexDirection: { xs: "column", md: "row" },
                gap: { xs: 2, md: 0 },
              }}
            >
              <Box sx={{ width: { xs: "100%", md: "40%" } }}>
                <Typography
                  variant="body1"
                  fontWeight={500}
                  sx={{ mb: 1, fontSize: { xs: "0.9rem", md: "1rem" } }}
                >
                  Election Start Time
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: { xs: "0.8rem", md: "0.875rem" } }}
                >
                  Set the time and date for when your election will start
                </Typography>
              </Box>

              <Box sx={{ width: { xs: "100%", md: "60%" } }}>
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
            p: { xs: 3, sm: 4, md: 6 },
            border: "1px solid #E2E8F0",
            borderRadius: "0 0 12px 12px",
            borderTop: "none",
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.05)",
            mb: 4,
            minHeight: { xs: "auto", md: "340px" },
          }}
        >
          {/* 4-container layout */}
          <Grid container spacing={{ xs: 3, md: 4 }}>
            {/* Container 1: Left column with voter text */}
            <Grid item xs={12} md={5}>
              <Box sx={{ mb: { xs: 3, md: 2 } }}>
                <Typography
                  variant="body1"
                  fontWeight={500}
                  sx={{ mb: 1, fontSize: { xs: "0.9rem", md: "1rem" } }}
                >
                  Set the number of voters
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: { xs: "0.8rem", md: "0.875rem" } }}
                >
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
                      onBlur={handleVoterCountBlur}
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
                      $
                      {(() => {
                        const validVoterCount =
                          typeof voterCount === "string"
                            ? parseInt(voterCount, 10) || 1
                            : voterCount || 1;
                        return (validVoterCount * pricePerVoter).toFixed(2);
                      })()}
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

  // Handle successful payment from mock form
  const handlePaymentSuccess = (paymentIntent) => {
    console.log("Mock payment successful:", paymentIntent);
    submitBallot(paymentIntent, paymentIntent.payment_method);
  };

  // Handle payment error from mock form
  const handlePaymentError = (error) => {
    console.error("Mock payment error:", error);
    setPaymentError(error.message || "Payment failed. Please try again.");
  };

  // Update the renderConfirmAndPay function to include Stripe elements
  const renderConfirmAndPay = () => (
    <>
      <Typography variant="h4" sx={{ fontWeight: 500, mb: 4 }}>
        Confirm & Create Ballot
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
          justifyContent: "center",
          mb: { xs: 8, md: 10 },
        }}
      >
        {/* Single Column - Review Election Details */}
        <Grid item xs={12} md={8}>
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
              minHeight: "400px",
            }}
          >
            {/* Content container */}
            <Box sx={{ width: "100%", mx: "auto", py: 2 }}>
              {/* Ballot Details */}
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Ballot Details
              </Typography>
              <Box
                sx={{
                  height: "1px",
                  bgcolor: "#E2E8F0",
                  width: "100%",
                  mb: 3,
                }}
              />

              <Grid container spacing={4} sx={{ mb: 4 }}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Title:
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {electionTitle || "Untitled Ballot"}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Questions:
                    </Typography>
                    <Typography variant="body1">
                      {questions.length} Question
                      {questions.length !== 1 ? "s" : ""}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Voters:
                    </Typography>
                    <Typography variant="body1">
                      {voterCount} voter{voterCount !== 1 ? "s" : ""}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Starts:
                    </Typography>
                    <Typography variant="body1">
                      {startDateStr}, {startTimeStr}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Ends:
                    </Typography>
                    <Typography variant="body1">
                      {endDateStr}, {endTimeStr}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Quick Voting:
                    </Typography>
                    <Typography variant="body1">
                      {quickBallot ? "Enabled" : "Disabled"}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Payment Form */}
              <Box sx={{ mt: 4 }}>
                <MockPaymentForm
                  amount={totalPrice}
                  currency="USD"
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  onBack={handleBack}
                  isSubmitting={isSubmitting}
                />
              </Box>
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
              value={startDateTimeCombined}
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
              value={endDateTimeCombined}
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

  // Add the GreyifyButton component
  const GreyifyButton = ({ option, questionId, optionIndex }) => {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [lines, setLines] = React.useState([]);

    // Handle opening the line selection menu
    const handleClick = (event) => {
      event.stopPropagation();
      // Split the text into lines
      const textLines = option.split("\n");
      setLines(textLines);
      setAnchorEl(event.currentTarget);
    };

    // Handle closing the line selection menu
    const handleClose = () => {
      setAnchorEl(null);
    };

    // Handle toggling the grey state of a specific line
    const handleLineToggle = (lineIndex) => {
      toggleGreyifyLine(questionId, optionIndex, lineIndex);
      handleClose();
    };

    // Generate menu items for each line
    const menuItems = lines.map((line, index) => (
      <MenuItem
        key={index}
        onClick={() => handleLineToggle(index)}
        sx={{
          color: isLineGreyified(questionId, optionIndex, index)
            ? "#9ca3af"
            : "inherit",
          fontSize: "0.875rem",
        }}
      >
        {line.length > 20
          ? line.substring(0, 20) + "..."
          : line || "(Empty line)"}
      </MenuItem>
    ));

    return (
      <>
        <Tooltip title="Toggle line color">
          <IconButton
            size="small"
            onClick={handleClick}
            edge="end"
            sx={{ mr: 1 }}
          >
            <FormatColorTextIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          <MenuItem disabled sx={{ fontSize: "0.75rem", opacity: 0.7 }}>
            Select line to toggle grey
          </MenuItem>
          <Divider />
          {menuItems.length > 0 ? (
            menuItems
          ) : (
            <MenuItem disabled>No lines available</MenuItem>
          )}
        </Menu>
      </>
    );
  };

  // Function to render styled option text
  const renderStyledOptionText = (option, questionId, optionIndex) => {
    if (!option) return [];

    // Split text into lines
    const lines = option.split("\n");

    // Return an array of styled line components
    return lines.map((line, lineIndex) => {
      const isGrey = isLineGreyified(questionId, optionIndex, lineIndex);

      return (
        <div
          key={lineIndex}
          style={{
            color: isGrey ? "#9ca3af" : "inherit",
            marginBottom: lineIndex < lines.length - 1 ? "0.25rem" : 0,
          }}
        >
          {line || " "} {/* Use a space if line is empty to maintain height */}
        </div>
      );
    });
  };

  // Create a custom input component to display styled text
  const StyledOptionInput = React.forwardRef(
    ({ value, onChange, questionId, optionIndex, ...props }, ref) => {
      // Simply use a normal TextField with multiline property
      return (
        <Box sx={{ width: "100%" }}>
          <TextField
            ref={ref}
            value={value}
            onChange={onChange}
            multiline
            minRows={1}
            maxRows={5}
            fullWidth
            variant="outlined"
            {...props}
          />

          {/* Render preview of styled text below */}
          <Box sx={{ mt: 1 }}>
            {value.split("\n").map((line, lineIndex) => (
              <div
                key={lineIndex}
                style={{
                  color: isLineGreyified(questionId, optionIndex, lineIndex)
                    ? "#9ca3af"
                    : "inherit",
                  fontStyle: isLineGreyified(questionId, optionIndex, lineIndex)
                    ? "italic"
                    : "normal",
                  fontSize: "0.875rem",
                  minHeight: "1.2em",
                  marginBottom: "0.25rem",
                }}
              >
                {line || "\u00A0"}
              </div>
            ))}
          </Box>
        </Box>
      );
    }
  );

  return (
    <Box sx={{ p: 4 }}>
      {/* Removed static 'Ballot 3' header */}
      {/* Stepper */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
            overflowX: "auto",
            pr: 2,
          }}
        >
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
              background: "linear-gradient(to right, #080E1D, #263C75)",
              color: "#FFFFFF",
              "&:hover": {
                background: "linear-gradient(to right, #050912, #1d2e59)",
              },
              borderRadius: "4px",
              px: 4,
              whiteSpace: "nowrap",
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
