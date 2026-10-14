// Design tokens for SMLMS. Light theme only (editorial academic palette).

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces
  surface: "#FDFBF7",
  onSurface: "#1C1B1A",
  surfaceSecondary: "#F4EFEA",
  onSurfaceSecondary: "#1C1B1A",
  surfaceTertiary: "#EAE4DC",
  onSurfaceTertiary: "#1C1B1A",
  surfaceInverse: "#1C1B1A",
  onSurfaceInverse: "#FDFBF7",
  muted: "#73706A",

  // Brand
  brand: "#7A3B3F",
  onBrand: "#FDFBF7",
  brandPrimary: "#7A3B3F",
  onBrandPrimary: "#FDFBF7",
  brandSecondary: "#D8B888",
  onBrandSecondary: "#1C1B1A",
  brandTertiary: "#EAE0DE",
  onBrandTertiary: "#7A3B3F",

  // Status
  success: "#2E4A35",
  onSuccess: "#FDFBF7",
  warning: "#B87A24",
  onWarning: "#1C1B1A",
  error: "#962D2D",
  onError: "#FDFBF7",
  info: "#4A5D75",
  onInfo: "#FDFBF7",

  // Lines
  border: "#EAE4DC",
  borderStrong: "#C8BCB3",
  divider: "#EAE4DC",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const fonts = {
  display: "PlayfairDisplay",
  text: "DMSans",
};

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export const colors = light;

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
