import React, { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Container,
  Grid,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Paper,
  Divider,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  IconButton,
  Alert,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Google as GoogleIcon,
  GitHub as GitHubIcon,
} from "@mui/icons-material";
import { loginRequest, loginSuccess } from "../store/authSlice";

// Logo placeholder
const Logo = styled("img")({
  width: 180,
  marginBottom: 20,
});

const FormContainer = styled(Paper)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
  boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1.5, 2),
  fontWeight: 600,
  textTransform: "none",
}));

const SocialButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1.5, 2),
  fontWeight: 600,
  textTransform: "none",
  border: `1px solid ${theme.palette.divider}`,
  "&:hover": {
    backgroundColor: theme.palette.background.default,
  },
}));

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleRememberMe = (e) => {
    setRememberMe(e.target.checked);
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }

    if (!formData.password) {
      setError("Password is required");
      return false;
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    dispatch(loginRequest());

    // Simulate API call for demo purposes
    setTimeout(() => {
      // Mock successful login for demo
      if (
        formData.email === "demo@example.com" &&
        formData.password === "password"
      ) {
        dispatch(
          loginSuccess({
            user: {
              id: 1,
              name: "Demo User",
              email: formData.email,
              avatar: "",
            },
            token: "mock-jwt-token",
          })
        );
        navigate("/home");
      } else {
        setError("Invalid email or password");
      }
    }, 1000);

    // In a real application, you would call your API here
    // authService.login(formData)
    //   .then(response => {
    //     dispatch(loginSuccess(response.data));
    //     navigate('/home');
    //   })
    //   .catch(error => {
    //     setError(error.response?.data?.message || 'Login failed');
    //   });
  };

  const handleGoogleLogin = () => {
    // Implement Google OAuth login
    console.log("Google login clicked");
  };

  const handleGitHubLogin = () => {
    // Implement GitHub OAuth login
    console.log("GitHub login clicked");
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          py: 4,
        }}
      >
        <Box mb={4} textAlign="center">
          <Typography
            variant="h4"
            fontWeight={700}
            color="primary"
            sx={{ mb: 1 }}
          >
            SafeBallot
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Secure and transparent voting made easy
          </Typography>
        </Box>

        <FormContainer elevation={0}>
          <Typography variant="h5" fontWeight={600} mb={3} textAlign="center">
            Log in to your account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  variant="outlined"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  variant="outlined"
                  value={formData.password}
                  onChange={handleChange}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={toggleShowPassword}
                          edge="end"
                        >
                          {showPassword ? (
                            <VisibilityOffIcon />
                          ) : (
                            <VisibilityIcon />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={rememberMe}
                        onChange={handleRememberMe}
                        color="primary"
                      />
                    }
                    label="Remember me"
                  />

                  <Link
                    component={RouterLink}
                    to="/forgot-password"
                    variant="body2"
                  >
                    Forgot password?
                  </Link>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <StyledButton
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{
                    background:
                      "linear-gradient(45deg, #4478EB 30%, #6FA0FF 90%)",
                    color: "white",
                  }}
                >
                  Log In
                </StyledButton>
              </Grid>
            </Grid>
          </form>

          <Box my={3} display="flex" alignItems="center">
            <Divider sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
              Or continue with
            </Typography>
            <Divider sx={{ flexGrow: 1 }} />
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <SocialButton
                fullWidth
                startIcon={<GoogleIcon />}
                onClick={handleGoogleLogin}
              >
                Google
              </SocialButton>
            </Grid>
            <Grid item xs={6}>
              <SocialButton
                fullWidth
                startIcon={<GitHubIcon />}
                onClick={handleGitHubLogin}
              >
                GitHub
              </SocialButton>
            </Grid>
          </Grid>

          <Box mt={3} textAlign="center">
            <Typography variant="body2">
              Don't have an account?{" "}
              <Link
                component={RouterLink}
                to="/"
                variant="body2"
                fontWeight={600}
              >
                Sign up
              </Link>
            </Typography>
          </Box>
        </FormContainer>

        <Box mt={3} textAlign="center">
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} SafeBallot. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
