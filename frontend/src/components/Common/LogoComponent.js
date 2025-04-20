import React from "react";
import { Box } from "@mui/material";

// SafeBallot logo - using external SVG file
const LogoComponent = ({ width = 80, height = 80 }) => {
  return (
    <Box
      sx={{
        width: width,
        height: height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src="/images/logo.svg"
        alt="SafeBallot Logo"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </Box>
  );
};

export default LogoComponent;
