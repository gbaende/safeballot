import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Tab,
  Tabs,
  Paper,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useDispatch } from "react-redux";
import { loginSuccess, registerSuccess } from "../../store/authSlice";
import { authService } from "../../services/api";

const AuthScreen = ({ onComplete }) => {
  const dispatch = useDispatch();
  const [authType, setAuthType] = useState(0); // 0 for login, 1 for signup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });

  // Handle tab change between login and signup
  const handleTabChange = (event, newValue) => {
    setAuthType(newValue);
    setError("");
  };

  // Toggle password visibility
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Handle login data change
  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData({
      ...loginData,
      [name]: value,
    });
    setError("");
  };

  // Handle signup data change
  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData({
      ...signupData,
      [name]: value,
    });
    setError("");
  };

  // Handle login form submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate form
      if (!loginData.email || !loginData.password) {
        throw new Error("Please fill in all fields");
      }

      // Call login API
      const response = await authService.login(
        loginData.email,
        loginData.password
      );

      // Update Redux store
      dispatch(loginSuccess(response.data));

      // Pass user data back to parent component
      onComplete({
        email: loginData.email,
        name: response.data.user?.name || "",
      });
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.message || err.message || "Authentication failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle signup form submission
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate form
      if (
        !signupData.email ||
        !signupData.password ||
        !signupData.confirmPassword ||
        !signupData.firstName ||
        !signupData.lastName
      ) {
        throw new Error("Please fill in all fields");
      }

      if (signupData.password !== signupData.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      if (signupData.password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      // Call register API
      const response = await authService.register({
        email: signupData.email,
        password: signupData.password,
        firstName: signupData.firstName,
        lastName: signupData.lastName,
      });

      // Update Redux store
      dispatch(registerSuccess(response.data));

      // Pass user data back to parent component
      onComplete({
        email: signupData.email,
        name: `${signupData.firstName} ${signupData.lastName}`,
      });
    } catch (err) {
      console.error("Signup error:", err);
      setError(
        err.response?.data?.message || err.message || "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h5" component="h1" align="center" sx={{ mb: 4 }}>
        Authenticate to continue
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={authType}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Login" />
          <Tab label="Sign Up" />
        </Tabs>
      </Box>

      {/* Login Form */}
      {authType === 0 && (
        <Box component="form" onSubmit={handleLogin} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={loginData.email}
            onChange={handleLoginChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            id="password"
            autoComplete="current-password"
            value={loginData.password}
            onChange={handleLoginChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleTogglePasswordVisibility}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              mt: 3,
              mb: 2,
              py: 1.5,
              bgcolor: "#1F2937",
              "&:hover": { bgcolor: "#111827" },
              position: "relative",
            }}
          >
            Sign In
            {loading && (
              <CircularProgress
                size={24}
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  marginTop: "-12px",
                  marginLeft: "-12px",
                }}
              />
            )}
          </Button>
        </Box>
      )}

      {/* Signup Form */}
      {authType === 1 && (
        <Box component="form" onSubmit={handleSignup} noValidate>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              required
              fullWidth
              id="firstName"
              label="First Name"
              name="firstName"
              autoComplete="given-name"
              value={signupData.firstName}
              onChange={handleSignupChange}
            />
            <TextField
              required
              fullWidth
              id="lastName"
              label="Last Name"
              name="lastName"
              autoComplete="family-name"
              value={signupData.lastName}
              onChange={handleSignupChange}
            />
          </Box>
          <TextField
            margin="normal"
            required
            fullWidth
            id="signup-email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={signupData.email}
            onChange={handleSignupChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            id="signup-password"
            autoComplete="new-password"
            value={signupData.password}
            onChange={handleSignupChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleTogglePasswordVisibility}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type={showPassword ? "text" : "password"}
            id="confirm-password"
            value={signupData.confirmPassword}
            onChange={handleSignupChange}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              mt: 3,
              mb: 2,
              py: 1.5,
              bgcolor: "#1F2937",
              "&:hover": { bgcolor: "#111827" },
              position: "relative",
            }}
          >
            Create Account
            {loading && (
              <CircularProgress
                size={24}
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  marginTop: "-12px",
                  marginLeft: "-12px",
                }}
              />
            )}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default AuthScreen;
