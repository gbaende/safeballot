import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { styled } from "@mui/material/styles";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  Add as AddIcon,
  AccountCircle as AccountCircleIcon,
} from "@mui/icons-material";
import { logout } from "../../store/authSlice";
import MyElectionsIcon from "../icons/MyElectionsIcon";

const drawerWidth = 240;

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })(
  ({ theme, open, isMobile }) => ({
    flexGrow: 1,
    padding: isMobile ? theme.spacing(1) : theme.spacing(3),
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: isMobile ? 0 : `-${drawerWidth}px`,
    ...(open &&
      !isMobile && {
        transition: theme.transitions.create("margin", {
          easing: theme.transitions.easing.easeOut,
          duration: theme.transitions.duration.enteringScreen,
        }),
        marginLeft: 0,
      }),
    background: "#FFFFFF",
    minHeight: "100vh",
    marginTop: isMobile ? "64px" : 0, // Account for mobile app bar
    width: isMobile ? "100%" : "auto", // Full width on mobile
  })
);

const AppBarStyled = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open, isMobile }) => ({
  transition: theme.transitions.create(["margin", "width"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  backgroundColor: "#FFFFFF",
  color: "#33374D",
  boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.05)",
  zIndex: isMobile ? theme.zIndex.drawer + 1 : "auto",
  ...(open &&
    !isMobile && {
      width: `calc(100% - ${drawerWidth}px)`,
      marginLeft: `${drawerWidth}px`,
      transition: theme.transitions.create(["margin", "width"], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
}));

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: "flex-end",
}));

const LogoBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  height: 64,
  width: "100%",
}));

const MainLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [open, setOpen] = useState(!isMobile); // Start closed on mobile
  const [anchorEl, setAnchorEl] = useState(null);

  // Auto-close drawer when navigation changes on mobile
  useEffect(() => {
    if (isMobile && open) {
      setOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Close drawer when switching from mobile to desktop
  useEffect(() => {
    if (!isMobile) {
      setOpen(true); // Open by default on desktop
    } else {
      setOpen(false); // Close by default on mobile
    }
  }, [isMobile]);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navigationItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
    { text: "My Elections", icon: <MyElectionsIcon />, path: "/my-elections" },
    { text: "Create Election", icon: <AddIcon />, path: "/ballot-builder" },
  ];

  return (
    <Box sx={{ display: "flex" }}>
      <AppBarStyled position="fixed" open={open} isMobile={isMobile}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{
              mr: 2,
              // Only hide the hamburger menu on desktop when drawer is open
              ...(open && !isMobile && { display: "none" }),
              // Make the button more prominent on mobile
              ...(isMobile && {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.08)",
                },
              }),
            }}
          >
            <MenuIcon sx={{ fontSize: isMobile ? "1.5rem" : "1.25rem" }} />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ fontWeight: 600, color: "#080E1D" }}
          >
            SafeBallot
          </Typography>

          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => navigate("/ballot-builder")}
            sx={{
              mr: 2,
              background: "linear-gradient(45deg, #4478EB 30%, #6FA0FF 90%)",
              color: "white",
              fontWeight: 600,
            }}
          >
            Create Election
          </Button>

          <div>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar
                alt={user?.name || "User"}
                src={user?.avatar || ""}
                sx={{ width: 32, height: 32 }}
              />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleClose}>Profile</MenuItem>
              <MenuItem onClick={handleClose}>Settings</MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBarStyled>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid rgba(0, 0, 0, 0.08)",
            zIndex: isMobile ? theme.zIndex.drawer : "auto",
          },
        }}
        variant={isMobile ? "temporary" : "persistent"}
        anchor="left"
        open={open}
        onClose={handleDrawerClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
          // Ensure backdrop click closes the drawer on mobile
          ...(isMobile && {
            BackdropProps: {
              onClick: handleDrawerClose,
            },
          }),
        }}
      >
        <LogoBox>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#4478EB" }}>
            SafeBallot
          </Typography>
        </LogoBox>
        <Divider />
        <List>
          {navigationItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => {
                  console.log(`Navigating to: ${item.path}`); // Debug log
                  navigate(item.path);
                  // Close drawer on mobile when navigation item is clicked
                  if (isMobile) {
                    setOpen(false);
                  }
                }}
                selected={isActive(item.path)}
                sx={{
                  "&.Mui-selected": {
                    backgroundColor: "#E5EBF7",
                    borderRight: "3px solid #4478EB",
                    "&:hover": {
                      backgroundColor: "#E5EBF7",
                    },
                  },
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.04)",
                  },
                  py: 1.5, // Increase padding for better touch targets on mobile
                }}
              >
                <ListItemIcon sx={{ color: "#718096", minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isActive(item.path) ? 600 : 400,
                    color: "inherit",
                    fontSize: isMobile ? "1rem" : "0.875rem", // Larger text on mobile
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider />
      </Drawer>
      <Main open={open} isMobile={isMobile}>
        <DrawerHeader />
        {children}
      </Main>
    </Box>
  );
};

export default MainLayout;
