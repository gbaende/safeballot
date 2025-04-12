import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  InputAdornment,
  IconButton,
  Divider,
} from "@mui/material";
import { useDispatch } from "react-redux";
import { login } from "../../store/authSlice";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Link as RouterLink } from "react-router-dom";

const Login = () => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

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
      dispatch(login(formData));
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
          src="/logo.png"
          alt="VoteChain Logo"
          sx={{ width: "60px", height: "60px", mb: 2 }}
        />

        <Typography
          component="h1"
          variant="h5"
          fontWeight="bold"
          sx={{ mb: 0.5 }}
        >
          Sign in
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Welcome to VoteChain.
        </Typography>

        <Divider sx={{ width: "100%", mb: 3 }} />

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
              backgroundColor: "#2D3748",
              color: "#FFFFFF",
              borderRadius: "4px",
              "&:hover": {
                backgroundColor: "#1A202C",
              },
            }}
          >
            Sign In
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;
