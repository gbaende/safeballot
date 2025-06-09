import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Box, Container, CircularProgress, Alert } from "@mui/material";
import { useSelector } from "react-redux";
import LoginBlinkIDStep from "../../components/Verification/LoginBlinkIDStep";
import LoginVerifiedScreen from "./LoginVerifiedScreen";
import { ballotService } from "../../services/api";

const LoginFlowRouter = () => {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useSelector((state) => state.auth);

  // State
  const [currentScreen, setCurrentScreen] = useState("scan"); // scan, verified
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
    console.log(`[LOGIN FLOW] Transition: ${from} → ${to}`, {
      ballotId: id,
      timestamp: new Date().toISOString(),
      ...data,
    });
  };

  // Verify this is a voter login flow
  const isVoterLoginFlow = () => {
    const voterToken = localStorage.getItem("voterToken");
    const voterUser = localStorage.getItem("voterUser");
    const fromVoterLogin = location.state?.fromVoterLogin;
    return !!(voterToken || voterUser || fromVoterLogin);
  };

  // Check if coming from scan with ID data
  useEffect(() => {
    if (location.state?.fromVoterLogin && location.state?.idData) {
      console.log(
        "[LOGIN FLOW] Coming from voter login - going directly to verified screen"
      );
      logFlowTransition("scan", "verified", {
        hasIdData: true,
        skipConfirm: true,
      });
      setScannedIdData(location.state.idData);
      setCurrentScreen("verified");
    }
  }, [location]);

  // Verify voter login flow on mount
  useEffect(() => {
    if (!isVoterLoginFlow()) {
      console.warn(
        "[LOGIN FLOW] Not a voter login flow - redirecting to registration"
      );
      navigate(`/verify-registration/${id}/${slug}`);
      return;
    }

    console.log("[LOGIN FLOW] Confirmed voter login flow");
    logFlowTransition("entry", "scan", { voterLoginConfirmed: true });
  }, [id, slug, navigate]);

  // Load ballot and voter info
  useEffect(() => {
    const loadBallotAndVoterInfo = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load voter info from localStorage
        const voterUser = localStorage.getItem("voterUser");
        if (voterUser) {
          try {
            const userData = JSON.parse(voterUser);
            setVoterInfo({
              email: userData.email || "",
              name: userData.name || "",
            });
            console.log("[LOGIN FLOW] Loaded voter info:", userData);
          } catch (e) {
            console.warn("[LOGIN FLOW] Error parsing voter user data:", e);
          }
        }

        // Parse any ID from the slug first
        const slugParts = slug ? slug.split("-") : [];
        const idFromSlug =
          slugParts.length > 0 ? slugParts[slugParts.length - 1] : null;

        const ballotIdToUse = id || idFromSlug;
        console.log("[LOGIN FLOW] Loading ballot:", {
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
                "[LOGIN FLOW] Ballot data from API:",
                response.data.data
              );
              setBallot(response.data.data);
              return;
            }
          } catch (apiErr) {
            console.error("[LOGIN FLOW] API error:", apiErr);
          }
        }

        // If server fetch failed or ID is not a UUID, try localStorage
        console.log("[LOGIN FLOW] Trying localStorage for ballot");
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
            "[LOGIN FLOW] Found ballot in localStorage:",
            foundBallot
          );
          setBallot(foundBallot);
        } else {
          console.error("[LOGIN FLOW] Ballot not found in localStorage");
          setError("Ballot not found. The link may be invalid.");
        }
      } catch (err) {
        console.error("[LOGIN FLOW] Error loading ballot:", err);
        setError(
          "Failed to load election information. The link may be invalid."
        );
      } finally {
        setLoading(false);
      }
    };

    loadBallotAndVoterInfo();
  }, [id, slug]);

  // Handle scan completion - go directly to verified for login flow
  const handleScanComplete = (idData) => {
    console.log("[LOGIN FLOW] ID scan completed:", idData);
    logFlowTransition("scan", "verified", {
      hasIdData: !!idData,
      skipConfirm: true,
    });
    setScannedIdData(idData);
    setCurrentScreen("verified");
  };

  // Start voting with digital key
  const handleStartVoting = () => {
    logFlowTransition("verified", "voting");
    navigate(`/vote/${id}/${slug}`);
  };

  // Handle back navigation
  const handleBack = () => {
    if (currentScreen === "verified") {
      logFlowTransition("verified", "scan");
      setCurrentScreen("scan");
    } else {
      // Go back to voter login
      navigate("/voter/login");
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
    case "scan":
      logFlowTransition("entry", "scan");
      return (
        <LoginBlinkIDStep
          onComplete={handleScanComplete}
          onError={(error) => {
            console.error("[LOGIN FLOW] Scan error:", error);
            setError(error.message || "Document scanning failed");
          }}
          onBack={handleBack}
          ballotId={id}
        />
      );
    case "verified":
      logFlowTransition("scan", "verified");
      return (
        <LoginVerifiedScreen
          ballotInfo={ballot}
          voterInfo={voterInfo}
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

export default LoginFlowRouter;
