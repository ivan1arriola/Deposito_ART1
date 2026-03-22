import { createTheme, responsiveFontSizes } from "@mui/material/styles";

const baseTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#5A6640",
      light: "#7F8E5A",
      dark: "#3F4A2D",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#8D845B",
      light: "#BAB08C",
      dark: "#6E6645",
      contrastText: "#1E1A14",
    },
    background: {
      default: "#E9E5D2",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#23201A",
      secondary: "#4B473D",
    },
    error: {
      main: "#B3261E",
    },
    warning: {
      main: "#9A6700",
    },
    success: {
      main: "#2E7D32",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Liberation Sans", "Segoe UI", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: {
      fontWeight: 600,
      textTransform: "none",
      letterSpacing: 0.2,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            "radial-gradient(circle at 12% 8%, rgb(141 132 91 / 18%) 0, transparent 34%), radial-gradient(circle at 88% 14%, rgb(102 112 77 / 16%) 0, transparent 36%), linear-gradient(180deg, rgb(244 241 228 / 96%) 0%, rgb(233 229 210 / 92%) 100%)",
          backgroundAttachment: "fixed",
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: "1px solid rgba(141,132,91,0.25)",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        variant: "contained",
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          minHeight: 40,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        size: "small",
      },
    },
  },
});

export const appTheme = responsiveFontSizes(baseTheme);
