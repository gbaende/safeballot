import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { ballotService, voterService } from "../../services/api";

const AccessKeyRegistration = () => {
  const { accessKey } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ballotInfo, setBallotInfo] = useState(null);

  // Validate the access key on component mount
  useEffect(() => {
    const validateKey = async () => {
      try {
        setValidating(true);
        setError("");

        // If we already have a valid voter token, redirect to the voting page
        if (voterService.hasValidVoterToken()) {
          const voter = voterService.getVoterInfo();
          if (voter && voter.ballotId) {
            navigate(`/vote/${voter.ballotId}`);
            return;
          }
        }

        // Extract access key from URL or query param
        let keyToValidate = accessKey;

        // If no access key in URL, check query params
        if (!keyToValidate) {
          const params = new URLSearchParams(location.search);
          keyToValidate = params.get("key");
        }

        if (!keyToValidate) {
          setError("No access key provided");
          setValidating(false);
          setLoading(false);
          return;
        }

        console.log(
          `Validating access key: ${keyToValidate.substring(0, 8)}...`
        );
        const response = await ballotService.validateAccessKey(keyToValidate);

        if (response.status === "success" && response.data) {
          setBallotInfo(response.data);
          console.log("Ballot info:", response.data);
        } else {
          setError("Invalid or expired access key");
        }
      } catch (err) {
        console.error("Error validating access key:", err);
        setError(err.message || "Failed to validate access key");
      } finally {
        setValidating(false);
        setLoading(false);
      }
    };

    validateKey();
  }, [accessKey, location.search, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !password) {
      setError("Please fill out all fields");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      // Extract access key from URL or query param
      let keyToUse = accessKey;

      // If no access key in URL, check query params
      if (!keyToUse) {
        const params = new URLSearchParams(location.search);
        keyToUse = params.get("key");
      }

      if (!keyToUse) {
        setError("No access key provided");
        return;
      }

      // Register the voter with the access key
      const response = await ballotService.registerWithAccessKey({
        accessKey: keyToUse,
        name,
        email,
        password,
      });

      if (response.status === "success" && response.data) {
        console.log("Registration successful:", response.data);

        // Navigate to the voting page
        navigate(`/vote/${response.data.ballot.id}`);
      } else {
        setError(response.message || "Registration failed");
      }
    } catch (err) {
      console.error("Error registering voter:", err);
      setError(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  // If we're still validating the access key, show loading
  if (validating) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Validating access key...
        </Typography>
      </Box>
    );
  }

  // If there's an error with the access key
  if (!loading && !ballotInfo) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          bgcolor: "background.default",
          p: 3,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2,
            maxWidth: 500,
            width: "100%",
          }}
        >
          <Typography variant="h5" align="center" sx={{ mb: 2 }}>
            Access Key Error
          </Typography>

          <Alert severity="error" sx={{ mb: 3 }}>
            {error || "Invalid or expired access key"}
          </Alert>

          <Typography variant="body1" sx={{ mb: 2 }}>
            The access key you provided is invalid or has expired. Please
            contact the ballot administrator for a valid access key.
          </Typography>

          <Button
            variant="contained"
            fullWidth
            onClick={() => navigate("/")}
            sx={{ mt: 2 }}
          >
            Return to Home
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        bgcolor: "background.default",
        p: 3,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2,
            textAlign: "center",
          }}
        >
          {/* Logo */}
          <Box
            component="img"
            src="/images/logo.svg"
            alt="SafeBallot Logo"
            sx={{
              width: 60,
              height: 60,
              mb: 3,
            }}
            onError={(e) => {
              e.target.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%234b5563'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='%23ffffff'%3ESB%3C/text%3E%3C/svg%3E";
              e.target.onerror = null;
            }}
          />

          <Typography variant="h5" component="h1" gutterBottom>
            Register to Vote
          </Typography>

          {ballotInfo && (
            <Typography variant="body1" sx={{ mb: 3 }}>
              You're registering for: <strong>{ballotInfo.title}</strong>
            </Typography>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" align="left" sx={{ mb: 1 }}>
                Full Name
              </Typography>
              <TextField
                fullWidth
                placeholder="John Doe"
                variant="outlined"
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ mb: 3 }}
                required
              />

              <Typography variant="body2" align="left" sx={{ mb: 1 }}>
                Email
              </Typography>
              <TextField
                fullWidth
                placeholder="email@example.com"
                variant="outlined"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                sx={{ mb: 3 }}
                required
              />

              <Typography variant="body2" align="left" sx={{ mb: 1 }}>
                Password
              </Typography>
              <TextField
                fullWidth
                placeholder="•••••••"
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={submitting}
              sx={{
                py: 1.5,
                mb: 2,
                bgcolor: "#6b7280",
                "&:hover": { bgcolor: "#4b5563" },
              }}
            >
              {submitting ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1, color: "white" }} />
                  Registering...
                </>
              ) : (
                "Register & Continue"
              )}
            </Button>
          </form>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            By registering, you agree to the terms and conditions of this voting
            system.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default AccessKeyRegistration;
