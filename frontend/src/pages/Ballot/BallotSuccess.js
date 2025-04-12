import React from "react";
import { Box, Typography, Paper, Button } from "@mui/material";
import { CheckCircle } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Layout/DashboardLayout";

function BallotSuccess() {
  const navigate = useNavigate();

  const handleReturnHome = () => {
    navigate("/dashboard");
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 4 }}>
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
            maxWidth: 600,
            mx: "auto",
          }}
        >
          <Box sx={{ color: "success.main", fontSize: 64, mb: 2 }}>
            <CheckCircle fontSize="inherit" />
          </Box>

          <Typography variant="h4" gutterBottom>
            Ballot Submitted Successfully
          </Typography>

          <Typography variant="body1" sx={{ mb: 4 }}>
            Thank you for participating in this election. Your vote has been
            recorded securely.
          </Typography>

          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleReturnHome}
          >
            Return to Dashboard
          </Button>
        </Paper>
      </Box>
    </DashboardLayout>
  );
}

export default BallotSuccess;
