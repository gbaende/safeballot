import React from "react";
import { Box, Typography, Paper, Button } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Layout/DashboardLayout";

function BallotConfirm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleConfirm = () => {
    navigate(`/ballot/${id}/summary`);
  };

  const handleBack = () => {
    navigate(`/ballot/${id}`);
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Confirm Your Ballot
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">Ballot ID: {id}</Typography>
          <Typography variant="body1" sx={{ mt: 2, mb: 3 }}>
            Please review your ballot selections before confirming.
          </Typography>

          <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
            <Button variant="outlined" onClick={handleBack}>
              Back
            </Button>
            <Button variant="contained" color="primary" onClick={handleConfirm}>
              Confirm Ballot
            </Button>
          </Box>
        </Paper>
      </Box>
    </DashboardLayout>
  );
}

export default BallotConfirm;
