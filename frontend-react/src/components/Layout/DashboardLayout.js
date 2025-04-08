import React from "react";
import {
  Box,
  Typography,
  Avatar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Home, EventNote, Group, ExitToApp } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/logo.png";
import { useSelector } from "react-redux";

const DRAWER_WIDTH = 260;

const LogoContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: theme.spacing(3, 2),
  backgroundColor: theme.palette.background.paper,
}));

const LogoImage = styled("img")({
  height: 60,
  marginBottom: 8,
});

const LogoText = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: "1.2rem",
  letterSpacing: 1,
  color: theme.palette.primary.main,
}));

const LogoTagline = styled(Typography)(({ theme }) => ({
  fontSize: "0.7rem",
  color: theme.palette.text.secondary,
  letterSpacing: 0.5,
}));

const NavItem = styled(ListItem)(({ theme, active }) => ({
  marginBottom: theme.spacing(0.5),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: active ? theme.palette.primary.light : "transparent",
  color: active ? theme.palette.primary.main : theme.palette.text.primary,
  "&:hover": {
    backgroundColor: active
      ? theme.palette.primary.light
      : theme.palette.action.hover,
  },
}));

const UserProfile = styled(Box)(({ theme }) => ({
  display: "flex",
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  marginTop: "auto",
}));

const UserInfo = styled(Box)(({ theme }) => ({
  marginLeft: theme.spacing(1.5),
}));

const DashboardLayout = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const menuItems = [
    { name: "Home", icon: <Home />, path: "/dashboard" },
    { name: "My Elections", icon: <EventNote />, path: "/elections" },
    { name: "Ballot Builder", icon: <Group />, path: "/ballot/new" },
  ];

  const isActive = (path) => {
    if (path === "/ballot/new" && location.pathname.startsWith("/ballot/")) {
      return true;
    }
    return location.pathname === path;
  };

  return (
    <Box sx={{ display: "flex" }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            border: "none",
            boxShadow: theme.shadows[2],
          },
        }}
      >
        <LogoContainer>
          <LogoImage src={logo} alt="SafeBallot Logo" />
          <LogoText variant="h6">SAFEBALLOT</LogoText>
          <LogoTagline>-VOTE OUTSIDE THE BOX-</LogoTagline>
        </LogoContainer>

        <List sx={{ p: 2, flexGrow: 1 }}>
          {menuItems.map((item) => (
            <NavItem
              button
              key={item.name}
              active={isActive(item.path)}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.name} />
            </NavItem>
          ))}
        </List>

        <UserProfile>
          <Avatar src="/images/avatar.png" />
          <UserInfo>
            <Typography variant="subtitle2" sx={{ fontWeight: "medium" }}>
              {user?.name || "John Doe"}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {user?.email || "johndoe@example.com"}
            </Typography>
          </UserInfo>
        </UserProfile>
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: "100vh",
          backgroundColor: "#FFFFFF",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default DashboardLayout;
