import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Stepper,
  Step,
  StepLabel,
  Grid,
  IconButton,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Select,
  MenuItem,
  Link,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

const steps = [
  "Build Ballot",
  "Set Duration",
  "Select # of Participants",
  "Confirm + Pay",
];

const BallotBuilder = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(3); // Set to 3 to show Confirm + Pay step by default
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
  const [startDate, setStartDate] = useState("November 5, 2024");
  const [startTime, setStartTime] = useState("12:30 AM");
  const [endDate, setEndDate] = useState("November 12, 2024");
  const [endTime, setEndTime] = useState("12:30 AM");
  const [voterCount, setVoterCount] = useState(10);
  const pricePerVoter = 0.1;
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardholderName, setCardholderName] = useState("");
  const [billingAddress, setBillingAddress] = useState("United States");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [sameAsShipping, setSameAsShipping] = useState(false);

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
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <CalendarTodayIcon
                      fontSize="small"
                      sx={{ color: "#718096", mr: 1 }}
                    />
                    <Typography variant="body2">{startDate}</Typography>
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
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <AccessTimeIcon
                      fontSize="small"
                      sx={{ color: "#718096", mr: 1 }}
                    />
                    <Typography variant="body2">{startTime}</Typography>
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
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <CalendarTodayIcon
                      fontSize="small"
                      sx={{ color: "#718096", mr: 1 }}
                    />
                    <Typography variant="body2">{endDate}</Typography>
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
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <AccessTimeIcon
                      fontSize="small"
                      sx={{ color: "#718096", mr: 1 }}
                    />
                    <Typography variant="body2">{endTime}</Typography>
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
        Final Step!
      </Typography>

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
                    Ballot:
                  </Typography>
                  <Typography variant="body2">x 11 Questions</Typography>
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
                    November 5, 2024, 12:00am
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
                    November 12, 2024, 12:00am
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
                  <Typography variant="body2">10 voters x $ 0.10</Typography>
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
                    $ 1.00
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

            {/* Confirm Button */}
            <Button
              fullWidth
              variant="contained"
              sx={{
                bgcolor: "#2D3748",
                color: "#FFFFFF",
                "&:hover": {
                  bgcolor: "#1A202C",
                },
                borderRadius: "4px",
                py: 1.5,
                mb: 2,
              }}
            >
              Confirm and Pay $1.00
            </Button>

            {/* Terms and Conditions */}
            <Typography
              variant="body2"
              align="center"
              sx={{ color: "#718096" }}
            >
              By clicking "Confirm and Pay," you agree to our{" "}
              <Link href="#" underline="hover" color="inherit" fontWeight={500}>
                Terms and Conditions
              </Link>
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </>
  );

  return (
    <Box sx={{ p: 4 }}>
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
    </Box>
  );
};

export default BallotBuilder;
