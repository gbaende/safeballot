import React, { useState, useEffect } from "react";
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
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import PeopleIcon from "@mui/icons-material/People";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import MyElectionsIcon from "../icons/MyElectionsIcon";

const drawerWidth = 240;

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md")); // Changed from "sm" to "md" for better mobile detection

  // Mobile drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Debug logging for mobile detection
  useEffect(() => {
    console.log("Mobile detection:", {
      isMobile,
      drawerOpen,
      pathname: location.pathname,
    });
  }, [isMobile, drawerOpen, location.pathname]);

  // Auto-close drawer when the URL actually changes on mobile
  useEffect(() => {
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Close drawer when switching from mobile to desktop
  useEffect(() => {
    if (!isMobile) {
      setDrawerOpen(false);
    }
  }, [isMobile]);

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
    { text: "My Elections", path: "/my-elections", icon: <MyElectionsIcon /> },
    {
      text: "Ballot Builder",
      path: "/create-election",
      icon: <PeopleIcon />,
    },
  ];

  return (
    <Box sx={{ display: "flex" }}>
      {/* Mobile App Bar */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            backgroundColor: "#FFFFFF",
            color: "#33374D",
            boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.05)",
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={() => {
                console.log("Hamburger menu clicked, opening drawer");
                setDrawerOpen(true);
              }}
              sx={{
                mr: 2,
                // Make the button more prominent on mobile
                backgroundColor: "rgba(68, 120, 235, 0.1)",
                "&:hover": {
                  backgroundColor: "rgba(68, 120, 235, 0.2)",
                },
                border: "1px solid rgba(68, 120, 235, 0.3)",
              }}
            >
              <MenuIcon sx={{ fontSize: "1.5rem", color: "#4478EB" }} />
            </IconButton>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ fontWeight: 600, color: "#080E1D" }}
            >
              SafeBallot
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? drawerOpen : true}
        onClose={() => {
          console.log("Drawer closing");
          setDrawerOpen(false);
        }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            border: "none",
            boxShadow: "0 0 10px rgba(0,0,0,0.05)",
            // Ensure content starts below the AppBar on mobile
            paddingTop: isMobile ? "64px" : 0,
          },
        }}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
          ...(isMobile && {
            disablePortal: false,
            disableEnforceFocus: false,
            disableAutoFocus: false,
            // Better backdrop handling
            BackdropProps: {
              onClick: () => {
                console.log("Backdrop clicked, closing drawer");
                setDrawerOpen(false);
              },
            },
          }),
        }}
      >
        {/* Debug header for mobile */}
        {isMobile && (
          <Box sx={{ p: 2, backgroundColor: "#f0f0f0", textAlign: "center" }}>
            <Typography variant="caption" sx={{ color: "#666" }}>
              Mobile Menu (Debug: {drawerOpen ? "Open" : "Closed"})
            </Typography>
          </Box>
        )}

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
              onClick={() => {
                console.log(`Navigation clicked: ${item.text} -> ${item.path}`);
                // Close drawer on mobile when navigation item is clicked
                if (isMobile) {
                  console.log("Closing drawer on mobile navigation");
                  setDrawerOpen(false);
                }
              }}
              sx={{
                borderRadius: "8px",
                mb: 0.5,
                py: isMobile ? 1.5 : 1, // Larger touch targets on mobile
                // Add background for debugging on mobile
                backgroundColor: isMobile
                  ? "rgba(68, 120, 235, 0.05)"
                  : "transparent",
                "&.Mui-selected": {
                  backgroundColor: "#E5EBF7",
                },
                "&:hover": {
                  backgroundColor: "#F7FAFC",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: "#718096",
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontWeight: location.pathname === item.path ? 600 : 400,
                  fontSize: isMobile ? "1rem" : "0.875rem", // Larger text on mobile
                  // Add color for debugging on mobile
                  color: isMobile ? "#4478EB" : "inherit",
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
          p: { xs: 1, sm: 2, md: 3 }, // Reduced padding on mobile
          width: {
            xs: "100%", // Full width on mobile
            sm: `calc(100% - ${isMobile ? 0 : drawerWidth}px)`,
          },
          backgroundColor: "#FFFFFF",
          minHeight: "100vh",
          marginTop: isMobile ? "64px" : 0, // Account for mobile app bar
          overflow: "auto", // Ensure proper scrolling
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
