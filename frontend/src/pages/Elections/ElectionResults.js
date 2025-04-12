import React from "react";
import { Box, Typography, Paper, Button } from "@mui/material";
import { useParams } from "react-router-dom";
import DashboardLayout from "../../components/Layout/DashboardLayout";

function ElectionResults() {
  const { id } = useParams();

  return (
    <DashboardLayout>
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Election Results
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">Election ID: {id}</Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            This page will display the results of the election.
          </Typography>
        </Paper>
      </Box>
    </DashboardLayout>
  );
}

export default ElectionResults;
