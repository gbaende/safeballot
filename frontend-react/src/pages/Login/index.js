import React, { useState } from "react";
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
import { login } from "../../store/slices/authSlice";
import LogoComponent from "../../components/Common/LogoComponent";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { error, loading } = useSelector((state) => state.auth);

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = () => {
    const errors = {};

    if (!email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Email address is invalid";
    }

    if (!password) {
      errors.password = "Password is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      try {
        await dispatch(login({ email, password })).unwrap();
        navigate("/verify");
      } catch (err) {
        // Error handling is already done in the auth slice
        console.error("Login failed:", err);
      }
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
            Sign In
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Welcome back to SafeBallot - Enter your credentials
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
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
              fullWidth
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              fullWidth
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          <Box sx={{ mt: 1, mb: 3, textAlign: "right" }}>
            <Link
              href="#"
              sx={{
                color: "primary.main",
                textDecoration: "none",
                fontSize: "0.875rem",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              Forgot password?
            </Link>
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
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Don't have an account?{" "}
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate("/register")}
                sx={{
                  fontWeight: 600,
                  textDecoration: "none",
                  color: "primary.main",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
              >
                Sign up
              </Link>
            </Typography>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

export default Login;
