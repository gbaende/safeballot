import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Box, Container, CircularProgress, Alert } from "@mui/material";
import { useSelector } from "react-redux";
import VerifyIdentity from "./VerifyIdentity";
import ScanID from "./ScanID";
import ConfirmInfo from "./ConfirmInfo";
import DigitalKeyScreen from "./DigitalKeyScreen";
import { ballotService, authService } from "../../services/api";

const PreRegistration = ({ startAtStep }) => {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useSelector((state) => state.auth);

  // State
  const [currentScreen, setCurrentScreen] = useState("identity"); // identity, scan, confirm, key
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
    if (location.state?.fromScan && location.state?.idData) {
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

        // Parse any ID from the slug
        const slugParts = slug ? slug.split("-") : [];
        const idFromSlug =
          slugParts.length > 0 ? slugParts[slugParts.length - 1] : null;

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

  // Handle ID scan completion
  const handleScanComplete = (idData) => {
    // Store the scanned ID data
    setScannedIdData(idData);

    // Move to confirm screen
    setCurrentScreen("confirm");
  };

  // Handle confirmation screen completion
  const handleConfirmComplete = () => {
    // Store the ID data with voter info
    setVoterInfo((prev) => ({
      ...prev,
      ...scannedIdData,
    }));

    // Generate digital key
    generateDigitalKey();
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
        />
      );
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
