import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Link,
  InputAdornment,
  IconButton,
  Alert,
  Divider,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  registerRequest,
  registerSuccess,
  registerFailure,
  loginSuccess,
} from "../../store/authSlice";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { authService } from "../../services/api";

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "admin", // Changed from "host" to "admin" to match backend validation
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (!formData.name) newErrors.name = "Name is required";
    if (formData.password && formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      dispatch(registerRequest());

      // Create payload with name field
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };

      // Make API call
      authService
        .register(userData)
        .then((response) => {
          dispatch(registerSuccess());
          setErrorMessage(""); // Clear any errors

          // Auto-login after successful registration
          if (response.data && response.data.data && response.data.data.token) {
            // Extract data
            const { token, user } = response.data.data;

            // Store token and user data in localStorage with proper keys
            localStorage.setItem("adminToken", token);
            localStorage.setItem("adminUser", JSON.stringify(user));

            console.log("Admin token and user stored in localStorage");

            // Update Redux state
            dispatch(
              loginSuccess({
                token,
                user,
              })
            );

            // Navigate to home page
            navigate("/");
          } else {
            // Fallback if token not received
            alert("Registration successful! Please log in.");
            navigate("/login");
          }
        })
        .catch((error) => {
          console.error("Registration error:", error);
          dispatch(
            registerFailure(
              error.response?.data?.message || "Registration failed"
            )
          );
          setErrorMessage(
            error.response?.data?.message ||
              "Registration failed. Please try again."
          );
        });
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(to right, #1e293b, #3b5998)",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: "450px",
          p: 4,
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* SafeBallot Logo */}
        <Box sx={{ mb: 2, width: "60px", height: "60px" }}>
          <img
            src="/images/logo.png"
            alt="SafeBallot Logo"
            style={{ width: "100%", height: "100%" }}
          />
        </Box>

        <Typography
          component="h1"
          variant="h5"
          fontWeight="bold"
          sx={{ mb: 1 }}
        >
          Get Started
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Welcome to SafeBallot - Let's create your account
        </Typography>

        <Divider sx={{ width: "100%", mb: 3 }} />

        {errorMessage && (
          <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
            {errorMessage}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{ width: "100%" }}
        >
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            Full Name
          </Typography>
          <TextField
            fullWidth
            id="name"
            name="name"
            placeholder="John Doe"
            value={formData.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            variant="outlined"
            sx={{ mb: 3 }}
            InputProps={{
              sx: {
                borderRadius: "4px",
              },
            }}
          />

          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            Email
          </Typography>
          <TextField
            fullWidth
            id="email"
            name="email"
            placeholder="email@email.com"
            value={formData.email}
            onChange={handleChange}
            error={!!errors.email}
            helperText={errors.email}
            variant="outlined"
            sx={{ mb: 3 }}
            InputProps={{
              sx: {
                borderRadius: "4px",
              },
            }}
          />

          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            Password
          </Typography>
          <TextField
            fullWidth
            name="password"
            type={showPassword ? "text" : "password"}
            id="password"
            placeholder="password"
            value={formData.password}
            onChange={handleChange}
            error={!!errors.password}
            helperText={errors.password}
            variant="outlined"
            sx={{ mb: 4 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleTogglePasswordVisibility}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                borderRadius: "4px",
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              py: 1.5,
              backgroundColor: "#AAAAAA", // Light gray button as shown in image
              color: "#FFFFFF",
              textTransform: "none",
              fontWeight: "medium",
              "&:hover": {
                backgroundColor: "#999999",
              },
            }}
          >
            Sign up
          </Button>

          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Typography variant="body2">
              Already have an account?{" "}
              <Link
                component={RouterLink}
                to="/login"
                sx={{
                  textDecoration: "none",
                  color: "#1976d2",
                }}
              >
                Log in
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Register;
