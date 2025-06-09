import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Box, Container, CircularProgress, Alert } from "@mui/material";
import { useSelector } from "react-redux";
import VerifyIdentity from "./VerifyIdentity";
import RegistrationBlinkIDStep from "../../components/Verification/RegistrationBlinkIDStep";
import ConfirmInfo from "./ConfirmInfo";
import VerifiedScreen from "./VerifiedScreen";
import { ballotService, authService } from "../../services/api";

const RegistrationFlowRouter = ({ startAtStep }) => {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useSelector((state) => state.auth);

  // State
  const [currentScreen, setCurrentScreen] = useState("identity"); // identity, scan, confirm, verified
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ballot, setBallot] = useState(null);
  const [voterInfo, setVoterInfo] = useState({
    email: "",
    name: "",
  });
  const [scannedIdData, setScannedIdData] = useState(null);

  // Analytics/Logging for flow transitions
  const logFlowTransition = (from, to, data = {}) => {
    console.log(`[REGISTRATION FLOW] Transition: ${from} → ${to}`, {
      ballotId: id,
      timestamp: new Date().toISOString(),
      ...data,
    });
  };

  // Check if coming from scan with ID data
  useEffect(() => {
    if (location.state?.fromScan && location.state?.idData) {
      console.log(
        "[REGISTRATION FLOW] Coming from scan - going to confirm screen"
      );
      logFlowTransition("scan", "confirm", { hasIdData: true });
      setScannedIdData(location.state.idData);
      setCurrentScreen("confirm");
    }
  }, [location]);

  // Check auth status and load ballot
  useEffect(() => {
    const checkAuthAndBallot = async () => {
      setLoading(true);
      setError(null);

      try {
        // Parse any ID from the slug first
        const slugParts = slug ? slug.split("-") : [];
        const idFromSlug =
          slugParts.length > 0 ? slugParts[slugParts.length - 1] : null;
        const ballotIdToUse = id || idFromSlug;

        // Check if user is authenticated
        if (auth.isAuthenticated) {
          console.log("[REGISTRATION FLOW] User is authenticated");
          if (auth.user && auth.user.email) {
            setVoterInfo({
              email: auth.user.email,
              name: auth.user.name || "",
            });

            // Try to register as voter for this ballot
            if (ballotIdToUse) {
              try {
                console.log(
                  "[REGISTRATION FLOW] Registering as voter for ballot:",
                  ballotIdToUse
                );
                const voterInfoData = {
                  name: auth.user.name || "Registered Voter",
                  email: auth.user.email,
                };

                await ballotService.publicRegisterVoter(
                  ballotIdToUse,
                  voterInfoData
                );

                // Store voter info in localStorage for future reference
                localStorage.setItem(
                  `voter_info_${ballotIdToUse}`,
                  JSON.stringify(voterInfoData)
                );
                localStorage.setItem(
                  `verified_name_${ballotIdToUse}`,
                  voterInfoData.name
                );
                localStorage.setItem(
                  `verified_email_${ballotIdToUse}`,
                  voterInfoData.email
                );
              } catch (voterError) {
                console.warn(
                  "[REGISTRATION FLOW] Failed to register as voter:",
                  voterError
                );
              }
            }
          }
        } else {
          // User is not authenticated - check localStorage for voter info
          console.log(
            "[REGISTRATION FLOW] User not authenticated, checking localStorage for voter info"
          );

          if (ballotIdToUse) {
            // Try to get voter info from localStorage
            const storedEmail = localStorage.getItem(
              `verified_email_${ballotIdToUse}`
            );
            const storedName = localStorage.getItem(
              `verified_name_${ballotIdToUse}`
            );
            const storedVoterInfo = localStorage.getItem(
              `voter_info_${ballotIdToUse}`
            );

            let email = storedEmail;
            let name = storedName;

            // If we have stored voter info object, try to parse it
            if (storedVoterInfo) {
              try {
                const parsedVoterInfo = JSON.parse(storedVoterInfo);
                email = email || parsedVoterInfo.email;
                name = name || parsedVoterInfo.name;
              } catch (parseError) {
                console.warn(
                  "[REGISTRATION FLOW] Failed to parse stored voter info:",
                  parseError
                );
              }
            }

            // Also check general localStorage keys as fallback
            email =
              email ||
              localStorage.getItem("voterEmail") ||
              localStorage.getItem("email");
            name = name || localStorage.getItem("voterName");

            if (email) {
              console.log(
                "[REGISTRATION FLOW] Found voter info in localStorage:",
                {
                  email: email.substring(0, 3) + "...",
                  name: name || "Not provided",
                }
              );

              setVoterInfo({
                email: email,
                name: name || "",
              });
            } else {
              console.warn(
                "[REGISTRATION FLOW] No voter email found in localStorage"
              );
            }
          }
        }

        console.log("[REGISTRATION FLOW] Checking ballot:", {
          id,
          slug,
          idFromSlug,
          ballotIdToUse,
        });

        // UUID validation regex
        const UUID_REGEX =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isValidUuid = UUID_REGEX.test(ballotIdToUse);

        // Check if we have a valid UUID format or fallback to localStorage
        if (isValidUuid) {
          try {
            const response = await ballotService.getBallotById(ballotIdToUse);
            if (response.data && response.data.data) {
              console.log(
                "[REGISTRATION FLOW] Ballot data from API:",
                response.data.data
              );
              setBallot(response.data.data);
              return;
            }
          } catch (apiErr) {
            console.error("[REGISTRATION FLOW] API error:", apiErr);
          }
        }

        // If server fetch failed or ID is not a UUID, try localStorage
        console.log("[REGISTRATION FLOW] Trying localStorage for ballot");
        const localBallots = JSON.parse(
          localStorage.getItem("userBallots") || "[]"
        );

        const foundBallot = localBallots.find(
          (b) =>
            String(b.id) === String(ballotIdToUse) ||
            (idFromSlug && String(b.id).includes(idFromSlug))
        );

        if (foundBallot) {
          console.log(
            "[REGISTRATION FLOW] Found ballot in localStorage:",
            foundBallot
          );
          setBallot(foundBallot);
        } else {
          console.error("[REGISTRATION FLOW] Ballot not found in localStorage");
          setError("Ballot not found. The link may be invalid.");
        }
      } catch (err) {
        console.error("[REGISTRATION FLOW] Error loading ballot:", err);
        setError(
          "Failed to load election information. The link may be invalid."
        );
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndBallot();
  }, [id, slug, auth.isAuthenticated, auth.user, startAtStep]);

  // Handle ID verification completion
  const handleIdentityComplete = () => {
    logFlowTransition("identity", "scan");
    setCurrentScreen("scan");
  };

  // Handle scan completion - always go to confirm for registration flow
  const handleScanComplete = (idData) => {
    console.log("[REGISTRATION FLOW] ID scan completed:", idData);
    logFlowTransition("scan", "confirm", { hasIdData: !!idData });
    setScannedIdData(idData);
    setCurrentScreen("confirm");
  };

  // Handle confirmation screen completion
  const handleConfirmComplete = async () => {
    try {
      setLoading(true);
      setError(null);

      logFlowTransition("confirm", "verified", { processing: true });

      // Extract voter information from scanned ID data - only safe string values
      const firstName =
        scannedIdData?.givenName || scannedIdData?.firstName || "";
      const lastName = scannedIdData?.surname || scannedIdData?.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim() || "Registered Voter";

      // Update voter info with only safe string values
      const updatedVoterInfo = {
        email: voterInfo.email,
        name: fullName,
        firstName:
          typeof scannedIdData?.firstName === "string"
            ? scannedIdData.firstName
            : firstName,
        lastName:
          typeof scannedIdData?.lastName === "string"
            ? scannedIdData.lastName
            : lastName,
        dateOfBirth:
          typeof scannedIdData?.dateOfBirth === "string"
            ? scannedIdData.dateOfBirth
            : "",
        documentNumber:
          typeof scannedIdData?.documentNumber === "string"
            ? scannedIdData.documentNumber
            : "",
        nationality:
          typeof scannedIdData?.nationality === "string"
            ? scannedIdData.nationality
            : "",
      };

      setVoterInfo(updatedVoterInfo);

      // Register the voter with the ballot
      console.log("[REGISTRATION FLOW] Registering voter for ballot:", id);
      const registrationResponse = await ballotService.publicRegisterVoter(id, {
        name: fullName,
        email: voterInfo.email,
      });

      console.log(
        "[REGISTRATION FLOW] Voter registration response:",
        registrationResponse
      );

      // Log voter ID if available for testing purposes
      if (registrationResponse?.voter?.id) {
        console.log(
          "🎯 [VOTER ID] Generated unique voter ID:",
          registrationResponse.voter.id
        );
        console.log(
          "🎯 [VOTER ID] For voter:",
          fullName,
          "Email:",
          voterInfo.email
        );
        console.log("🎯 [VOTER ID] Ballot:", id);
      } else if (registrationResponse?.error) {
        console.warn(
          "⚠️ [VOTER ID] Registration failed, but checking localStorage for voter ID..."
        );
        const storedVoterId = localStorage.getItem(`voter_id_${id}`);
        if (storedVoterId) {
          console.log("🎯 [VOTER ID] Found stored voter ID:", storedVoterId);
        }
      }

      // Send voter ID email
      console.log("[REGISTRATION FLOW] Sending voter ID email");
      const emailResponse = await ballotService.sendVoterIdEmail(id, {
        name: fullName,
        email: voterInfo.email,
      });

      console.log(
        "[REGISTRATION FLOW] Voter ID email response:",
        emailResponse
      );

      // Log voter ID from email response if available
      if (emailResponse?.voterId) {
        console.log(
          "📧 [VOTER ID EMAIL] Voter ID sent via email:",
          emailResponse.voterId
        );
      }

      // Move to verified screen
      logFlowTransition("confirm", "verified", { success: true });
      setCurrentScreen("verified");
    } catch (err) {
      console.error(
        "[REGISTRATION FLOW] Error in voter registration/email flow:",
        err
      );
      setError("Failed to complete registration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Start voting with digital key
  const handleStartVoting = () => {
    logFlowTransition("verified", "voting");
    navigate(`/vote/${id}/${slug}`);
  };

  // Render current screen
  if (loading && !ballot) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Box sx={{ p: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        </Box>
      </Container>
    );
  }

  // Render the appropriate screen based on current state
  switch (currentScreen) {
    case "identity":
      logFlowTransition("entry", "identity");
      return (
        <VerifyIdentity
          onComplete={handleIdentityComplete}
          onBack={() => navigate(`/voter-registration/${id}/${slug}`)}
        />
      );
    case "scan":
      logFlowTransition("identity", "scan");
      return (
        <RegistrationBlinkIDStep
          onComplete={handleScanComplete}
          onError={(error) => {
            console.error("[REGISTRATION FLOW] Scan error:", error);
            setError(error.message || "Document scanning failed");
          }}
          onBack={() => setCurrentScreen("identity")}
          ballotId={id}
        />
      );
    case "confirm":
      logFlowTransition("scan", "confirm");
      return (
        <ConfirmInfo
          idData={scannedIdData}
          onConfirm={handleConfirmComplete}
          onBack={() => setCurrentScreen("scan")}
          loading={loading}
        />
      );
    case "verified":
      logFlowTransition("confirm", "verified");
      return (
        <VerifiedScreen
          flow="registration"
          ballotInfo={ballot}
          voterInfo={voterInfo}
        />
      );
    default:
      return (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Alert severity="error">
            Something went wrong. Please refresh the page.
          </Alert>
        </Box>
      );
  }
};

export default RegistrationFlowRouter;
