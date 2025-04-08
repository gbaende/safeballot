import React from "react";
import { Box, Typography, Paper, Button } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Layout/DashboardLayout";

function BallotSummary() {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleSubmit = () => {
    navigate(`/ballot/${id}/success`);
  };

  const handleBack = () => {
    navigate(`/ballot/${id}/confirm`);
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Ballot Summary
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">Ballot ID: {id}</Typography>
          <Typography variant="body1" sx={{ mt: 2, mb: 3 }}>
            Your ballot is ready to be submitted. Here's a summary of your
            selections.
          </Typography>

          <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
            <Button variant="outlined" onClick={handleBack}>
              Back
            </Button>
            <Button variant="contained" color="primary" onClick={handleSubmit}>
              Submit Ballot
            </Button>
          </Box>
        </Paper>
      </Box>
    </DashboardLayout>
  );
}

export default BallotSummary;
