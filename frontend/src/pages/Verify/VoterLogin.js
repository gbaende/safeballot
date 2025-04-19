import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Link,
  InputAdornment,
  IconButton,
  Alert,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { authService } from "../../services/api";

const VoterLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract redirect URL from query parameters if available
  const queryParams = new URLSearchParams(location.search);
  const redirectUrl = queryParams.get("redirect") || "/voter/dashboard";

  console.log("Voter login - redirect URL:", redirectUrl);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("Attempting voter login with email:", email);

      // Login using the voter-specific login function with correct parameters
      const response = await authService.voterLogin(email, password);

      console.log("Voter login successful:", response);

      // Check if the redirect URL is to a preregister page
      if (redirectUrl && redirectUrl.includes("/preregister/")) {
        console.log("Redirecting to preregistration page:", redirectUrl);
        navigate(redirectUrl);
      } else {
        // Default fallback
        console.log("Redirecting to default page:", redirectUrl);
        navigate(redirectUrl);
      }
    } catch (err) {
      console.error("Login error:", err);

      // Show detailed error information
      if (err.response && err.response.data) {
        console.error("Error details:", err.response.data);
        setError(err.response.data.message || "Login failed");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Extract ballot ID and slug from the redirect URL if it's a preregister URL
  let ballotId = null;
  let ballotSlug = null;

  if (redirectUrl && redirectUrl.startsWith("/preregister/")) {
    const parts = redirectUrl.split("/");
    if (parts.length >= 4) {
      ballotId = parts[2];
      ballotSlug = parts[3];
    }
  }

  const handleRegisterClick = () => {
    // If we have a ballot ID and slug, redirect to the voter registration page
    if (ballotId && ballotSlug) {
      navigate(`/register/${ballotId}/${ballotSlug}`);
    } else {
      // Otherwise redirect to a general voter registration page
      // This might need to be adjusted based on your app's flow
      navigate("/voter/register");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(to right, #1e293b, #3b5998)",
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
          {/* SafeBallot Logo */}
          <Box
            component="img"
            src="/logo-shield.png"
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
            Voter Login
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Log in to access your ballot
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" align="left" sx={{ mb: 1 }}>
                Email
              </Typography>
              <TextField
                fullWidth
                placeholder="email@email.com"
                variant="outlined"
                value={email}
                onChange={handleEmailChange}
                type="email"
                sx={{ mb: 3 }}
              />

              <Typography variant="body2" align="left" sx={{ mb: 1 }}>
                Password
              </Typography>
              <TextField
                fullWidth
                placeholder="•••••••"
                variant="outlined"
                value={password}
                onChange={handlePasswordChange}
                type={showPassword ? "text" : "password"}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={togglePasswordVisibility} edge="end">
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
              disabled={loading}
              sx={{
                py: 1.5,
                mb: 2,
                bgcolor: "#6b7280",
                "&:hover": { bgcolor: "#4b5563" },
              }}
            >
              {loading ? "Logging in..." : "Log in"}
            </Button>
          </form>

          <Typography variant="body2" color="text.secondary">
            Don't have an account?{" "}
            <Link
              component="button"
              variant="body2"
              onClick={handleRegisterClick}
              sx={{ fontWeight: 500 }}
            >
              Sign up
            </Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default VoterLogin;
