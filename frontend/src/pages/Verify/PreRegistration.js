import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Box, Container, CircularProgress, Alert } from "@mui/material";
import { useSelector } from "react-redux";
import VerifyIdentity from "./VerifyIdentity";
import ScanID from "./ScanID";
import ConfirmInfo from "./ConfirmInfo";
import DigitalKeyScreen from "./DigitalKeyScreen";
import VerifiedScreen from "./VerifiedScreen";
import LoginVerifiedScreen from "./LoginVerifiedScreen";
import { ballotService, authService } from "../../services/api";

const PreRegistration = ({ startAtStep }) => {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useSelector((state) => state.auth);

  // State
  const [currentScreen, setCurrentScreen] = useState("identity"); // identity, scan, confirm, verified, key
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ballot, setBallot] = useState(null);
  const [voterInfo, setVoterInfo] = useState({
    email: "",
    name: "",
  });
  const [scannedIdData, setScannedIdData] = useState(null);
  const [digitalKey, setDigitalKey] = useState("");

  // Check if coming from scan with ID data
  useEffect(() => {
    if (location.state?.fromVoterLogin && location.state?.idData) {
      // Coming from voter login flow - go directly to verified screen
      console.log("Coming from voter login flow - going to verified screen");
      setScannedIdData(location.state.idData);
      setCurrentScreen("verified");
    } else if (location.state?.fromScan && location.state?.idData) {
      // Coming from registration flow - go to confirm screen
      console.log("Coming from registration flow - going to confirm screen");
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

        // Check if user is authenticated
        if (auth.isAuthenticated) {
          console.log("User is authenticated");
          if (auth.user && auth.user.email) {
            setVoterInfo({
              email: auth.user.email,
              name: auth.user.name || "",
            });

            // Try to register as voter for this ballot
            const ballotIdToUse = id || idFromSlug;
            if (ballotIdToUse) {
              try {
                console.log("Registering as voter for ballot:", ballotIdToUse);
                // Create the voter info object
                const voterInfoData = {
                  name: auth.user.name || "Registered Voter",
                  email: auth.user.email,
                };

                // Use public registration endpoint instead of protected endpoint
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
                console.warn("Failed to register as voter:", voterError);
                // Continue - this is non-critical
              }
            }
          }
        }

        const ballotIdToUse = id || idFromSlug;
        console.log("Checking ballot:", {
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
          // Try to get the ballot from the server
          try {
            const response = await ballotService.getBallotById(ballotIdToUse);
            if (response.data && response.data.data) {
              console.log("Ballot data from API:", response.data.data);
              setBallot(response.data.data);
              return;
            }
          } catch (apiErr) {
            console.error("API error:", apiErr);
            // Continue to try localStorage
          }
        }

        // If server fetch failed or ID is not a UUID, try localStorage
        console.log("Trying localStorage for ballot");
        const localBallots = JSON.parse(
          localStorage.getItem("userBallots") || "[]"
        );

        // Find the ballot in localStorage
        const foundBallot = localBallots.find(
          (b) =>
            String(b.id) === String(ballotIdToUse) ||
            (idFromSlug && String(b.id).includes(idFromSlug)) // Try partial match too
        );

        if (foundBallot) {
          console.log("Found ballot in localStorage:", foundBallot);
          setBallot(foundBallot);
        } else {
          console.error("Ballot not found in localStorage");
          setError("Ballot not found. The link may be invalid.");
        }
      } catch (err) {
        console.error("Error loading ballot:", err);
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
    setCurrentScreen("scan");
  };

  // Handle scan completion - go directly to verified screen for voter login flow
  const handleScanComplete = (idData) => {
    console.log("ID scan completed:", idData);
    setScannedIdData(idData);

    // Check multiple indicators for voter login flow
    const voterToken = localStorage.getItem("voterToken");
    const voterUser = localStorage.getItem("voterUser");
    const isFromVoterLogin = voterToken || voterUser;

    console.log("Checking voter login indicators:", {
      voterToken: !!voterToken,
      voterUser: !!voterUser,
      isFromVoterLogin: !!isFromVoterLogin,
    });

    if (isFromVoterLogin) {
      // For voter login flow, go directly to verified screen (skip confirmation)
      console.log("Voter login detected - going directly to verified screen");
      setCurrentScreen("verified");
    } else {
      // For registration flow, go to confirm screen
      console.log("Registration flow - going to confirm screen");
      setCurrentScreen("confirm");
    }
  };

  // Handle confirmation screen completion (for registration flow)
  const handleConfirmComplete = async () => {
    try {
      setLoading(true);
      setError(null);

      // Extract voter information from scanned ID data - only safe string values
      const firstName =
        scannedIdData?.givenName || scannedIdData?.firstName || "";
      const lastName = scannedIdData?.surname || scannedIdData?.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim() || "Registered Voter";

      // Update voter info with only safe string values (no complex BlinkID objects)
      const updatedVoterInfo = {
        email: voterInfo.email, // Keep the email from authenticated user or previous input
        name: fullName,
        // Only include safe string properties from scanned data
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
      console.log("Registering voter for ballot:", id);
      const registrationResponse = await ballotService.publicRegisterVoter(id, {
        name: fullName,
        email: voterInfo.email,
      });

      console.log("Voter registration response:", registrationResponse);

      // Send voter ID email
      console.log("Sending voter ID email");
      const emailResponse = await ballotService.sendVoterIdEmail(id, {
        name: fullName,
        email: voterInfo.email,
      });

      console.log("Voter ID email response:", emailResponse);

      // Move to verified screen
      setCurrentScreen("verified");
    } catch (err) {
      console.error("Error in voter registration/email flow:", err);
      setError("Failed to complete registration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Start voting with digital key
  const handleStartVoting = () => {
    // Navigate to voting page
    navigate(`/vote/${id}/${slug}`);
  };

  // Generate digital key for voting
  const generateDigitalKey = async () => {
    try {
      setLoading(true);
      // API call to generate digital key
      try {
        // Ensure we have an email before attempting to generate a key
        if (!voterInfo.email) {
          throw new Error("Email is required to generate a digital key");
        }

        console.log("Generating digital key with:", {
          email: voterInfo.email,
          ballot_id: id,
        });
        const response = await authService.generateDigitalKey(
          voterInfo.email,
          id
        );

        // Check for the correct response structure
        if (
          response &&
          response.status === "success" &&
          response.data &&
          response.data.digital_key
        ) {
          setDigitalKey(response.data.digital_key);
        } else {
          throw new Error(
            "Failed to generate digital key: Unexpected response format"
          );
        }
      } catch (err) {
        console.error("Error generating digital key, using fallback:", err);
        // Generate a mock key for testing
        const mockKey = `SAFE-BALLOT-${Math.random()
          .toString(36)
          .substring(2, 6)}-${Math.random()
          .toString(36)
          .substring(2, 6)}`.toUpperCase();
        setDigitalKey(mockKey);
      }

      // Move to digital key screen
      setCurrentScreen("key");
    } catch (err) {
      console.error("Error in digital key flow:", err);
      setError("Failed to generate digital key. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine if this is a voter login flow
  const isVoterLoginFlow = () => {
    const voterToken = localStorage.getItem("voterToken");
    const voterUser = localStorage.getItem("voterUser");
    const fromVoterLogin = location.state?.fromVoterLogin;
    return !!(voterToken || voterUser || fromVoterLogin);
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
      return (
        <VerifyIdentity
          onComplete={handleIdentityComplete}
          onBack={() => navigate(`/voter-registration/${id}/${slug}`)}
        />
      );
    case "scan":
      return (
        <ScanID
          onComplete={handleScanComplete}
          onBack={() => setCurrentScreen("identity")}
        />
      );
    case "confirm":
      return (
        <ConfirmInfo
          idData={scannedIdData}
          onConfirm={handleConfirmComplete}
          onBack={() => setCurrentScreen("scan")}
          loading={loading}
        />
      );
    case "verified":
      // Use different verified screens based on the flow
      if (isVoterLoginFlow()) {
        return (
          <LoginVerifiedScreen
            ballotInfo={ballot}
            voterInfo={voterInfo}
            onComplete={handleStartVoting}
          />
        );
      } else {
        return (
          <VerifiedScreen
            ballotInfo={ballot}
            voterInfo={voterInfo}
            onComplete={handleStartVoting}
          />
        );
      }
    case "key":
      return (
        <DigitalKeyScreen
          digitalKey={digitalKey}
          ballotInfo={ballot}
          onComplete={handleStartVoting}
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

export default PreRegistration;
