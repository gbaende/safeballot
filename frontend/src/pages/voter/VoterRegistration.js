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
import { ballotService } from "../../services/api"; // Import ballotService

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
      console.log("[REGISTRATION] Starting registration process with data:", {
        name: name.trim(),
        email: email.trim(),
        role: "voter",
      });

      // First register the user for authentication
      const registerUrl = "http://localhost:8080/api/auth/register";
      const registerData = {
        name: name.trim(),
        email: email.trim(),
        password: password,
        role: "voter",
      };

      const registerResponse = await fetch(registerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerData),
      });

      let responseData;
      try {
        const responseText = await registerResponse.text();
        responseData = JSON.parse(responseText);
        console.log("[REGISTRATION] Auth registration response:", responseData);
      } catch (e) {
        console.error("[REGISTRATION] Failed to parse response:", e);
        setError("Server returned an invalid response");
        setLoading(false);
        return;
      }

      if (!registerResponse.ok) {
        console.error(
          "[REGISTRATION] Registration failed:",
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

      // Save auth data
      let authToken = null;
      if (responseData.data && responseData.data.token) {
        authToken = responseData.data.token;
        localStorage.setItem("token", authToken);
        if (responseData.data.user) {
          localStorage.setItem("user", JSON.stringify(responseData.data.user));
          // Also store specifically as voter user
          localStorage.setItem(
            "voterUser",
            JSON.stringify(responseData.data.user)
          );
        }
      }

      // CRITICAL: Create a voter object with complete info
      const voterInfo = {
        name: name.trim(),
        email: email.trim(),
      };

      // Store voter info in multiple places for redundancy
      localStorage.setItem(`voter_info_${id}`, JSON.stringify(voterInfo));
      sessionStorage.setItem("voterInfo", JSON.stringify(voterInfo));
      localStorage.setItem("voterInfo", JSON.stringify(voterInfo));

      // Store individual fields
      localStorage.setItem("voterName", voterInfo.name);
      localStorage.setItem("voterEmail", voterInfo.email);
      localStorage.setItem("email", voterInfo.email);

      console.log(
        "[REGISTRATION] Stored voter information in storage:",
        voterInfo
      );

      // ---------- STEP 2: Register with ballot using the public endpoint ----------
      try {
        console.log(
          `[REGISTRATION] Registering voter with ballot ${id} using public endpoint`
        );
        const registrationResult = await ballotService.publicRegisterVoter(
          id,
          voterInfo
        );

        if (registrationResult.voter) {
          console.log(
            `[REGISTRATION] Successfully registered with ballot, voter ID: ${registrationResult.voter.id}`
          );
          localStorage.setItem(`voter_id_${id}`, registrationResult.voter.id);

          // Store ballot-specific information
          localStorage.setItem(`verified_name_${id}`, voterInfo.name);
          localStorage.setItem(`verified_email_${id}`, voterInfo.email);
        } else if (registrationResult.error) {
          console.warn(
            `[REGISTRATION] Public registration warning: ${registrationResult.error}`
          );
        }
      } catch (regError) {
        console.error(
          "[REGISTRATION] Error during public voter registration:",
          regError
        );
        // Non-fatal error - attempt direct creation as backup
      }

      // ---------- STEP 3: Fallback to direct voter creation if needed ----------
      try {
        console.log(
          `[REGISTRATION] Creating direct voter record as additional verification`
        );
        const directVoterResult = await ballotService.createDirectVoter(
          id,
          voterInfo
        );
        console.log(
          "[REGISTRATION] Direct voter creation result:",
          directVoterResult
        );

        if (directVoterResult?.data?.voter?.id) {
          localStorage.setItem(
            `voter_id_${id}`,
            directVoterResult.data.voter.id
          );
        }
      } catch (directError) {
        console.warn(
          "[REGISTRATION] Direct voter creation warning:",
          directError.message
        );
        // Non-fatal error - continue with process
      }

      // ---------- STEP 4: Navigate to pre-registration flow ----------
      navigate(`/preregister/${id}/${slug}`);
    } catch (error) {
      console.error("[REGISTRATION] Registration process failed:", error);
      setError("Registration failed: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleLoginClick = () => {
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

export default VoterRegistration;
