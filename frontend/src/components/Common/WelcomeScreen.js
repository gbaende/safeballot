import React from "react";
import { Box, Typography, Button, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";

function WelcomeScreen() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 700,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 700, textAlign: "center" }}
        >
          SafeBallot React Migration Complete!
        </Typography>

        <Typography variant="body1" sx={{ mb: 4, textAlign: "center" }}>
          The EJS to React migration has been successfully completed. This new
          React architecture provides better maintainability, component
          reusability, and improved user experience.
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/login")}
          >
            Go to Login
          </Button>

          <Button variant="outlined" onClick={() => navigate("/register")}>
            Create Account
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default WelcomeScreen;
