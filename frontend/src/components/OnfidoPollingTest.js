import React, { useState } from "react";
import {
  Button,
  Container,
  Alert,
  Card,
  CardHeader,
  CardContent,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Grid,
  Paper,
} from "@mui/material";
import onfidoService from "../services/onfidoService";

const OnfidoPollingTest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [applicantId, setApplicantId] = useState("");
  const [documentIds, setDocumentIds] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [waitTime, setWaitTime] = useState(2);

  const handleCreateApplicant = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Create a test applicant
      const applicantResponse = await onfidoService.createApplicant(
        "Test",
        "User",
        `test-${Date.now()}@example.com`
      );

      if (!applicantResponse.success) {
        throw new Error(
          applicantResponse.error || "Failed to create applicant"
        );
      }

      setApplicantId(applicantResponse.data.id);
      setResult({
        message: `Created test applicant with ID: ${applicantResponse.data.id}`,
        applicant: applicantResponse.data,
      });
    } catch (err) {
      setError(err.message || "An error occurred creating the applicant");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCheckAndPoll = async () => {
    if (!applicantId) {
      setError("Please create or enter an applicant ID first");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Parse document IDs
      const docIds = documentIds
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id);

      // Call our new polling function
      const response = await onfidoService.createCheckAndPoll(
        applicantId,
        docIds,
        parseInt(maxAttempts),
        parseInt(waitTime)
      );

      setResult({
        success: response.success,
        message: response.success
          ? `Check created and polling completed`
          : `Error: ${response.error}`,
        data: response.data,
      });

      if (!response.success) {
        setError(response.error || "Failed to create and poll check");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 5, mb: 5 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Onfido Polling Test
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Test the new createCheckAndPoll functionality
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 4 }}>
        <CardHeader title="Step 1: Create Test Applicant" />
        <CardContent>
          <Button
            variant="contained"
            onClick={handleCreateApplicant}
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? "Creating..." : "Create Test Applicant"}
          </Button>
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardHeader title="Step 2: Create Check with Polling" />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Applicant ID"
                value={applicantId}
                onChange={(e) => setApplicantId(e.target.value)}
                placeholder="Enter applicant ID"
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Document IDs (comma separated)"
                value={documentIds}
                onChange={(e) => setDocumentIds(e.target.value)}
                placeholder="Optional: document-id-1, document-id-2"
                variant="outlined"
                helperText="Leave empty if you haven't uploaded documents yet"
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Max Polling Attempts"
                type="number"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
                InputProps={{ inputProps: { min: 1, max: 20 } }}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Wait Time Between Attempts (seconds)"
                type="number"
                value={waitTime}
                onChange={(e) => setWaitTime(e.target.value)}
                InputProps={{ inputProps: { min: 1, max: 10 } }}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreateCheckAndPoll}
                disabled={loading || !applicantId}
                startIcon={loading && <CircularProgress size={20} />}
              >
                {loading ? "Processing..." : "Create Check & Poll"}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader title="Result" />
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {result.message}
            </Typography>
            <Paper
              elevation={0}
              sx={{
                mt: 3,
                p: 2,
                bgcolor: "#f5f5f5",
                maxHeight: "400px",
                overflow: "auto",
              }}
            >
              <Box component="pre" sx={{ m: 0 }}>
                {JSON.stringify(result, null, 2)}
              </Box>
            </Paper>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default OnfidoPollingTest;
