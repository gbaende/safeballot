import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const VotingConfirmationDialog = ({
  open,
  onClose,
  onSubmit,
  digitalKey = "",
}) => {
  const [enteredKey, setEnteredKey] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!enteredKey.trim()) {
      setError("Please enter your digital key");
      return;
    }

    // Simple validation - check if entered key matches the stored key
    if (enteredKey !== digitalKey && digitalKey) {
      setError("Invalid digital key. Please check and try again.");
      return;
    }

    // Clear any errors and call the onSubmit callback
    setError("");
    onSubmit(enteredKey);
  };

  const handleKeyChange = (e) => {
    setEnteredKey(e.target.value);
    if (error) setError("");
  };

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          p: 1,
        },
      }}
    >
      <Box sx={{ position: "relative", pt: 2 }}>
        {/* Back button */}
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", left: 16, top: 16 }}
        >
          <ArrowBackIcon />
        </IconButton>

        <DialogTitle sx={{ textAlign: "center", pt: 3 }}>
          Confirmation
        </DialogTitle>

        <DialogContent>
          <Typography align="center" sx={{ mb: 3 }}>
            You cannot change your response after. If you are sure you want to
            submit, enter your digital key below.
          </Typography>

          <TextField
            fullWidth
            placeholder="Paste Your Digital Key Here"
            value={enteredKey}
            onChange={handleKeyChange}
            variant="outlined"
            error={!!error}
            helperText={error}
            sx={{ mb: 2 }}
          />
        </DialogContent>

        <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            endIcon={<ArrowForwardIcon />}
            sx={{
              background: "linear-gradient(to right, #080E1D, #263C75)",
              "&:hover": {
                background: "linear-gradient(to right, #050912, #1d2e59)",
              },
              borderRadius: "4px",
              px: 4,
              py: 1,
            }}
          >
            Submit
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default VotingConfirmationDialog;
