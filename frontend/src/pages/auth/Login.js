import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  InputAdornment,
  IconButton,
  Divider,
  Alert,
} from "@mui/material";
import { useDispatch } from "react-redux";
import {
  loginRequest,
  loginSuccess,
  loginFailure,
} from "../../store/authSlice";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { authService } from "../../services/api";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [redirectPath, setRedirectPath] = useState("/");

  // Parse query parameters to check for redirect
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const redirect = queryParams.get("redirect");
    if (redirect) {
      setRedirectPath(redirect);
      console.log("Will redirect to:", redirect, "after login");
    }
  }, [location]);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      dispatch(loginRequest());
      console.log("Login attempt for:", formData.email);

      authService
        .adminLogin(formData.email, formData.password)
        .then((response) => {
          console.log("Login successful, response received:", response.status);

          // Extract data from the nested response structure
          const { token, refreshToken, user } = response.data.data || {};

          // Log the actual token value in the console
          console.log("Raw token value received:", token);

          // Save token to localStorage
          try {
            // Check if token is a string and not null/undefined
            if (typeof token === "string" && token) {
              localStorage.setItem("adminToken", token);

              // Save refresh token if available
              if (refreshToken) {
                localStorage.setItem("adminRefreshToken", refreshToken);
                console.log("Admin refresh token saved:", !!refreshToken);
              }

              // Double-check it was saved correctly
              const savedToken = localStorage.getItem("adminToken");
              console.log("Raw saved admin token:", savedToken);
              console.log("Admin token saved successfully:", !!savedToken);

              if (savedToken !== token) {
                console.error(
                  "ERROR: Saved admin token does not match original token!"
                );
                console.log("Original length:", token.length);
                console.log("Saved length:", savedToken.length);
              }

              if (user) {
                localStorage.setItem("adminUser", JSON.stringify(user));
                const savedUser = localStorage.getItem("adminUser");
                console.log(
                  "Admin user saved to localStorage:",
                  savedUser ? "Yes" : "No"
                );
              }

              // Verify token is correctly stored
              setTimeout(() => {
                const verifyToken = localStorage.getItem("adminToken");
                console.log(
                  "Admin token verification after 500ms:",
                  verifyToken ? "Present" : "Missing"
                );
              }, 500);

              dispatch(
                loginSuccess({
                  user,
                  token,
                })
              );

              // Navigate to redirect path if available, otherwise go to home
              navigate(redirectPath);
            } else {
              console.error("Invalid token received:", token);
              setErrorMessage(
                "Invalid authentication token received from server"
              );
              return;
            }
          } catch (storageError) {
            console.error("Error saving to localStorage:", storageError);
            setErrorMessage("Error saving login data. Please try again.");
          }
        })
        .catch((error) => {
          console.error("Login error:", error);
          console.error("Error details:", {
            status: error.response?.status,
            data: error.response?.data,
          });
          dispatch(
            loginFailure(error.response?.data?.message || "Invalid credentials")
          );
          setErrorMessage(
            error.response?.data?.message || "Invalid email or password"
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
        background: "linear-gradient(to right, #2d3748, #4a5568)",
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
        <Box
          component="img"
          src="/images/logo.svg"
          alt="SafeBallot Logo"
          sx={{ width: "60px", height: "60px", mb: 2 }}
        />

        <Typography
          component="h1"
          variant="h5"
          fontWeight="bold"
          sx={{ mb: 0.5 }}
        >
          SafeBallot
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Secure and transparent voting made easy
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
            sx={{ mb: 2 }}
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
            sx={{ mb: 3 }}
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
              mt: 1,
              mb: 2,
              py: 1.5,
              backgroundColor: "#4478EB",
              color: "#FFFFFF",
              borderRadius: "4px",
              "&:hover": {
                backgroundColor: "#3A63C2",
              },
            }}
          >
            Sign In
          </Button>

          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Typography variant="body2">
              Don't have an account?{" "}
              <RouterLink
                to="/register"
                style={{ textDecoration: "none", color: "#4478EB" }}
              >
                Register
              </RouterLink>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;
