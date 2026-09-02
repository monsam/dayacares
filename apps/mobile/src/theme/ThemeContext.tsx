import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { highContrastPalette, palette } from "./tokens";

const STORAGE_KEY = "daya.highContrast";

interface ThemeContextValue {
  highContrast: boolean;
  colors: typeof palette;
  toggleHighContrast: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === "1") setHighContrast(true);
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      highContrast,
      colors: highContrast ? highContrastPalette : palette,
      toggleHighContrast: () => {
        setHighContrast((current) => {
          const next = !current;
          AsyncStorage.setItem(STORAGE_KEY, next ? "1" : "0");
          return next;
        });
      },
    }),
    [highContrast],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
