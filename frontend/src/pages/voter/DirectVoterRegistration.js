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

const DirectVoterRegistration = () => {
  const { id, slug } = useParams();
  const navigate = useNavigate();

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Simple handlers
  const handleNameChange = (e) => setName(e.target.value);
  const handleEmailChange = (e) => setEmail(e.target.value);
  const handlePasswordChange = (e) => setPassword(e.target.value);
  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form fields
    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // ---------- STEP 1: Register user ----------
      // Using the exact same approach that worked in the test page
      const registerUrl = "http://localhost:8080/api/auth/register";
      const registerData = {
        name: name.trim(),
        email: email.trim(),
        password: password,
        role: "voter",
      };

      console.log("Registering with data:", registerData);

      const registerResponse = await fetch(registerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerData),
      });

      const responseText = await registerResponse.text();
      console.log("Raw server response:", responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log("Parsed response data:", responseData);
      } catch (e) {
        console.error("Failed to parse response:", e);
        setError("Server returned an invalid response");
        setLoading(false);
        return;
      }

      if (!registerResponse.ok) {
        console.error(
          "Registration failed:",
          registerResponse.status,
          responseData
        );

        if (responseData.errors && responseData.errors.length > 0) {
          const errorMsg = responseData.errors
            .map((err) => `${err.path}: ${err.msg}`)
            .join(", ");
          setError(errorMsg);
        } else {
          setError(responseData.message || "Registration failed");
        }

        setLoading(false);
        return;
      }

      console.log("Registration successful:", responseData);

      // Save auth data
      if (responseData.data && responseData.data.token) {
        localStorage.setItem("token", responseData.data.token);
        if (responseData.data.user) {
          localStorage.setItem("user", JSON.stringify(responseData.data.user));
        }
      }

      // IMPORTANT: Store voter information in localStorage for voting process
      // Store both in ballot-specific storage and general storage
      const voterInfo = {
        name: name.trim(),
        email: email.trim(),
      };

      // Store for this specific ballot
      localStorage.setItem(`voter_info_${id}`, JSON.stringify(voterInfo));

      // Also store in session storage and general localStorage for fallback
      sessionStorage.setItem("voterInfo", JSON.stringify(voterInfo));
      localStorage.setItem("voterInfo", JSON.stringify(voterInfo));

      // Store verified email and name separately for another fallback option
      localStorage.setItem(`verified_email_${id}`, email.trim());
      localStorage.setItem(`verified_name_${id}`, name.trim());

      console.log(`Voter information stored for ballot ${id}:`, voterInfo);

      // ---------- STEP 2: Add voter to ballot ----------
      try {
        console.log("Adding voter to ballot:", id);

        const addVoterUrl = `http://localhost:8080/api/ballots/${id}/voters`;
        const addVoterResponse = await fetch(addVoterUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${responseData.data.token}`,
          },
          body: JSON.stringify({
            voters: [
              {
                email: email.trim(),
                name: name.trim(),
              },
            ],
          }),
        });

        const ballotResponseText = await addVoterResponse.text();
        console.log("Raw ballot response:", ballotResponseText);

        let ballotData;
        try {
          ballotData = JSON.parse(ballotResponseText);
          console.log("Parsed ballot data:", ballotData);

          // If we get a voter ID back, store it
          if (
            ballotData.data &&
            ballotData.data.addedVoters &&
            ballotData.data.addedVoters.length > 0
          ) {
            const voterId = ballotData.data.addedVoters[0].id;
            if (voterId) {
              localStorage.setItem(`voter_id_${id}`, voterId);
              console.log(`Stored voter ID for ballot ${id}: ${voterId}`);
            }
          }
        } catch (e) {
          console.error("Failed to parse ballot response:", e);
        }

        if (!addVoterResponse.ok) {
          console.error("Failed to add voter to ballot:", ballotData);
        } else {
          console.log("Successfully added voter to ballot:", ballotData);
        }
      } catch (ballotError) {
        // Non-fatal error - continue even if this fails
        console.error("Error adding voter to ballot:", ballotError);
      }

      // ---------- STEP 3: Navigate to pre-registration flow ----------
      navigate(`/verify-registration/${id}/${slug}`);
    } catch (error) {
      console.error("Registration failed:", error);
      setError("Network error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginClick = () => {
    navigate(`/login?redirect=/verify-registration/${id}/${slug}`);
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
            Get Started
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Welcome to SafeBallot - Let's create your account
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

export default DirectVoterRegistration;
