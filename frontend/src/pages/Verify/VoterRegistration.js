import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { authService, ballotService } from "../../services/api";

const VoterRegistration = () => {
  const { id, slug } = useParams();
  const navigate = useNavigate();

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNameChange = (e) => {
    setName(e.target.value);
  };

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

    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Register using the voter-specific registration function
      const response = await authService.voterRegister({
        name,
        email,
        password,
      });

      console.log("Voter registration successful:", response);

      // Save authentication state handling is now done inside the voterRegister function

      // Now that the user is registered and token is set, register them as a voter for this ballot
      try {
        console.log("Registering user as voter for ballot:", id);
        const voterResponse = await ballotService.registerVoter(id);
        console.log("Voter registration response:", voterResponse);
      } catch (voterError) {
        console.error("Error registering as voter for ballot:", voterError);
        // Continue even if voter registration fails - we'll try again later
      }

      // After successful registration, redirect to pre-registration flow
      navigate(`/preregister/${id}/${slug}`);
    } catch (err) {
      console.error("Registration error:", err);

      // Show detailed error information
      if (err.response && err.response.data) {
        console.error("Error details:", err.response.data);
        if (err.response.data.errors) {
          const errorMsg = err.response.data.errors
            .map((e) => `${e.path}: ${e.msg}`)
            .join(", ");
          setError(errorMsg);
        } else {
          setError(err.response.data.message || "Registration failed");
        }
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginClick = () => {
    // Redirect to voter login page, preserving the ballot information
    navigate(`/voter/login?redirect=/preregister/${id}/${slug}`);
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
            Voter Registration
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Register to vote in this election
          </Typography>

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
                onChange={handleNameChange}
                sx={{ mb: 3 }}
              />

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
              {loading ? "Signing up..." : "Sign up"}
            </Button>
          </form>

          <Typography variant="body2" color="text.secondary">
            Already have an account?{" "}
            <Link
              component="button"
              variant="body2"
              onClick={handleLoginClick}
              sx={{ fontWeight: 500 }}
            >
              Log in
            </Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default VoterRegistration;
