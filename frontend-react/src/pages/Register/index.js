import React, { useState, useEffect } from "react";
import {
  Box,
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
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { register, clearError } from "../../store/slices/authSlice";
import LogoComponent from "../../components/Common/LogoComponent";

function Register() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [apiError, setApiError] = useState("");

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { error, loading } = useSelector((state) => state.auth);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Update API error when Redux error changes
  useEffect(() => {
    if (error) {
      setApiError(error);
    }
  }, [error]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear validation error when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    // Clear API error when user makes changes
    if (apiError) {
      setApiError("");
    }
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = () => {
    const errors = {};
    const { email, password } = formData;

    if (!email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Email address is invalid";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted, validating...");

    if (validateForm()) {
      try {
        console.log("Form validation passed, dispatching register action");
        const { email, password } = formData;
        await dispatch(register({ email, password })).unwrap();
        console.log("Registration successful, navigating to verify page");
        navigate("/verify");
      } catch (err) {
        console.error("Registration failed:", err);
        setApiError(err.message || "Registration failed. Please try again.");
      }
    } else {
      console.log("Form validation failed:", formErrors);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #2B3A4E 0%, #1B2838 100%)",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 450,
          display: "flex",
          flexDirection: "column",
          borderRadius: 2,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Box sx={{ mb: 3, textAlign: "center" }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <LogoComponent width={80} height={80} />
          </Box>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 700, color: "#333" }}
          >
            Get Started
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Welcome to SafeBallot - Let's create your account
          </Typography>
        </Box>

        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 2.5 }}>
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{ fontWeight: 500, color: "#555" }}
            >
              Email
            </Typography>
            <TextField
              name="email"
              fullWidth
              placeholder="example@email.com"
              value={formData.email}
              onChange={handleChange}
              error={!!formErrors.email}
              helperText={formErrors.email}
              InputProps={{
                sx: {
                  borderRadius: 1.5,
                  backgroundColor: "#f9f9f9",
                  "&:hover": {
                    backgroundColor: "#f5f5f5",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "transparent",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "primary.main",
                  },
                },
              }}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{ fontWeight: 500, color: "#555" }}
            >
              Password
            </Typography>
            <TextField
              name="password"
              fullWidth
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              value={formData.password}
              onChange={handleChange}
              error={!!formErrors.password}
              helperText={formErrors.password}
              InputProps={{
                sx: {
                  borderRadius: 1.5,
                  backgroundColor: "#f9f9f9",
                  "&:hover": {
                    backgroundColor: "#f5f5f5",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "transparent",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "primary.main",
                  },
                },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleTogglePassword} edge="end">
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
            sx={{
              py: 1.5,
              borderRadius: 1.5,
              textTransform: "none",
              fontSize: "1rem",
              fontWeight: 600,
              backgroundColor: "#2B3A4E",
              "&:hover": {
                backgroundColor: "#1B2838",
              },
            }}
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Sign up"}
          </Button>

          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Already have an account?{" "}
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate("/login")}
                sx={{
                  fontWeight: 600,
                  textDecoration: "none",
                  color: "primary.main",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
              >
                Log In
              </Link>
            </Typography>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

export default Register;
