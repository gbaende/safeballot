import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  TextField,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  CircularProgress,
  Divider,
  Alert,
  IconButton,
  Tooltip,
  InputAdornment,
} from "@mui/material";
import { ContentCopy, Refresh, Link as LinkIcon } from "@mui/icons-material";
import { ballotService } from "../../services/api";

const AccessKeyGenerator = ({ ballotId, onKeyGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [maxUsage, setMaxUsage] = useState("");
  const [limitUsage, setLimitUsage] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharableLink, setSharableLink] = useState("");

  // Generate the sharable link when access key changes
  useEffect(() => {
    if (accessKey) {
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/ballot/access/${accessKey}`;
      setSharableLink(link);
    } else {
      setSharableLink("");
    }
  }, [accessKey]);

  // Generate a new access key
  const handleGenerateKey = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setCopied(false);

      // Prepare options
      const options = {};
      if (limitUsage && maxUsage) {
        options.maxUsage = parseInt(maxUsage, 10);
      }

      const response = await ballotService.generateAccessKey(ballotId, options);

      if (response.status === "success" && response.data) {
        setAccessKey(response.data.accessKey);
        setSuccess("Access key generated successfully");
        if (onKeyGenerated) {
          onKeyGenerated(response.data.accessKey);
        }
      } else {
        setError(response.message || "Failed to generate access key");
      }
    } catch (err) {
      console.error("Error generating access key:", err);
      setError(err.message || "Failed to generate access key");
    } finally {
      setLoading(false);
    }
  };

  // Copy the access key to clipboard
  const handleCopyKey = () => {
    navigator.clipboard.writeText(accessKey).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => {
        console.error("Failed to copy text: ", err);
      }
    );
  };

  // Copy the sharable link to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(sharableLink).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => {
        console.error("Failed to copy text: ", err);
      }
    );
  };

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Ballot Access Key
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Generate a secure access key for voters to access this ballot without
          needing to create an account first.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={limitUsage}
                onChange={(e) => setLimitUsage(e.target.checked)}
              />
            }
            label="Limit usage count"
          />

          {limitUsage && (
            <TextField
              label="Maximum uses"
              type="number"
              value={maxUsage}
              onChange={(e) => setMaxUsage(e.target.value)}
              variant="outlined"
              size="small"
              InputProps={{ inputProps: { min: 1 } }}
              sx={{ ml: 2, width: 120 }}
            />
          )}
        </Box>

        <Button
          variant="contained"
          onClick={handleGenerateKey}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
        >
          {loading ? "Generating..." : "Generate Access Key"}
        </Button>

        {accessKey && (
          <>
            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" gutterBottom>
              Access Key
            </Typography>

            <TextField
              fullWidth
              value={accessKey}
              variant="outlined"
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={copied ? "Copied!" : "Copy to clipboard"}>
                      <IconButton onClick={handleCopyKey} edge="end">
                        <ContentCopy />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            <Typography variant="subtitle1" gutterBottom>
              Shareable Link
            </Typography>

            <TextField
              fullWidth
              value={sharableLink}
              variant="outlined"
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={copied ? "Copied!" : "Copy to clipboard"}>
                      <IconButton onClick={handleCopyLink} edge="end">
                        <ContentCopy />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                startIcon={<LinkIcon />}
                onClick={() => window.open(sharableLink, "_blank")}
              >
                Test Link
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AccessKeyGenerator;
