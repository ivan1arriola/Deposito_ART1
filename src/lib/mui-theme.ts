import { alpha, createTheme, responsiveFontSizes } from "@mui/material/styles";
import { appFontStack, designTokens } from "@/lib/design-tokens";

const colors = designTokens.color;
const radius = designTokens.radius;
const shadow = designTokens.shadow;

const focusRing = `0 0 0 3px ${alpha(colors.ejercito.gold, 0.42)}`;
const softPrimary = alpha(colors.ejercito.blue, 0.06);
const softerPrimary = alpha(colors.ejercito.blue, 0.035);

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
      hover: softPrimary,
      selected: alpha(colors.ejercito.blue, 0.1),
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
    h1: {
      fontWeight: designTokens.typography.weights.heavy,
      letterSpacing: "-0.025em",
      lineHeight: 1.12,
    },
    h2: {
      fontWeight: designTokens.typography.weights.heavy,
      letterSpacing: "-0.02em",
      lineHeight: 1.16,
    },
    h3: {
      fontWeight: designTokens.typography.weights.bold,
      letterSpacing: "-0.015em",
      lineHeight: 1.2,
    },
    h4: { fontWeight: designTokens.typography.weights.bold, lineHeight: 1.24 },
    h5: { fontWeight: designTokens.typography.weights.bold, lineHeight: 1.28 },
    h6: { fontWeight: designTokens.typography.weights.bold, lineHeight: 1.32 },
    body1: { lineHeight: 1.55 },
    body2: { lineHeight: 1.5 },
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
        html: {
          textRendering: "optimizeLegibility",
        },
        body: {
          minWidth: 320,
        },
        "::selection": {
          backgroundColor: alpha(colors.ejercito.gold, 0.42),
          color: colors.neutral[900],
        },
        "button, a, input, select, textarea": {
          WebkitTapHighlightColor: "transparent",
        },
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": {
            scrollBehavior: "auto !important",
            animationDuration: "0.01ms !important",
            animationIterationCount: "1 !important",
            transitionDuration: "0.01ms !important",
          },
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
          backgroundImage: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${colors.neutral[300]}`,
          borderRadius: radius.lg,
          boxShadow: shadow.xs,
          transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        variant: "contained",
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          minHeight: 40,
          paddingInline: 16,
          boxShadow: "none",
          transition: "background-color 160ms ease, border-color 160ms ease, color 160ms ease, transform 120ms ease",
          "&:focus-visible": {
            outline: "none",
            boxShadow: focusRing,
          },
          "&:active:not(:disabled)": {
            transform: "translateY(1px)",
          },
        },
        sizeSmall: {
          minHeight: 36,
          paddingInline: 12,
        },
        sizeLarge: {
          minHeight: 46,
          paddingInline: 20,
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
          backgroundColor: alpha(colors.neutral[0], 0.72),
          "&:hover": {
            borderColor: colors.ejercito.blue,
            backgroundColor: softPrimary,
          },
        },
        text: {
          "&:hover": {
            backgroundColor: softPrimary,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 40,
          minHeight: 40,
          borderRadius: radius.md,
          transition: "background-color 160ms ease, color 160ms ease, transform 120ms ease",
          "&:focus-visible": {
            outline: "none",
            boxShadow: focusRing,
          },
          "&:active:not(:disabled)": {
            transform: "scale(0.97)",
          },
        },
        sizeSmall: {
          minWidth: 36,
          minHeight: 36,
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
        clickable: {
          "&:hover": {
            backgroundColor: colors.neutral[100],
          },
          "&:focus-visible": {
            boxShadow: focusRing,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: colors.neutral[0],
          borderRadius: radius.md,
          transition: "background-color 160ms ease, box-shadow 160ms ease",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: colors.neutral[400],
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: colors.neutral[600],
          },
          "&.Mui-focused": {
            boxShadow: `0 0 0 3px ${alpha(colors.ejercito.blue, 0.1)}`,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: colors.ejercito.blue,
            borderWidth: 2,
          },
          "&.Mui-error.Mui-focused": {
            boxShadow: `0 0 0 3px ${alpha(colors.ejercito.red, 0.1)}`,
          },
        },
        input: {
          "&::placeholder": {
            color: colors.neutral[600],
            opacity: 0.9,
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
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginLeft: 2,
          marginRight: 2,
          lineHeight: 1.35,
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: radius.lg,
          border: `1px solid ${colors.neutral[300]}`,
          backgroundColor: colors.neutral[0],
          scrollbarWidth: "thin",
          overscrollBehavior: "contain",
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          minWidth: "100%",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          paddingTop: 12,
          paddingBottom: 12,
        },
        head: {
          position: "sticky",
          top: 0,
          zIndex: 1,
          backgroundColor: colors.neutral[100],
          color: colors.neutral[800],
          fontWeight: designTokens.typography.weights.bold,
          borderBottom: `1px solid ${colors.neutral[300]}`,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          fontSize: 12,
          whiteSpace: "nowrap",
        },
        body: {
          borderBottom: `1px solid ${colors.neutral[200]}`,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: "background-color 120ms ease",
          "&.MuiTableRow-hover:hover": {
            backgroundColor: softerPrimary,
          },
          "&:last-of-type td": {
            borderBottomColor: "transparent",
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          border: `1px solid ${colors.neutral[300]}`,
          alignItems: "center",
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
          borderRadius: radius.xl,
          border: `1px solid ${colors.neutral[300]}`,
          boxShadow: shadow.md,
          backgroundImage: "none",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          paddingBottom: 12,
          fontWeight: designTokens.typography.weights.bold,
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          gap: 8,
          padding: 16,
          borderTop: `1px solid ${colors.neutral[200]}`,
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: colors.overlay.dim,
          backdropFilter: "blur(2px)",
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          marginTop: 6,
          borderRadius: radius.lg,
          border: `1px solid ${colors.neutral[300]}`,
          boxShadow: shadow.md,
        },
        list: {
          padding: 6,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: radius.sm,
          marginBlock: 2,
          gap: 8,
          "&.Mui-selected": {
            backgroundColor: alpha(colors.ejercito.blue, 0.09),
          },
          "&.Mui-selected:hover": {
            backgroundColor: alpha(colors.ejercito.blue, 0.13),
          },
          "&:focus-visible": {
            outline: "none",
            boxShadow: `inset ${focusRing}`,
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          transition: "background-color 140ms ease, color 140ms ease",
          "&:focus-visible": {
            outline: "none",
            boxShadow: focusRing,
          },
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        arrow: true,
        enterDelay: 500,
      },
      styleOverrides: {
        tooltip: {
          borderRadius: radius.sm,
          padding: "7px 10px",
          fontSize: 12,
          lineHeight: 1.35,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 42,
        },
        indicator: {
          height: 3,
          borderRadius: "3px 3px 0 0",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 42,
          minWidth: 72,
          paddingInline: 14,
          textTransform: "none",
          fontWeight: designTokens.typography.weights.semibold,
          "&:focus-visible": {
            outline: "none",
            boxShadow: focusRing,
          },
        },
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          minWidth: 36,
          height: 36,
          "&:focus-visible": {
            outline: "none",
            boxShadow: focusRing,
          },
        },
      },
    },
    MuiSkeleton: {
      defaultProps: {
        animation: "wave",
      },
      styleOverrides: {
        rounded: {
          borderRadius: radius.md,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: colors.neutral[300],
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
