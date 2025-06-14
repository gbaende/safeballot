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
import { ballotService, getVoterInfo } from "../../services/ballotService";
import VotingConfirmationDialog from "../../components/VotingConfirmationDialog";
import { toast } from "react-toastify";

// Styled components
const QuestionTab = styled(Box)(({ theme }) => ({
  padding: "12px 16px",
  cursor: "pointer",
  borderLeft: "4px solid transparent",
  backgroundColor: "transparent",
  transition: "background-color 0.2s",
  "&:hover": {
    backgroundColor: "rgba(0, 0, 0, 0.04)",
  },
  "&[data-active='true']": {
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    backgroundColor: "rgba(25, 118, 210, 0.08)",
    "&:hover": {
      backgroundColor: "rgba(25, 118, 210, 0.12)",
    },
  },
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isQuickBallot, setIsQuickBallot] = useState(false);

  // Check if user has been verified
  useEffect(() => {
    const verifyOrBypass = async () => {
      // Check stored verification first
      const verificationStatus = localStorage.getItem(`verified_${id}`);
      const storedDigitalKey = localStorage.getItem(`digital_key_${id}`);

      // Parse any ID from the slug
      const slugParts = slug ? slug.split("-") : [];
      const idFromSlug =
        slugParts.length > 0 ? slugParts[slugParts.length - 1] : null;

      const verificationStatusFromSlug = idFromSlug
        ? localStorage.getItem(`verified_${idFromSlug}`)
        : null;
      const storedDigitalKeyFromSlug = idFromSlug
        ? localStorage.getItem(`digital_key_${idFromSlug}`)
        : null;

      if (
        (verificationStatus === "true" && storedDigitalKey) ||
        (verificationStatusFromSlug === "true" && storedDigitalKeyFromSlug)
      ) {
        setHasVerified(true);
        setDigitalKey(storedDigitalKey || storedDigitalKeyFromSlug);
        return;
      }

      // No verification found – fetch ballot to see if quick ballot is enabled
      try {
        const resp = await ballotService.getBallotById(id);
        const data = resp?.data?.data || {};
        const quickFlag = data.quickBallot ?? data.quick_ballot ?? false;
        const urlFlag = window.location.pathname.startsWith("/vote/");
        const isQuick = quickFlag || urlFlag;
        if (quickFlag) {
          console.log("Quick ballot detected – bypassing registration.", {
            quickFlag,
            urlFlag,
          });
          setIsQuickBallot(true);
          setDigitalKey("quick-auto-key");
          setHasVerified(true); // allow voting without registration
        } else {
          navigate(`/voter-registration/${id}/${slug}`);
        }
      } catch (e) {
        console.error("Error checking quick ballot status:", e);
        // fallback to registration flow
        navigate(`/voter-registration/${id}/${slug}`);
      }
    };

    verifyOrBypass();
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
    if (ballot && (ballot.quickBallot || isQuickBallot)) {
      // For quick ballots skip digital-key dialog
      handleSubmitBallot();
      return;
    }

    // Normal flow requires digital key confirmation
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

  const handleSubmitBallot = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(false);

      // Digital key validation – skipped for quick ballots
      if (!(ballot?.quickBallot || isQuickBallot)) {
        const storedKey = localStorage.getItem(`digital_key_${id}`);
        if (!storedKey) {
          setSubmitError(
            "Digital key not found. Please complete verification first."
          );
          setIsSubmitting(false);
          return;
        }

        if (digitalKey !== storedKey) {
          setSubmitError("Invalid digital key. Please enter the correct key.");
          setIsSubmitting(false);
          return;
        }
      }

      // Comprehensive voter info gathering approach
      console.log(
        "[VOTING] Starting comprehensive vote submission for ballot:",
        id
      );

      // 1. Get ALL possible sources of voter information
      const voterSources = {
        localStorage: {
          voterInfo: localStorage.getItem(`voter_info_${id}`),
          verifiedName: localStorage.getItem(`verified_name_${id}`),
          verifiedEmail: localStorage.getItem(`verified_email_${id}`),
          voterName: localStorage.getItem("voterName"),
          voterEmail: localStorage.getItem("voterEmail"),
          email: localStorage.getItem("email"),
          voterId: localStorage.getItem(`voter_id_${id}`),
          user: localStorage.getItem("user"),
          voterUser: localStorage.getItem("voterUser"),
        },
        sessionStorage: {
          voterInfo: sessionStorage.getItem("voterInfo"),
          voterName: sessionStorage.getItem("voterName"),
          email: sessionStorage.getItem("email"),
        },
      };

      // Log all potential sources
      console.log("[VOTING] ALL VOTER INFO SOURCES:", voterSources);

      // 2. Extract voter information from all sources in priority order
      let voterName, voterEmail, voterId;

      // Priority 1: ballot-specific voter info (most reliable)
      try {
        if (voterSources.localStorage.voterInfo) {
          const parsedInfo = JSON.parse(voterSources.localStorage.voterInfo);
          if (parsedInfo && parsedInfo.name) {
            voterName = parsedInfo.name;
            console.log(
              `[VOTING] Found name from ballot voter info: ${voterName}`
            );
          }
          if (parsedInfo && parsedInfo.email) {
            voterEmail = parsedInfo.email;
            console.log(
              `[VOTING] Found email from ballot voter info: ${voterEmail}`
            );
          }
        }
      } catch (e) {
        console.warn("[VOTING] Error parsing ballot voter info:", e);
      }

      // Priority 2: verified name and email (second most reliable)
      if (!voterName && voterSources.localStorage.verifiedName) {
        voterName = voterSources.localStorage.verifiedName;
        console.log(`[VOTING] Found name from verified name: ${voterName}`);
      }

      if (!voterEmail && voterSources.localStorage.verifiedEmail) {
        voterEmail = voterSources.localStorage.verifiedEmail;
        console.log(`[VOTING] Found email from verified email: ${voterEmail}`);
      }

      // Priority 3: general voter name and email
      if (!voterName && voterSources.localStorage.voterName) {
        voterName = voterSources.localStorage.voterName;
        console.log(
          `[VOTING] Found name from general voter name: ${voterName}`
        );
      }

      if (!voterEmail && voterSources.localStorage.voterEmail) {
        voterEmail = voterSources.localStorage.voterEmail;
        console.log(
          `[VOTING] Found email from general voter email: ${voterEmail}`
        );
      }

      // Priority 4: general email field
      if (!voterEmail && voterSources.localStorage.email) {
        voterEmail = voterSources.localStorage.email;
        console.log(
          `[VOTING] Found email from general email field: ${voterEmail}`
        );
      }

      // Priority 5: user or voterUser objects
      if (
        (!voterName || !voterEmail) &&
        (voterSources.localStorage.user || voterSources.localStorage.voterUser)
      ) {
        try {
          const userStr =
            voterSources.localStorage.voterUser ||
            voterSources.localStorage.user;
          const userData = JSON.parse(userStr);

          if (!voterName && userData.name) {
            voterName = userData.name;
            console.log(`[VOTING] Found name from user object: ${voterName}`);
          }

          if (!voterEmail && userData.email) {
            voterEmail = userData.email;
            console.log(`[VOTING] Found email from user object: ${voterEmail}`);
          }
        } catch (e) {
          console.warn("[VOTING] Error parsing user object:", e);
        }
      }

      // Voter ID has only one source
      voterId = voterSources.localStorage.voterId;
      if (voterId) {
        console.log(`[VOTING] Found voter ID: ${voterId}`);
      } else {
        console.warn("[VOTING] No voter ID found, vote might be anonymous");
      }

      // Fallback to default name if none found
      if (!voterName) {
        voterName = "Registered Voter";
        console.warn("[VOTING] Using default voter name as none was found");
      }

      // Prepare the final voter info for submission
      const voterInfo = {
        name: voterName,
        email: voterEmail,
      };

      // Log the final voter info being used
      console.log("[VOTING] ✅ FINAL VOTER INFO FOR SUBMISSION:", {
        name: voterInfo.name,
        email: voterInfo.email
          ? `${voterInfo.email.substring(0, 3)}...`
          : "null",
        voterId: voterId || "null",
      });

      // Determine if this is a quick-ballot flow (anonymous voting)
      const isQuickVote = ballot?.quickBallot || isQuickBallot;

      // Skip voter creation/registration for quick ballots
      if (!isQuickVote && voterInfo.email && !voterId) {
        try {
          console.log(
            "[VOTING] No voter ID found, creating direct voter record before voting"
          );
          const directVoterResult = await ballotService.createDirectVoter(
            id,
            voterInfo
          );
          console.log(
            "[VOTING] Direct voter creation result:",
            directVoterResult
          );

          if (directVoterResult?.data?.voter?.id) {
            voterId = directVoterResult.data.voter.id;
            localStorage.setItem(`voter_id_${id}`, voterId);
            console.log(`[VOTING] Created and stored new voter ID: ${voterId}`);
          }
        } catch (err) {
          console.warn(
            "[VOTING] Could not create direct voter record:",
            err.message
          );
        }
      }

      // Also try public registration as another backup approach (skip for quick ballots)
      if (!isQuickVote && voterInfo.email) {
        try {
          console.log(
            "[VOTING] Performing public registration as additional verification"
          );
          const registrationResult = await ballotService.publicRegisterVoter(
            id,
            voterInfo
          );

          if (registrationResult.voter && registrationResult.voter.id) {
            console.log(
              `[VOTING] Public registration successful, voter ID: ${registrationResult.voter.id}`
            );

            // Only update the voter ID if we didn't have one before
            if (!voterId) {
              voterId = registrationResult.voter.id;
              localStorage.setItem(`voter_id_${id}`, voterId);
            }
          }
        } catch (err) {
          console.warn(
            "[VOTING] Public registration attempt warning:",
            err.message
          );
        }
      }

      // Prepare the vote payload – omit voter details for quick ballots
      const votePayload = isQuickVote
        ? {
            rankings: responses,
            quickBallot: true, // Signal the API helper that this is an anonymous quick ballot
          }
        : {
            rankings: responses,
            voterId, // Include voter ID if available
            voter: voterInfo, // Include voter information for regular ballots
          };

      // Log the complete payload for debugging
      console.log(
        "[VOTING] Submitting vote payload:",
        JSON.stringify(votePayload, null, 2)
      );

      // Submit the vote
      const result = await ballotService.castVote(id, votePayload);
      console.log("[VOTING] Vote submission successful:", result);

      localStorage.setItem("hasVoted_" + id, "true");
      setSubmitSuccess(true);
      setIsSubmitting(false);

      // Close confirmation dialog if it was open
      setShowConfirmDialog(false);

      // For quick ballots, always navigate directly to results
      if (isQuickVote) {
        navigate(`/elections/${id}/results`);
      } else {
        toast.error("Failed to submit your vote. Please try again.");
      }
    } catch (error) {
      console.error("[VOTING] Error submitting ballot:", error);
      setSubmitError("Error submitting ballot");
      setIsSubmitting(false);
      toast.error("Failed to submit your vote. Please try again.");
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
                  background: "linear-gradient(to right, #080E1D, #263C75)",
                  "&:hover": {
                    background: "linear-gradient(to right, #050912, #1d2e59)",
                  },
                  borderRadius: "4px",
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
                  data-active={activeQuestion === index}
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
                sx={{
                  background: "linear-gradient(to right, #080E1D, #263C75)",
                  "&:hover": {
                    background: "linear-gradient(to right, #050912, #1d2e59)",
                  },
                  borderRadius: "4px",
                }}
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
        digitalKey={localStorage.getItem(`digital_key_${id}`) || ""}
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

      {/* San Diego FC logo footer */}
      <Box
        component="img"
        src="/images/san-diego-fc-badge.png"
        alt="San Diego FC Logo"
        sx={{
          position: "fixed",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          height: { xs: 40, sm: 50, md: 60 },
          zIndex: 1200,
        }}
      />
    </>
  );
};

export default VotingPage;
