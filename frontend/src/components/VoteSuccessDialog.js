// src/components/VoteSuccessDialog.js

import React from "react";
import { Dialog, DialogContent, Box, Typography } from "@mui/material";

const VoteSuccessDialog = ({ open }) => {
  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          p: 3,
        },
      }}
    >
      <DialogContent sx={{ textAlign: "center", py: 4 }}>
        {/* now pulling directly from public/images */}
        <Box
          component="img"
          src="/images/i-voted-sticker.png"
          alt="I Voted Sticker"
          sx={{
            width: 150,
            height: 150,
            mb: 3,
            borderRadius: "50%",
            boxShadow: "0px 3px 8px rgba(0, 0, 0, 0.15)",
          }}
        />

        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          Your vote has been counted.
        </Typography>

        <Typography variant="body1" color="text.secondary">
          Thank you for making your voice heard—your ballot has been
          successfully submitted and an email confirmation has been sent.
        </Typography>
      </DialogContent>
    </Dialog>
  );
};

export default VoteSuccessDialog;
