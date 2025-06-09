import React, { useState } from "react";
import { useSelector } from "react-redux";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import {
  clearPersistedState,
  checkAuthStateStructure,
} from "../../utils/clearPersistedState";

const StateDebugger = () => {
  const auth = useSelector((state) => state.auth);
  const [stateCheck, setStateCheck] = useState(null);
  const [lastCleared, setLastCleared] = useState(null);

  // Only show in development
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const handleCheckState = () => {
    const result = checkAuthStateStructure();
    setStateCheck(result);
  };

  const handleClearState = () => {
    if (
      window.confirm(
        "This will clear all persisted Redux state and refresh the page. Continue?"
      )
    ) {
      const success = clearPersistedState();
      if (success) {
        setLastCleared(new Date().toLocaleTimeString());
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    }
  };

  const getFlowStatus = (flow, flowName) => {
    if (!flow) {
      return <Chip label="Missing" color="error" size="small" />;
    }
    if (typeof flow !== "object") {
      return <Chip label="Invalid Type" color="error" size="small" />;
    }
    const hasRequiredProps =
      "loading" in flow && "error" in flow && "step" in flow;
    return hasRequiredProps ? (
      <Chip label="Valid" color="success" size="small" />
    ) : (
      <Chip label="Incomplete" color="warning" size="small" />
    );
  };

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 16,
        left: 16,
        zIndex: 9999,
        maxWidth: 400,
      }}
    >
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🔧 Redux State Debugger
          </Typography>

          {/* State Structure Check */}
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Auth Flow States:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Box>
                  <Typography variant="caption">Registration:</Typography>
                  {getFlowStatus(auth?.registrationFlow, "registration")}
                </Box>
                <Box>
                  <Typography variant="caption">Login:</Typography>
                  {getFlowStatus(auth?.loginFlow, "login")}
                </Box>
              </Stack>
            </Box>

            {/* State Check Results */}
            {stateCheck && (
              <Alert
                severity={stateCheck.isValid ? "success" : "warning"}
                icon={stateCheck.isValid ? <CheckIcon /> : <ErrorIcon />}
              >
                <Typography variant="body2">{stateCheck.message}</Typography>
                {!stateCheck.isValid && (
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Registration Flow:{" "}
                    {stateCheck.hasRegistrationFlow ? "✓" : "✗"}
                    <br />
                    Login Flow: {stateCheck.hasLoginFlow ? "✓" : "✗"}
                  </Typography>
                )}
              </Alert>
            )}

            {/* Action Buttons */}
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleCheckState}
              >
                Check State
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleClearState}
              >
                Clear & Reload
              </Button>
            </Stack>

            {lastCleared && (
              <Alert severity="info">
                State cleared at {lastCleared}. Reloading...
              </Alert>
            )}

            {/* Detailed State Inspector */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">Inspect Current State</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ maxHeight: 200, overflow: "auto" }}>
                  <pre style={{ fontSize: "10px", margin: 0 }}>
                    {JSON.stringify(auth, null, 2)}
                  </pre>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default StateDebugger;
