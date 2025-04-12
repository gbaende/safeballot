import React from "react";
import { Box, Typography, Paper, Button } from "@mui/material";
import { useParams } from "react-router-dom";
import DashboardLayout from "../../components/Layout/DashboardLayout";

function ElectionDetail() {
  const { id } = useParams();

  return (
    <DashboardLayout>
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Election Details
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">Election ID: {id}</Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            This page will display detailed information about the election.
          </Typography>
        </Paper>
      </Box>
    </DashboardLayout>
  );
}

export default ElectionDetail;
