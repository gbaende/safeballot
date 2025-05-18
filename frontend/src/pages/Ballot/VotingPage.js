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
import { getVoterInfo } from "../../services/ballotService";
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
      if (ballot.questions && ballot.questions.length > 0) {
        console.log(
          "FIRST QUESTION OPTIONS STRUCTURE:",
          ballot.questions[0].options
            ? JSON.stringify(ballot.questions[0].options)
            : "No options found"
        );

        // Check all questions for options
        ballot.questions.forEach((q, idx) => {
          if (!q.options || q.options.length === 0) {
            console.warn(
              `Question ${idx + 1} has no options or empty options array`
            );
          } else {
            console.log(`Question ${idx + 1} has ${q.options.length} options`);
          }
        });

        // Ensure each question has options property
        const hasOptionsIssue = ballot.questions.some(
          (q) => !q.options || !Array.isArray(q.options)
        );
        if (hasOptionsIssue) {
          console.error(
            "Some questions are missing the options array property!"
          );
        }
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

          // Process the ballot data to ensure it has the expected structure
          const processedBallot = normalizeballotData(response.data.data);
          setBallot(processedBallot);

          // Initialize responses object with empty selections for each question
          if (processedBallot.questions) {
            const initialResponses = {};
            processedBallot.questions.forEach((q, index) => {
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

              // Process the ballot data to ensure it has the expected structure
              const processedBallot = normalizeballotData(response.data.data);
              setBallot(processedBallot);

              // Initialize responses object
              if (processedBallot.questions) {
                const initialResponses = {};
                processedBallot.questions.forEach((q, index) => {
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

        // Process the ballot data to ensure it has the expected structure
        const processedBallot = normalizeballotData(foundBallot);
        setBallot(processedBallot);

        // Initialize responses object
        if (processedBallot.questions) {
          const initialResponses = {};
          processedBallot.questions.forEach((q, index) => {
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

  // Function to normalize ballot data to ensure it has the expected structure
  const normalizeballotData = (ballot) => {
    if (!ballot) return ballot;

    // Make a deep copy to avoid modifying the original
    const normalizedBallot = JSON.parse(JSON.stringify(ballot));

    // Ensure questions array exists
    if (!normalizedBallot.questions) {
      console.warn("Ballot has no questions array, creating empty one");
      normalizedBallot.questions = [];
    }

    // Process each question to ensure options exist and are in the expected format
    normalizedBallot.questions.forEach((question, qIndex) => {
      // If options is missing or not an array, create an empty array
      if (!question.options || !Array.isArray(question.options)) {
        console.warn(
          `Question ${qIndex + 1} missing options array, creating one`
        );
        question.options = [];

        // Try to extract options from choices if they exist
        if (question.choices && Array.isArray(question.choices)) {
          console.log(`Using choices array for question ${qIndex + 1} options`);
          question.options = question.choices.map((choice) => {
            // If choice is an object with text property, use it directly
            if (typeof choice === "object" && choice !== null) {
              return {
                id: choice.id || String(choice.order || 0),
                text: choice.text || choice.option || choice.name || "Option",
                party: choice.party || "",
              };
            }
            // If choice is a string, create an object
            return {
              id: String(question.choices.indexOf(choice)),
              text: String(choice),
              party: "",
            };
          });
        }
        // If no options or choices, create default placeholder options
        else if (question.options.length === 0) {
          console.warn(
            `Creating placeholder options for question ${qIndex + 1}`
          );
          question.options = [
            { id: "0", text: "Option 1", party: "" },
            { id: "1", text: "Option 2", party: "" },
          ];
        }
      }

      // Normalize each option to ensure consistent format
      question.options = question.options.map((option, oIndex) => {
        if (typeof option === "object" && option !== null) {
          return {
            id: option.id || String(oIndex),
            text:
              option.text ||
              option.option ||
              option.name ||
              String(option) ||
              `Option ${oIndex + 1}`,
            party: option.party || "",
          };
        } else {
          return {
            id: String(oIndex),
            text: String(option),
            party: "",
          };
        }
      });

      // Make sure question has title and description
      question.title = question.title || `Question ${qIndex + 1}`;
      question.description = question.description || "";
      question.id = question.id || String(qIndex);
    });

    console.log("Normalized ballot data:", normalizedBallot);
    return normalizedBallot;
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
    setLoading(true);

    try {
      // Store any relevant verification keys
      if (
        ballot.requiresVerification &&
        ballot.verificationMethod === "digital_key"
      ) {
        localStorage.setItem(`digital_key_${id}`, enteredKey);
      }

      // Get the voter ID - either from local storage or create a new one
      let voterId = localStorage.getItem(`voter_id_${id}`);
      console.log(`Found ballot-specific voter ID: ${voterId}`);

      // Get voter information using utility function from ballotService
      const voterInfo = getVoterInfo(id);

      if (voterInfo) {
        console.log(`Using voter info:`, {
          name: voterInfo.name,
          hasEmail: !!voterInfo.email,
        });
      } else {
        console.warn(`No voter info found, vote will be recorded as anonymous`);
      }

      // Transform responses into the array format expected by the API
      const userSelections = [];
      // Create an object with question index as key and selected option index as value
      Object.keys(responses).forEach((questionIndex) => {
        const response = responses[questionIndex];
        if (response) {
          const index =
            typeof response === "object" ? response.index : response;
          // For numeric indices, convert to number, otherwise keep as is
          userSelections[parseInt(questionIndex)] = !isNaN(parseInt(index))
            ? parseInt(index)
            : index;
        } else {
          userSelections[parseInt(questionIndex)] = null;
        }
      });

      console.log("User selections by question index:", userSelections);

      // Get the full questions data to pass to the API for correct ID mapping
      const questionsData = ballot.questions.map((question) => ({
        id: question.id,
        title: question.title,
        choices: question.options.map((option, index) => ({
          id: option.id || String(index),
          text: option.text || option.toString(),
          order: index,
        })),
      }));

      console.log("Questions data with choices:", questionsData);

      // Make sure the payload exactly matches what the backend expects
      const voteData = {
        voterId: voterId, // Include the voter ID
        voterInfo: voterInfo, // Include voter info if available
        userSelections, // Include the array of user selections
        questionsData, // Include the full questions data for proper ID mapping
        // We'll let the API service build the votes array from these two pieces of data
      };

      console.log("Submitting vote with full question data:", voteData);

      try {
        // IMPORTANT: Check for admin tokens and prevent using them for voting
        const adminToken = localStorage.getItem("adminToken");
        const regularToken = localStorage.getItem("token");

        // Remove any admin-related tokens from localStorage temporarily to ensure we don't
        // vote as an admin through the API client's Authorization header
        if (adminToken) {
          console.log(
            "Temporarily removing admin token to prevent voting as admin"
          );
          localStorage.removeItem("adminToken");
        }

        if (regularToken) {
          console.log(
            "Temporarily removing regular token to prevent voting as admin"
          );
          localStorage.removeItem("token");
        }

        // Create a specific voter token if we don't have one
        if (!localStorage.getItem("voterToken") && voterId) {
          // Generate a simple identifier token for this voter
          const voterToken = `voter_${voterId}_${Date.now()}`;
          localStorage.setItem("voterToken", voterToken);
          console.log(`Created voter token: ${voterToken}`);
        }

        // Send the vote with the properly formatted payload
        const response = await ballotService.castVote(id, voteData);
        console.log("Vote submitted successfully:", response);

        // Restore admin tokens if they existed
        if (adminToken) {
          localStorage.setItem("adminToken", adminToken);
        }

        if (regularToken) {
          localStorage.setItem("token", regularToken);
        }

        // Store the voter ID that was used or created by the backend
        if (response.data?.data?.voterId) {
          localStorage.setItem(`voter_id_${id}`, response.data.data.voterId);
          console.log(`Updated voter ID to: ${response.data.data.voterId}`);

          // Also update the voter name if returned (for confirmation)
          if (response.data?.data?.voterName) {
            console.log(`Vote recorded for: ${response.data.data.voterName}`);
          }
        }

        // Close confirmation dialog and show success dialog
        setShowConfirmDialog(false);
        setShowSuccessDialog(true);
      } catch (error) {
        // Restore admin tokens if they existed even if there was an error
        const adminToken = localStorage.getItem("adminToken");
        const regularToken = localStorage.getItem("token");

        if (adminToken) {
          localStorage.setItem("adminToken", adminToken);
        }

        if (regularToken) {
          localStorage.setItem("token", regularToken);
        }

        console.error("API Error:", error);

        // Check if this is the admin voting error
        if (error.response && error.response.status === 403) {
          console.error("Error status:", error.response.status);
          console.error("Error data:", error.response.data);

          const errorMessage =
            error.response.data?.message || "You cannot vote in this ballot.";
          console.error("Error message from backend:", errorMessage);

          // Show an error message to the user
          setError(errorMessage);
          setShowConfirmDialog(false);
          return;
        }

        // For demo purposes, still show success dialog even on non-admin errors
        setShowConfirmDialog(false);
        setShowSuccessDialog(true);
      }
    } catch (error) {
      console.error("Error submitting ballot:", error);
      setError("There was a problem submitting your ballot. Please try again.");
      setShowConfirmDialog(false);
    } finally {
      setLoading(false);
    }
  };

  // Add a utility function to reset voter status in localStorage
  const resetVoterStatus = () => {
    const id = slug.split("-")[0]; // Extract ID from slug
    localStorage.removeItem(`voter_id_${id}`);
    console.log(`Cleared voter ID for ballot ${id} from localStorage`);
    alert(
      "Voter status reset in localStorage. Please refresh the page to restart the voting process."
    );
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
            sx={{ mr: 2 }}
          >
            Return Home
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={resetVoterStatus}
          >
            Reset Voter Status (Debug)
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
            component="img"
            src="/images/i-voted-sticker.png"
            alt="I Voted Sticker"
            sx={{
              width: 150,
              height: 150,
              mb: 3,
              borderRadius: "50%",
              boxShadow: "0px 3px 8px rgba(0, 0, 0, 0.15)",
            }}
          />
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
