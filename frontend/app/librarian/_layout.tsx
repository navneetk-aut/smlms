import { Stack } from "expo-router";
import { colors } from "@/src/theme";

export default function LibrarianLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
      }}
    />
  );
}
