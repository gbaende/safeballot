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
} from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import BallotIcon from "@mui/icons-material/Ballot";
import PeopleIcon from "@mui/icons-material/People";

const drawerWidth = 240;

const MainLayout = () => {
  const location = useLocation();

  // Mock user data
  const user = {
    name: "John Doe",
    email: "johndoe@example.com",
    avatar: "/avatar.png",
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
            component="img"
            src="/logo.png"
            alt="SafeBallot Logo"
            sx={{ height: 40, mt: 1 }}
          />
          <Typography
            variant="subtitle2"
            sx={{
              fontSize: "10px",
              color: "#4A5568",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              mt: 0.5,
            }}
          >
            VOTE OUTSIDE THE BOX
          </Typography>
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

        <Box sx={{ p: 2, display: "flex", alignItems: "center" }}>
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
