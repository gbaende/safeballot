import React from "react";
import { Box, Typography, Button, Paper, IconButton } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import LogoComponent from "../../components/Common/LogoComponent";

function Verify() {
  const navigate = useNavigate();

  const handleNext = () => {
    navigate("/voter-id");
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #2B3A4E 0%, #1B2838 100%)",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 500,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          borderRadius: 2,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Box sx={{ alignSelf: "flex-start", mb: 2 }}>
          <IconButton onClick={() => navigate("/login")}>
            <ArrowBack />
          </IconButton>
        </Box>

        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          align="center"
          sx={{ fontWeight: 600, mb: 2 }}
        >
          Verify your identity
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          align="center"
          sx={{ mb: 5 }}
        >
          To ensure fair and safe voting practices, we must verify your
          identification before you can vote.
        </Typography>

        <Box
          sx={{
            width: "200px",
            height: "200px",
            mb: 5,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            border: "2px dashed #ccc",
            borderRadius: "8px",
            position: "relative",
          }}
        >
          {/* Face recognition graphic - this would typically be an SVG or image */}
          <Box
            component="img"
            src="/face-recognition.svg"
            alt="Face Recognition"
            sx={{
              width: "70%",
              height: "70%",
              opacity: 0.7,
            }}
          />

          {/* Corner brackets for ID scanning UI effect */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "30px",
              height: "30px",
              borderTop: "3px solid #6366F1",
              borderLeft: "3px solid #6366F1",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "30px",
              height: "30px",
              borderTop: "3px solid #6366F1",
              borderRight: "3px solid #6366F1",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "30px",
              height: "30px",
              borderBottom: "3px solid #6366F1",
              borderLeft: "3px solid #6366F1",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: "30px",
              height: "30px",
              borderBottom: "3px solid #6366F1",
              borderRight: "3px solid #6366F1",
            }}
          />
        </Box>

        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleNext}
          sx={{
            py: 1.5,
            borderRadius: 1.5,
            textTransform: "none",
            fontSize: "1rem",
            fontWeight: 600,
            backgroundColor: "#2B3A4E",
            "&:hover": {
              backgroundColor: "#1B2838",
            },
          }}
        >
          Next
        </Button>
      </Paper>
    </Box>
  );
}

export default Verify;
