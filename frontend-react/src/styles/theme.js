import { createTheme } from "@mui/material/styles";

// Create a custom theme for SafeBallot
const theme = createTheme({
  palette: {
    primary: {
      main: "#4267B2", // Facebook blue - matched from the original design
      light: "#7B96D3",
      dark: "#2A4684",
      contrastText: "#fff",
    },
    secondary: {
      main: "#38A169", // Success green for completed actions
      light: "#68D391",
      dark: "#276749",
      contrastText: "#fff",
    },
    error: {
      main: "#E53E3E",
      light: "#FC8181",
      dark: "#C53030",
    },
    warning: {
      main: "#ED8936",
      light: "#FBD38D",
      dark: "#C05621",
    },
    info: {
      main: "#4299E1",
      light: "#BEE3F8",
      dark: "#2B6CB0",
    },
    success: {
      main: "#38A169",
      light: "#C6F6D5",
      dark: "#276749",
    },
    background: {
      default: "#F7FAFC",
      paper: "#fff",
    },
    text: {
      primary: "#2D3748",
      secondary: "#718096",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
    subtitle1: {
      fontWeight: 500,
    },
    subtitle2: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 600,
      textTransform: "none",
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "10px 24px",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
        containedPrimary: {
          "&:hover": {
            backgroundColor: "#2A4684",
          },
        },
        outlinedPrimary: {
          borderColor: "#E2E8F0",
          color: "#4A5568",
          "&:hover": {
            backgroundColor: "rgba(66, 103, 178, 0.04)",
            borderColor: "#CBD5E0",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        },
        elevation2: {
          boxShadow:
            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        },
        elevation3: {
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#CBD5E0",
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: "16px",
        },
        head: {
          fontWeight: 600,
          backgroundColor: "#F7FAFC",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
