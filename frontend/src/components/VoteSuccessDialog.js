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
        {/* I Voted sticker */}
        <Box
          component="img"
          src="/i-voted-sticker.png"
          alt="I Voted"
          sx={{
            width: 120,
            height: 120,
            mb: 3,
            borderRadius: "50%",
          }}
          onError={(e) => {
            e.target.src =
              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="60" fill="%23D22B2B"/><circle cx="60" cy="60" r="50" fill="%23FFFFFF"/><text x="60" y="62" font-family="Arial" font-size="24" font-weight="bold" text-anchor="middle" fill="%23D22B2B">I VOTED</text></svg>';
            e.target.onerror = null;
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
