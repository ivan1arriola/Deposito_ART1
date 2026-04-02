import { alpha, createTheme, responsiveFontSizes } from "@mui/material/styles";
import { appFontStack, designTokens } from "@/lib/design-tokens";

const colors = designTokens.color;
const radius = designTokens.radius;
const shadow = designTokens.shadow;

const baseTheme = createTheme({
  palette: {
    mode: "light",
    common: {
      white: colors.ejercito.white,
      black: colors.ejercito.black,
    },
    primary: {
      main: colors.ejercito.blue,
      dark: "#002B66",
      light: "#1A4E98",
      contrastText: colors.ejercito.white,
    },
    secondary: {
      main: colors.ejercito.brown,
      dark: "#382612",
      light: "#6B4F32",
      contrastText: colors.ejercito.white,
    },
    error: {
      main: colors.ejercito.red,
      contrastText: colors.ejercito.white,
    },
    warning: {
      main: colors.ejercito.gold,
      dark: "#CC9E00",
      contrastText: colors.ejercito.black,
    },
    success: {
      main: colors.ejercito.green,
      contrastText: colors.ejercito.white,
    },
    info: {
      main: colors.ejercito.lightBlue,
      contrastText: colors.ejercito.white,
    },
    background: {
      default: colors.neutral[100],
      paper: colors.neutral[0],
    },
    text: {
      primary: colors.neutral[900],
      secondary: colors.neutral[700],
    },
    divider: colors.neutral[300],
    action: {
      active: colors.neutral[700],
      hover: alpha(colors.ejercito.blue, 0.05),
      selected: alpha(colors.ejercito.blue, 0.09),
      focus: alpha(colors.ejercito.gold, 0.28),
      disabled: alpha(colors.neutral[900], 0.35),
      disabledBackground: alpha(colors.neutral[900], 0.1),
    },
  },
  shape: {
    borderRadius: radius.md,
  },
  typography: {
    fontFamily: appFontStack,
    h1: { fontWeight: designTokens.typography.weights.heavy },
    h2: { fontWeight: designTokens.typography.weights.heavy },
    h3: { fontWeight: designTokens.typography.weights.bold },
    h4: { fontWeight: designTokens.typography.weights.bold },
    h5: { fontWeight: designTokens.typography.weights.bold },
    h6: { fontWeight: designTokens.typography.weights.bold },
    button: {
      fontWeight: designTokens.typography.weights.semibold,
      textTransform: "none",
      letterSpacing: 0.1,
    },
    overline: {
      fontWeight: designTokens.typography.weights.bold,
      letterSpacing: 1,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "*, *::before, *::after": {
          boxSizing: "border-box",
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: `1px solid ${colors.neutral[300]}`,
          boxShadow: shadow.xs,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${colors.neutral[300]}`,
          boxShadow: shadow.xs,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        variant: "contained",
      },
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          minHeight: 38,
          boxShadow: "none",
          "&:focus-visible": {
            outline: `2px solid ${colors.ejercito.gold}`,
            outlineOffset: 2,
          },
        },
        containedPrimary: {
          backgroundColor: colors.ejercito.blue,
          "&:hover": {
            backgroundColor: "#002F70",
            boxShadow: "none",
          },
        },
        containedSecondary: {
          backgroundColor: colors.ejercito.brown,
          "&:hover": {
            backgroundColor: "#3F2B16",
            boxShadow: "none",
          },
        },
        containedError: {
          backgroundColor: colors.ejercito.red,
          "&:hover": {
            backgroundColor: "#B10D1C",
            boxShadow: "none",
          },
        },
        outlined: {
          borderColor: colors.neutral[400],
          color: colors.neutral[900],
          "&:hover": {
            borderColor: colors.ejercito.blue,
            backgroundColor: alpha(colors.ejercito.blue, 0.05),
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: radius.pill,
          border: `1px solid ${colors.neutral[300]}`,
          backgroundColor: colors.neutral[50],
          color: colors.neutral[900],
          fontWeight: designTokens.typography.weights.semibold,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: colors.neutral[0],
          borderRadius: radius.sm,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: colors.neutral[400],
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: colors.neutral[600],
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: colors.ejercito.blue,
            borderWidth: 2,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: colors.neutral[700],
          "&.Mui-focused": {
            color: colors.ejercito.blue,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: colors.neutral[100],
          color: colors.neutral[800],
          fontWeight: designTokens.typography.weights.bold,
          borderBottom: `1px solid ${colors.neutral[300]}`,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          fontSize: 12,
        },
        body: {
          borderBottom: `1px solid ${colors.neutral[200]}`,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          border: `1px solid ${colors.neutral[300]}`,
        },
        standardInfo: {
          backgroundColor: alpha(colors.ejercito.lightBlue, 0.12),
          color: colors.neutral[900],
        },
        standardSuccess: {
          backgroundColor: alpha(colors.ejercito.green, 0.12),
          color: colors.neutral[900],
        },
        standardWarning: {
          backgroundColor: alpha(colors.ejercito.gold, 0.18),
          color: colors.neutral[900],
        },
        standardError: {
          backgroundColor: alpha(colors.ejercito.red, 0.12),
          color: colors.neutral[900],
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: radius.lg,
          border: `1px solid ${colors.neutral[300]}`,
          boxShadow: shadow.md,
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: colors.overlay.dim,
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
