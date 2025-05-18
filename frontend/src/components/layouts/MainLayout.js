import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Divider,
  Menu,
  MenuItem,
  ListItemButton,
  IconButton,
} from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import BallotIcon from "@mui/icons-material/Ballot";
import PeopleIcon from "@mui/icons-material/People";
import LogoutIcon from "@mui/icons-material/Logout";

const drawerWidth = 240;

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Function to generate display name from email
  const generateNameFromEmail = (email) => {
    if (!email) return "Guest User";

    // Simply extract the part before @ and use it directly
    return email.split("@")[0];
  };

  // Get user data from storage
  const getUserData = () => {
    try {
      // Try to get admin user from localStorage
      const storedAdminUser = localStorage.getItem("adminUser");
      if (storedAdminUser) {
        return JSON.parse(storedAdminUser);
      }

      // Check for regular user if no admin user found
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        return JSON.parse(storedUser);
      }

      // Check sessionStorage if not in localStorage
      const sessionUser = sessionStorage.getItem("user");
      if (sessionUser) {
        return JSON.parse(sessionUser);
      }

      // If no stored user, check if there's at least an email
      const email =
        localStorage.getItem("userEmail") ||
        sessionStorage.getItem("userEmail");
      if (email) {
        return { email, name: generateNameFromEmail(email) };
      }

      // Fallback to default user (for demo purposes)
      return {
        name: "Guest User",
        email: "guest@example.com",
        avatar: "/avatar.png",
      };
    } catch (error) {
      console.error("Error retrieving user data:", error);
      return {
        name: "Guest User",
        email: "guest@example.com",
        avatar: "/avatar.png",
      };
    }
  };

  // Get current user
  const user = getUserData();

  // If user has email but no name, generate name from email
  if (user.email && (!user.name || user.name === "John Doe")) {
    user.name = generateNameFromEmail(user.email);
  }

  // Add state for menu
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Handle profile click to open menu
  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Handle menu close
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Handle logout action
  const handleLogout = () => {
    console.log("Logging out...");

    try {
      // Clear specific authentication data first
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      localStorage.removeItem("adminRefreshToken");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("voterToken");
      localStorage.removeItem("voterUser");

      // Then clear all other localStorage and sessionStorage items
      if (window.localStorage) {
        localStorage.clear(); // Clear all localStorage instead of specific items
      }

      if (window.sessionStorage) {
        sessionStorage.clear(); // Clear all sessionStorage
      }

      // More thorough cookie clearing approach
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name =
          eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie =
          name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;";
        // Also try with domain attribute for cross-browser compatibility
        document.cookie =
          name +
          "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" +
          window.location.hostname;
      }

      // Set a flag to indicate logout was initiated
      window.sessionStorage.setItem("logoutRedirect", "true");

      // Close the menu
      handleClose();

      // Force a hard redirect instead of using React Router
      // This ensures a complete page refresh and state reset
      window.location.href = "/register";
    } catch (error) {
      console.error("Error during logout:", error);
      // Fallback to simple redirect if any errors
      window.location.href = "/register";
    }
  };

  const menuItems = [
    { text: "Home", path: "/", icon: <HomeIcon /> },
    { text: "My Elections", path: "/my-elections", icon: <BallotIcon /> },
    {
      text: "Ballot Builder",
      path: "/create-election",
      icon: <PeopleIcon />,
    },
  ];

  return (
    <Box sx={{ display: "flex" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            border: "none",
            boxShadow: "0 0 10px rgba(0,0,0,0.05)",
          },
        }}
      >
        <Box sx={{ p: 2, mb: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <Box
              component="img"
              src="/images/logo.svg"
              alt="SafeBallot Logo"
              sx={{ height: 40, mr: 2 }}
            />
            <Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    color: "#25557B",
                    lineHeight: 1.2,
                    fontSize: "14px",
                  }}
                >
                  SAFEBALLOT
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontSize: "8px",
                    color: "#25557B",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    lineHeight: 1,
                  }}
                >
                  -VOTE OUTSIDE THE BOX-
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <List sx={{ px: 1 }}>
          {menuItems.map((item) => (
            <ListItem
              button
              key={item.text}
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: "8px",
                mb: 0.5,
                "&.Mui-selected": {
                  backgroundColor: "#EBF8FF",
                  color: "#3182CE",
                  "& .MuiListItemIcon-root": {
                    color: "#3182CE",
                  },
                },
                "&:hover": {
                  backgroundColor: "#F7FAFC",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color:
                    location.pathname === item.path ? "#3182CE" : "#718096",
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontWeight: location.pathname === item.path ? 600 : 400,
                }}
              />
            </ListItem>
          ))}
        </List>

        <Box sx={{ flexGrow: 1 }} />

        <Divider sx={{ mx: 2 }} />

        {/* Update user profile section to be clickable */}
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            "&:hover": {
              backgroundColor: "#F7FAFC",
            },
            borderRadius: "8px",
            m: 1,
          }}
          onClick={handleProfileClick}
          aria-controls={open ? "profile-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
        >
          <Avatar src={user.avatar} sx={{ width: 36, height: 36, mr: 2 }} />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {user.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
        </Box>

        {/* Add profile menu with logout option */}
        <Menu
          id="profile-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            "aria-labelledby": "profile-button",
          }}
          anchorOrigin={{
            vertical: "top",
            horizontal: "center",
          }}
          transformOrigin={{
            vertical: "bottom",
            horizontal: "center",
          }}
        >
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          backgroundColor: "#F8F9FA",
          minHeight: "100vh",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
