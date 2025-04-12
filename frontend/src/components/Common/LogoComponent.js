import React from "react";
import { Box } from "@mui/material";

// A stylized ballot box logo with red and blue colors
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
      <svg
        width={width}
        height={height}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 25H60V65C60 67.7614 57.7614 70 55 70H25C22.2386 70 20 67.7614 20 65V25Z"
          fill="#E74C3C"
          stroke="#2B3A4E"
          strokeWidth="2"
        />
        <path
          d="M25 15H55C57.7614 15 60 17.2386 60 20V25H20V20C20 17.2386 22.2386 15 25 15Z"
          fill="#2B3A4E"
          stroke="#2B3A4E"
          strokeWidth="2"
        />
        <rect x="35" y="35" width="10" height="10" rx="1" fill="white" />
        <rect x="30" y="10" width="20" height="5" rx="2" fill="#2B3A4E" />
        <line x1="35" y1="48" x2="45" y2="48" stroke="white" strokeWidth="2" />
        <line x1="35" y1="52" x2="45" y2="52" stroke="white" strokeWidth="2" />
        <line x1="35" y1="56" x2="45" y2="56" stroke="white" strokeWidth="2" />
        <path
          d="M38 38L40 42L43 35"
          stroke="#2B3A4E"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Box>
  );
};

export default LogoComponent;
