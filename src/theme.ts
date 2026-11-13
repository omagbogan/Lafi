export const colors = {
  primary: "#2C64E8",
  primaryLight: "#EFF4FF",
  primaryDark: "#1D4ED8",
  text: "#101828",
  textMuted: "#667085",
  border: "#EAECF0",
  background: "#F6F8FD",
  surface: "#F2F4F7",
  card: "#FFFFFF",
  disabled: "#D0D5DD",
  open: "#12B76A",
  openSurface: "#ECFDF3",
  whatsapp: "#1FA855",
  danger: "#F04438",
  star: "#FDB022",
  overlay: "rgba(16, 24, 40, 0.55)",
} as const;

export const shadows = {
  card: {
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  button: {
    shadowColor: "#2C64E8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  float: {
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export const radius = {
  field: 16,
  card: 22,
  squircle: 18,
  sheet: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const fonts = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
} as const;
