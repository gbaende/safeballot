import React from "react";
import { Box, Typography, Paper, Button } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Layout/DashboardLayout";

function Ballot() {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate(`/ballot/${id}/confirm`);
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Ballot
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">Ballot ID: {id}</Typography>
          <Typography variant="body1" sx={{ mt: 2, mb: 3 }}>
            This page will display the ballot for voting.
          </Typography>

          <Button variant="contained" color="primary" onClick={handleContinue}>
            Continue
          </Button>
        </Paper>
      </Box>
    </DashboardLayout>
  );
}

export default Ballot;
