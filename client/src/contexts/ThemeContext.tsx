import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "contrast" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  toggleTheme?: () => void;
  setTheme?: (theme: Theme) => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return (stored as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const root = document.documentElement;
    let effectiveTheme: "light" | "dark" = "dark";

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      effectiveTheme = systemTheme;
    } else if (theme === "contrast") {
      effectiveTheme = "dark";
    } else {
      effectiveTheme = theme;
    }

    setResolvedTheme(effectiveTheme);

    // Remove all theme classes first
    root.classList.remove("dark", "light", "contrast");
    
    // Add appropriate classes
    if (theme === "contrast") {
      root.classList.add("contrast");
    } else if (effectiveTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.add("light");
    }

    if (switchable) {
      localStorage.setItem("theme", theme);
    }
  }, [theme, switchable]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const systemTheme = e.matches ? "dark" : "light";
      setResolvedTheme(systemTheme);
      const root = document.documentElement;
      root.classList.remove("dark", "light", "contrast");
      if (systemTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.add("light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const toggleTheme = switchable
    ? () => {
        setTheme(prev => {
          if (prev === "light") return "contrast";
          if (prev === "contrast") return "dark";
          if (prev === "dark") return "system";
          return "light";
        });
      }
    : undefined;

  const setThemeDirectly = switchable
    ? (newTheme: Theme) => {
        setTheme(newTheme);
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme, setTheme: setThemeDirectly, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
