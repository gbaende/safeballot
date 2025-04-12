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
  InputAdornment,
  IconButton,
  Alert,
  FormControlLabel,
  Checkbox,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Google as GoogleIcon,
  GitHub as GitHubIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { registerRequest, registerSuccess } from "../store/authSlice";

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

const StepIconContainer = styled("div")(({ theme, active, completed }) => ({
  height: 32,
  width: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  backgroundColor:
    completed || active
      ? theme.palette.secondary.main
      : theme.palette.grey[200],
  color:
    completed || active
      ? theme.palette.common.white
      : theme.palette.text.secondary,
}));

// Custom step icon
const CustomStepIcon = ({ active, completed, icon }) => {
  return (
    <StepIconContainer active={active} completed={completed}>
      {completed ? <CheckIcon /> : icon}
    </StepIconContainer>
  );
};

const Registration = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    organization: "",
    jobTitle: "",
    acceptTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const steps = ["Account Information", "Organization Details"];

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: name === "acceptTerms" ? checked : value,
    });
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const validateStep1 = () => {
    if (!formData.firstName.trim()) {
      setError("First name is required");
      return false;
    }

    if (!formData.lastName.trim()) {
      setError("Last name is required");
      return false;
    }

    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    if (!formData.password) {
      setError("Password is required");
      return false;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (!formData.organization.trim()) {
      setError("Organization name is required");
      return false;
    }

    if (!formData.jobTitle.trim()) {
      setError("Job title is required");
      return false;
    }

    if (!formData.acceptTerms) {
      setError("You must accept the terms and conditions");
      return false;
    }

    return true;
  };

  const handleNext = () => {
    setError("");

    if (activeStep === 0) {
      if (validateStep1()) {
        setActiveStep(1);
      }
    } else if (activeStep === 1) {
      if (validateStep2()) {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = () => {
    dispatch(registerRequest());

    // Simulate API call for demo purposes
    setTimeout(() => {
      dispatch(registerSuccess());
      navigate("/login");
    }, 1000);

    // In a real application, you would call your API here
    // authService.register(formData)
    //   .then(response => {
    //     dispatch(registerSuccess());
    //     navigate('/login');
    //   })
    //   .catch(error => {
    //     setError(error.response?.data?.message || 'Registration failed');
    //   });
  };

  const handleGoogleSignup = () => {
    // Implement Google OAuth signup
    console.log("Google signup clicked");
  };

  const handleGitHubSignup = () => {
    // Implement GitHub OAuth signup
    console.log("GitHub signup clicked");
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
            Create your account
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel StepIconComponent={CustomStepIcon}>
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form>
            {activeStep === 0 ? (
              <Grid container spacing={3}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    name="firstName"
                    variant="outlined"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    name="lastName"
                    variant="outlined"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </Grid>

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
                    required
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
                    required
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
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    variant="outlined"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </Grid>
              </Grid>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Organization Name"
                    name="organization"
                    variant="outlined"
                    value={formData.organization}
                    onChange={handleChange}
                    placeholder="Your Company or Organization"
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Job Title"
                    name="jobTitle"
                    variant="outlined"
                    value={formData.jobTitle}
                    onChange={handleChange}
                    placeholder="e.g., Election Administrator"
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.acceptTerms}
                        onChange={handleChange}
                        name="acceptTerms"
                        color="primary"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        I accept the{" "}
                        <Link href="#" variant="body2" fontWeight={600}>
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link href="#" variant="body2" fontWeight={600}>
                          Privacy Policy
                        </Link>
                      </Typography>
                    }
                  />
                </Grid>
              </Grid>
            )}

            <Box
              sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}
            >
              <Button onClick={handleBack} disabled={activeStep === 0}>
                Back
              </Button>

              <StyledButton
                variant="contained"
                color="primary"
                onClick={handleNext}
                sx={{
                  background:
                    "linear-gradient(45deg, #4478EB 30%, #6FA0FF 90%)",
                  color: "white",
                }}
              >
                {activeStep === steps.length - 1 ? "Sign Up" : "Next"}
              </StyledButton>
            </Box>
          </form>

          <Box my={3} display="flex" alignItems="center">
            <Divider sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
              Or sign up with
            </Typography>
            <Divider sx={{ flexGrow: 1 }} />
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <SocialButton
                fullWidth
                startIcon={<GoogleIcon />}
                onClick={handleGoogleSignup}
              >
                Google
              </SocialButton>
            </Grid>
            <Grid item xs={6}>
              <SocialButton
                fullWidth
                startIcon={<GitHubIcon />}
                onClick={handleGitHubSignup}
              >
                GitHub
              </SocialButton>
            </Grid>
          </Grid>

          <Box mt={3} textAlign="center">
            <Typography variant="body2">
              Already have an account?{" "}
              <Link
                component={RouterLink}
                to="/login"
                variant="body2"
                fontWeight={600}
              >
                Log in
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

export default Registration;
