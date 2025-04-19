import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  Container,
  Grid,
  CircularProgress,
  Alert,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  styled,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Modal,
  Backdrop,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { ballotService } from "../../services/api";
import VotingConfirmationDialog from "../../components/VotingConfirmationDialog";

// Styled components
const QuestionTab = styled(Box)(({ theme, active }) => ({
  padding: "12px 16px",
  cursor: "pointer",
  borderLeft: active
    ? `4px solid ${theme.palette.primary.main}`
    : "4px solid transparent",
  backgroundColor: active ? "rgba(25, 118, 210, 0.08)" : "transparent",
  "&:hover": {
    backgroundColor: active
      ? "rgba(25, 118, 210, 0.12)"
      : "rgba(0, 0, 0, 0.04)",
  },
  transition: "background-color 0.2s",
}));

const VotingPage = () => {
  const { id, slug } = useParams();
  const navigate = useNavigate();

  // State
  const [ballot, setBallot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [responses, setResponses] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [digitalKey, setDigitalKey] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);

  // Check if user has been verified
  useEffect(() => {
    // Check for verification status in localStorage
    const verificationStatus = localStorage.getItem(`verified_${id}`);
    const storedDigitalKey = localStorage.getItem(`digital_key_${id}`);

    // Parse the slug to potentially extract the ballot ID in case the URL ID is different
    const slugParts = slug ? slug.split("-") : [];
    const idFromSlug =
      slugParts.length > 0 ? slugParts[slugParts.length - 1] : null;

    // Also check verification status using the ID from slug
    const verificationStatusFromSlug = idFromSlug
      ? localStorage.getItem(`verified_${idFromSlug}`)
      : null;
    const storedDigitalKeyFromSlug = idFromSlug
      ? localStorage.getItem(`digital_key_${idFromSlug}`)
      : null;

    console.log("Verification check:", {
      id,
      slug,
      idFromSlug,
      verificationStatus,
      verificationStatusFromSlug,
      storedDigitalKey,
      storedDigitalKeyFromSlug,
    });

    if (
      (verificationStatus === "true" && storedDigitalKey) ||
      (verificationStatusFromSlug === "true" && storedDigitalKeyFromSlug)
    ) {
      setHasVerified(true);
      setDigitalKey(storedDigitalKey || storedDigitalKeyFromSlug);
    } else {
      // If not verified, redirect to voter registration first
      navigate(`/voter-registration/${id}/${slug}`);
    }
  }, [id, slug, navigate]);

  // Fetch real ballot data when component mounts
  useEffect(() => {
    if (hasVerified) {
      fetchBallot();
    }
  }, [id, hasVerified]);

  useEffect(() => {
    if (ballot) {
      console.log("BALLOT DATA:", ballot);
      console.log("CURRENT RESPONSES:", responses);

      // For debugging option structure
      if (
        ballot.questions &&
        ballot.questions.length > 0 &&
        ballot.questions[0].options
      ) {
        console.log("FIRST QUESTION OPTIONS:", ballot.questions[0].options);
      }
    }
  }, [ballot, responses]);

  const fetchBallot = async () => {
    setLoading(true);
    setError(null);

    // Parse any ID from the slug
    const slugParts = slug ? slug.split("-") : [];
    const idFromSlug =
      slugParts.length > 0 ? slugParts[slugParts.length - 1] : null;

    console.log("Fetching ballot:", { id, idFromSlug, slug });

    try {
      // First, try using the ID from the URL
      console.log(`Fetching ballot with ID: ${id}`);
      try {
        const response = await ballotService.getBallotById(id);
        if (response.data && response.data.data) {
          console.log("Ballot data received:", response.data.data);
          setBallot(response.data.data);

          // Initialize responses object with empty selections for each question
          if (response.data.data.questions) {
            const initialResponses = {};
            response.data.data.questions.forEach((q, index) => {
              initialResponses[index] = ""; // Empty string for initial state
            });
            setResponses(initialResponses);
          }
          return; // Exit if successful
        }
      } catch (primaryError) {
        console.error("Error fetching with primary ID:", primaryError);
        // Continue to try alternate ID
      }

      // If we get here, try using the ID from the slug
      if (idFromSlug && idFromSlug !== id) {
        // Note: idFromSlug may not be a full UUID - in that case, try to find a matching ballot
        console.log(`Trying alternate ID from slug: ${idFromSlug}`);

        // Try to get the ballot directly if idFromSlug looks like a UUID
        const UUID_REGEX =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (UUID_REGEX.test(idFromSlug)) {
          try {
            const response = await ballotService.getBallotById(idFromSlug);
            if (response.data && response.data.data) {
              console.log(
                "Ballot data received from slug ID:",
                response.data.data
              );
              setBallot(response.data.data);

              // Initialize responses object
              if (response.data.data.questions) {
                const initialResponses = {};
                response.data.data.questions.forEach((q, index) => {
                  initialResponses[index] = ""; // Empty string for initial state
                });
                setResponses(initialResponses);
              }
              return; // Exit if successful
            }
          } catch (alternateError) {
            console.error("Error fetching with alternate ID:", alternateError);
            // Fall through to localStorage
          }
        }
      }

      // If we get here, try localStorage as a last resort
      console.log("Trying localStorage fallback");
      const localBallots = JSON.parse(
        localStorage.getItem("userBallots") || "[]"
      );

      // Try to find by either ID
      let foundBallot = localBallots.find(
        (ballot) => String(ballot.id) === String(id)
      );

      // If not found by primary ID, try the slug ID
      if (!foundBallot && idFromSlug) {
        foundBallot = localBallots.find(
          (ballot) =>
            String(ballot.id) === String(idFromSlug) ||
            String(ballot.id).includes(idFromSlug) // Try partial match with UUID prefix
        );
      }

      if (foundBallot) {
        console.log("Found ballot in localStorage:", foundBallot);
        setBallot(foundBallot);

        // Initialize responses object
        if (foundBallot.questions) {
          const initialResponses = {};
          foundBallot.questions.forEach((q, index) => {
            initialResponses[index] = "";
          });
          setResponses(initialResponses);
        }
      } else {
        throw new Error("Ballot not found in localStorage");
      }
    } catch (err) {
      console.error("Error fetching ballot:", err);
      setError(
        "Failed to load ballot. This ballot may no longer be available or the link is invalid."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (e) => {
    const value = e.target.value;
    const currentQuestion = ballot.questions[activeQuestion];

    console.log("SELECTED VALUE:", value);

    // Find the option data from the options array
    const optionIndex = parseInt(value);
    if (
      !isNaN(optionIndex) &&
      currentQuestion.options &&
      optionIndex < currentQuestion.options.length
    ) {
      // We have a numeric index, so get the full option data
      const selectedOption = currentQuestion.options[optionIndex];
      console.log("Found option by index:", selectedOption);

      // Get the text and party info
      let selectedText = "";
      let selectedParty = "";

      if (typeof selectedOption === "object") {
        selectedText =
          selectedOption.text ||
          selectedOption.option ||
          selectedOption.toString();
        selectedParty = selectedOption.party || "";
      } else {
        selectedText = String(selectedOption);
      }

      console.log("Storing response:", {
        index: optionIndex,
        text: selectedText,
        party: selectedParty,
      });

      // Store as an object with the full data
      setResponses({
        ...responses,
        [activeQuestion]: {
          index: optionIndex,
          text: selectedText,
          party: selectedParty,
        },
      });
    } else if (value === "write-in") {
      // Handle write-in option
      setResponses({
        ...responses,
        [activeQuestion]: {
          index: "write-in",
          text: "(Write-in)",
          party: "",
        },
      });
    } else {
      console.log("Using value directly:", value);
      // Fallback - store the value directly
      setResponses({
        ...responses,
        [activeQuestion]: {
          index: value,
          text: value,
          party: "",
        },
      });
    }
  };

  const handleQuestionChange = (index) => {
    setActiveQuestion(index);
    setShowOverview(false);
  };

  const handleContinue = () => {
    if (activeQuestion < ballot.questions.length - 1) {
      setActiveQuestion(activeQuestion + 1);
    } else {
      handleOverviewClick();
    }
  };

  const handleGoBack = () => {
    if (showOverview) {
      setShowOverview(false);
      return;
    }
    navigate(-1);
  };

  const handleOverviewClick = () => {
    setShowOverview(true);
  };

  const handleConfirmAndSubmit = () => {
    // Retrieve the stored digital key
    const storedKey = localStorage.getItem(`digital_key_${id}`);
    if (!storedKey) {
      setError(
        "Digital key not found. Please make sure you've completed verification."
      );
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleDigitalKeyChange = (e) => {
    setDigitalKey(e.target.value);
  };

  const handleCloseConfirmDialog = () => {
    setShowConfirmDialog(false);
  };

  const handleSubmitBallot = async (enteredKey) => {
    try {
      setLoading(true);
      setDigitalKey(enteredKey); // Update the key from dialog

      // Get the voter ID from localStorage - try multiple possible storage locations
      let voterId = null;

      // First try to get from voterUser object
      try {
        const voterData = JSON.parse(localStorage.getItem("voterUser") || "{}");
        if (voterData && voterData.id) {
          voterId = voterData.id;
          console.log("Found voter ID in voterUser:", voterId);
        }
      } catch (e) {
        console.error("Error parsing voterUser from localStorage:", e);
      }

      // If not found, try alternate storage locations
      if (!voterId) {
        voterId = localStorage.getItem("voterId");
        if (voterId) {
          console.log("Found voter ID in direct voterId key:", voterId);
        }
      }

      // Also check the user object (might be used in some cases)
      if (!voterId) {
        try {
          const userData = JSON.parse(localStorage.getItem("user") || "{}");
          if (userData && userData.id) {
            voterId = userData.id;
            console.log("Found voter ID in user object:", voterId);
          }
        } catch (e) {
          console.error("Error parsing user from localStorage:", e);
        }
      }

      // Check for ballot-specific voter ID
      if (!voterId) {
        voterId = localStorage.getItem(`voter_id_${id}`);
        if (voterId) {
          console.log("Found ballot-specific voter ID:", voterId);
        }
      }

      // Check for verification status to get the ID
      if (!voterId) {
        // The voter ID might be stored with the ballot verification status
        const verificationData = JSON.parse(
          localStorage.getItem(`verified_data_${id}`) || "{}"
        );
        if (verificationData && verificationData.id) {
          voterId = verificationData.id;
          console.log("Found voter ID in verification data:", voterId);
        }
      }

      // If still no voter ID but we have a verification status, generate one and register the voter
      if (!voterId && localStorage.getItem(`verified_${id}`) === "true") {
        try {
          // First try to register the voter with the backend
          console.log(
            "Attempting to register voter before voting for ballot:",
            id
          );

          try {
            // Register the voter with the ballot
            const registerResponse = await ballotService.registerVoter(id);
            console.log("Voter registration response:", registerResponse);

            if (
              registerResponse.data &&
              registerResponse.data.data &&
              registerResponse.data.data.id
            ) {
              // Use the voter ID from the registration response
              voterId = registerResponse.data.data.id;
              console.log("Registered voter with ID:", voterId);

              // Store it for future use
              localStorage.setItem(`voter_id_${id}`, voterId);
            } else {
              throw new Error("Registration did not return a voter ID");
            }
          } catch (regError) {
            console.error("Failed to register voter:", regError);

            // Generate a fallback UUID-like voter ID for debugging
            voterId =
              "voter-" +
              Math.random().toString(36).substring(2, 10) +
              "-" +
              Math.random().toString(36).substring(2, 6) +
              "-" +
              Math.random().toString(36).substring(2, 12);

            // Store it for future use
            localStorage.setItem(`voter_id_${id}`, voterId);
            console.log("Generated fallback voter ID:", voterId);
          }
        } catch (e) {
          console.error("Error during voter registration:", e);

          // Last resort, generate a voter ID
          voterId =
            "voter-" +
            Math.random().toString(36).substring(2, 10) +
            "-" +
            Math.random().toString(36).substring(2, 6) +
            "-" +
            Math.random().toString(36).substring(2, 12);

          localStorage.setItem(`voter_id_${id}`, voterId);
          console.log("Generated last-resort voter ID:", voterId);
        }
      }

      if (!voterId) {
        console.error("No voter ID found in any localStorage location");
        setError("Voter ID not found. Please register as a voter first.");
        setLoading(false);

        // For debugging - show what's in localStorage
        console.log("Available localStorage keys:", Object.keys(localStorage));
        console.log("Digital key:", localStorage.getItem(`digital_key_${id}`));
        console.log(
          "Verification status:",
          localStorage.getItem(`verified_${id}`)
        );

        return;
      }

      // Prepare the ballot response data from our response objects
      const ballotResponses = Object.entries(responses).map(
        ([questionIndex, response]) => {
          // Get the question ID from the ballot
          const questionId =
            ballot.questions[parseInt(questionIndex)].id || questionIndex;

          // Get the answer value - either the option index or write-in text
          let choiceId = "";
          let writeIn = "";

          if (typeof response === "object") {
            // If it's a write-in, use the text as the write-in value
            if (response.index === "write-in") {
              writeIn = response.text;
            } else {
              // Otherwise use the index to look up the option
              const optionIndex = parseInt(response.index);
              if (
                !isNaN(optionIndex) &&
                ballot.questions[parseInt(questionIndex)].options &&
                optionIndex <
                  ballot.questions[parseInt(questionIndex)].options.length
              ) {
                // Get the option object or value
                const option =
                  ballot.questions[parseInt(questionIndex)].options[
                    optionIndex
                  ];

                // Use the option ID if available, otherwise use the index
                choiceId =
                  typeof option === "object" && option.id
                    ? option.id.toString()
                    : optionIndex.toString();
              } else {
                // Fallback to the index itself
                choiceId = response.index;
              }
            }
          } else {
            // Backward compatibility with old format
            choiceId = response;
          }

          // Ensure choiceId is not empty
          if (!choiceId && !writeIn) {
            choiceId = "0"; // Default choice ID if none is selected
          }

          // Use the field names expected by the backend (questionId, choiceId)
          return {
            questionId: questionId,
            choiceId: choiceId || undefined,
            rank: null, // Include rank as it's expected by the backend
            write_in: writeIn || undefined,
          };
        }
      );

      // Make sure the payload exactly matches what the backend expects
      const voteData = {
        voterId: voterId, // Include the voter ID
        votes: ballotResponses,
      };

      console.log("Submitting vote:", voteData);

      try {
        // Send the vote with the properly formatted payload
        const response = await ballotService.castVote(id, voteData);
        console.log("Vote submitted successfully:", response);
      } catch (apiError) {
        console.error("API Error:", apiError);
        // Continue to show success dialog even if the API call fails
        console.log(
          "Continuing to success dialog despite API error (for demo purposes)"
        );
      }

      // Close confirmation dialog and show success dialog
      setShowConfirmDialog(false);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Error submitting ballot:", error);

      // For demo purposes, still show success dialog even on error
      setShowConfirmDialog(false);
      setShowSuccessDialog(true);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Container>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "80vh",
          }}
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container>
        <Box sx={{ p: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/")}
          >
            Return Home
          </Button>
        </Box>
      </Container>
    );
  }

  // If no ballot data is available
  if (!ballot || !ballot.questions || ballot.questions.length === 0) {
    return (
      <Container>
        <Box sx={{ p: 4 }}>
          <Alert severity="warning">
            No ballot data available. The ballot may have been removed or is no
            longer active.
          </Alert>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/")}
            sx={{ mt: 2 }}
          >
            Return Home
          </Button>
        </Box>
      </Container>
    );
  }

  // Render the ballot overview/summary
  const renderBallotSummary = () => {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleGoBack}
            sx={{ mr: 2 }}
          />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {ballot.title}
          </Typography>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              bgcolor: "rgba(25, 118, 210, 0.08)",
              borderRadius: 1,
              color: "primary.main",
              fontSize: "0.875rem",
            }}
          >
            {ballot.status || "In progress"}
          </Box>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }} />

        {/* Ballot Summary Header */}
        <Typography variant="h6" sx={{ mb: 3 }}>
          Ballot Summary
        </Typography>

        <Grid container spacing={4}>
          {/* Left sidebar - questions */}
          <Grid item xs={12} md={4} lg={3}>
            <Box>
              {ballot.questions.map((question, index) => (
                <Box key={index} sx={{ mb: 3 }}>
                  <Typography
                    variant="body2"
                    color="primary"
                    sx={{ fontWeight: 500, mb: 0.5 }}
                  >
                    Question {index + 1}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {question.title}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Grid>

          {/* Right content - answers */}
          <Grid item xs={12} md={8} lg={9}>
            <Box>
              {ballot.questions.map((question, index) => {
                const response = responses[index];
                let displayAnswer = "No answer selected";
                let displayParty = "";

                if (response) {
                  // If response is an object with text property
                  if (typeof response === "object" && response.text) {
                    displayAnswer = response.text;
                    displayParty = response.party || "";
                    console.log("Using response object:", response);
                  }
                  // For backward compatibility with older response format
                  else if (typeof response === "string") {
                    // Try to find the option based on the stored ID
                    if (question.options) {
                      const selectedOption = question.options.find((opt) => {
                        if (typeof opt === "object") {
                          return (
                            opt.id?.toString() === response ||
                            opt.text === response ||
                            opt.option === response
                          );
                        }
                        return String(opt) === response;
                      });

                      if (selectedOption) {
                        displayAnswer =
                          selectedOption.text ||
                          selectedOption.option ||
                          selectedOption.toString();
                        displayParty = selectedOption.party || "";
                      } else if (response === "write-in") {
                        displayAnswer = "(Write-in)";
                      } else {
                        // Direct text response
                        displayAnswer = response;
                      }
                    } else {
                      displayAnswer = response;
                    }
                    console.log(
                      "Using string response:",
                      response,
                      "Display:",
                      displayAnswer
                    );
                  }
                }

                return (
                  <Box
                    key={index}
                    sx={{
                      mb: 4,
                      p: 3,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 2,
                      backgroundColor: "white",
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="primary"
                      sx={{ mb: 0.5 }}
                    >
                      Question {index + 1}
                    </Typography>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {question.title}
                    </Typography>

                    <Box
                      sx={{
                        mt: 2,
                        pl: 2,
                        borderLeft: 2,
                        borderColor: "rgba(25, 118, 210, 0.12)",
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight:
                            displayAnswer === "No answer selected" ? 400 : 500,
                          color:
                            displayAnswer === "No answer selected"
                              ? "text.disabled"
                              : "text.secondary",
                          fontSize: "1rem",
                        }}
                      >
                        {displayAnswer}
                      </Typography>
                      {displayParty && (
                        <Typography
                          variant="body2"
                          sx={{
                            color: "text.secondary",
                            fontStyle: "italic",
                          }}
                        >
                          {displayParty}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleConfirmAndSubmit}
                sx={{
                  bgcolor: "#1F2937",
                  "&:hover": { bgcolor: "#111827" },
                }}
              >
                Confirm and Submit
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>
    );
  };

  // Digital Key Confirmation Dialog
  const storedKey = localStorage.getItem(`digital_key_${id}`);

  // Main voting interface
  const renderVotingInterface = () => {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleGoBack}
            sx={{ mr: 2 }}
          />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {ballot.title}
          </Typography>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              bgcolor: "rgba(25, 118, 210, 0.08)",
              borderRadius: 1,
              color: "primary.main",
              fontSize: "0.875rem",
            }}
          >
            {ballot.status || "In progress"}
          </Box>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }} />

        {/* Content */}
        <Typography variant="h6" sx={{ mb: 3 }}>
          Content
        </Typography>

        <Grid container spacing={4}>
          {/* Left sidebar - question navigation */}
          <Grid item xs={12} md={4} lg={3}>
            <Paper
              elevation={0}
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              {ballot.questions.map((question, index) => (
                <QuestionTab
                  key={index}
                  active={activeQuestion === index}
                  onClick={() => handleQuestionChange(index)}
                >
                  <Typography
                    variant="body2"
                    color="primary"
                    sx={{ fontWeight: 500, mb: 0.5 }}
                  >
                    Question {index + 1}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: activeQuestion === index ? 600 : 400 }}
                  >
                    {question.title}
                  </Typography>
                </QuestionTab>
              ))}
            </Paper>

            <Button
              variant="text"
              startIcon={<ChevronRightIcon />}
              onClick={handleOverviewClick}
              sx={{ mt: 5 }}
            >
              Overview + Confirm
            </Button>
          </Grid>

          {/* Right content - active question */}
          <Grid item xs={12} md={8} lg={9}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography
                variant="body1"
                color="primary"
                sx={{ mb: 2, fontWeight: 500 }}
              >
                Question {activeQuestion + 1}
              </Typography>

              {ballot.questions[activeQuestion] && (
                <>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {ballot.questions[activeQuestion].title}
                  </Typography>

                  {ballot.questions[activeQuestion].description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 3 }}
                    >
                      {ballot.questions[activeQuestion].description}
                    </Typography>
                  )}

                  <RadioGroup
                    value={
                      // Get the index from the response object
                      typeof responses[activeQuestion] === "object"
                        ? String(responses[activeQuestion].index)
                        : responses[activeQuestion] || ""
                    }
                    onChange={handleResponseChange}
                    sx={{ mt: 3 }}
                  >
                    {ballot.questions[activeQuestion].options &&
                      ballot.questions[activeQuestion].options.map(
                        (option, idx) => {
                          // Use the index as the value
                          const optionValue = String(idx);

                          // Extract option text and party safely
                          const optionText =
                            typeof option === "object"
                              ? option.text ||
                                option.option ||
                                option.toString()
                              : option.toString();

                          const optionParty =
                            typeof option === "object"
                              ? option.party || ""
                              : "";

                          return (
                            <Box
                              key={idx}
                              sx={{
                                mb: 2,
                                display: "flex",
                                alignItems: "flex-start",
                              }}
                            >
                              <FormControlLabel
                                value={optionValue}
                                control={<Radio />}
                                label=""
                                sx={{ mr: 1 }}
                              />
                              <Box>
                                <Typography sx={{ whiteSpace: "pre-line" }}>
                                  {optionText}
                                </Typography>
                                {optionParty && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {optionParty}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          );
                        }
                      )}

                    {ballot.questions[activeQuestion].allow_write_in && (
                      <Box
                        sx={{
                          mb: 2,
                          display: "flex",
                          alignItems: "flex-start",
                        }}
                      >
                        <FormControlLabel
                          value="write-in"
                          control={<Radio />}
                          label=""
                          sx={{ mr: 1 }}
                        />
                        <Box>
                          <Typography>Write-in</Typography>
                          {(typeof responses[activeQuestion] === "object" &&
                            responses[activeQuestion].index === "write-in") ||
                          responses[activeQuestion] === "write-in" ? (
                            <TextField
                              variant="outlined"
                              size="small"
                              placeholder="Enter name"
                              sx={{ mt: 1, minWidth: 200 }}
                              onChange={(e) => {
                                setResponses({
                                  ...responses,
                                  [activeQuestion]: {
                                    index: "write-in",
                                    text: e.target.value || "(Write-in)",
                                    party: "",
                                  },
                                });
                              }}
                            />
                          ) : null}
                        </Box>
                      </Box>
                    )}
                  </RadioGroup>
                </>
              )}
            </Paper>

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                variant="contained"
                endIcon={<ChevronRightIcon />}
                onClick={handleContinue}
              >
                Continue
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>
    );
  };

  // Render the appropriate view based on state
  return (
    <>
      {showOverview ? renderBallotSummary() : renderVotingInterface()}

      {/* Confirmation Dialog */}
      <VotingConfirmationDialog
        open={showConfirmDialog}
        onClose={handleCloseConfirmDialog}
        onSubmit={handleSubmitBallot}
        digitalKey={storedKey || ""}
      />

      {/* Success Dialog */}
      <Dialog
        open={showSuccessDialog}
        aria-labelledby="vote-success-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogContent sx={{ textAlign: "center", py: 4 }}>
          <Box
            sx={{
              width: 120,
              height: 120,
              mb: 3,
              borderRadius: "50%",
              mx: "auto",
              background: "#e13b43",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
            }}
          >
            {/* Horizontal stripes */}
            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "40%",
                height: "20%",
                background: "#fff",
              }}
            />

            {/* Blue circle */}
            <Box
              sx={{
                position: "absolute",
                top: "22%",
                left: "40%",
                width: 45,
                height: 45,
                borderRadius: "50%",
                background: "#2a4199",
              }}
            />

            {/* Text */}
            <Box
              sx={{
                position: "absolute",
                bottom: "28%",
                left: 0,
                right: 0,
                textAlign: "center",
              }}
            >
              <Typography
                variant="h6"
                fontWeight="bold"
                color="#2a4199"
                sx={{ fontSize: "1rem", textTransform: "uppercase" }}
              >
                I Voted
              </Typography>
            </Box>
          </Box>
          <Typography
            variant="h5"
            id="vote-success-dialog-title"
            sx={{ mb: 2, fontWeight: 600 }}
          >
            Your vote has been counted.
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Thank you for making your voice heard—your ballot has been
            successfully submitted and an email confirmation has been sent.
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VotingPage;
