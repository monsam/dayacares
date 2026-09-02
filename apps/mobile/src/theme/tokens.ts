export const palette = {
  navy: "#003B70",
  navyDeep: "#0A2540",
  blue: "#0057B8",
  blueHover: "#004494",
  blueSoft: "#E8F1FB",
  paper: "#F3F7FB",
  panel: "#FFFFFF",
  white: "#FFFFFF",
  ink: "#1B2430",
  inkMuted: "#5B6775",
  line: "#D5DEE7",
  danger: "#9B1C1C",
  dangerSoft: "#FEE2E2",
  warning: "#9A3412",
  warningSoft: "#FFEDD5",
  success: "#166534",
  successSoft: "#DCFCE7",
};

export const highContrastPalette = {
  ...palette,
  paper: "#FFFFFF",
  panel: "#FFFFFF",
  ink: "#000000",
  inkMuted: "#111111",
  line: "#000000",
  blue: "#003399",
  navy: "#000000",
};

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
};

export const type = {
  /** Customer / elderly UI never drops below 18px. */
  customerMin: 18,
  body: 18,
  label: 16,
  title: 28,
  display: 34,
  button: 18,
};

/** Matches MyChart: Source Sans Pro, Calibri, Arial, sans-serif */
export const fontFamily =
  '"Source Sans 3", "Source Sans Pro", Calibri, Arial, sans-serif';

export const shadow = {
  card: {
    shadowColor: "#0A2540",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
};
