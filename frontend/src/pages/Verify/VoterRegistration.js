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
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { authService } from "../../services/api";

const VoterRegistration = () => {
  const { id, slug } = useParams();
  const navigate = useNavigate();

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
      // Register the voter
      const response = await authService.register({
        email,
        password,
        role: "voter",
      });

      console.log("Registration successful:", response);

      // Save authentication state if needed
      if (response.data && response.data.token) {
        localStorage.setItem("token", response.data.token);
        if (response.data.user) {
          localStorage.setItem("user", JSON.stringify(response.data.user));
        }
      }

      // After successful registration, redirect to pre-registration flow
      // which will show the VerifyIdentity screen
      navigate(`/preregister/${id}/${slug}`);
    } catch (err) {
      console.error("Registration error:", err);
      setError(
        err.response?.data?.message || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoginClick = () => {
    // Redirect to login page, preserving the ballot information
    navigate(`/login?redirect=/preregister/${id}/${slug}`);
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
              e.target.src = "https://via.placeholder.com/60?text=SB";
              e.target.onerror = null;
            }}
          />

          <Typography variant="h5" component="h1" gutterBottom>
            Get Started
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Welcome to SafeBallot - Let's create your account
          </Typography>

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

            {error && (
              <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}

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
