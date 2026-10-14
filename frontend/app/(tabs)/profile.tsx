import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius, fonts } from "@/src/theme";
import { useAuth } from "@/src/auth-context";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const initials = (user?.name || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 100 }}
      testID="profile-screen"
    >
      <Text style={styles.pageTitle}>Profile</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>{user?.role === "librarian" ? "Librarian" : "Student"}</Text>
        </View>
      </View>

      {/* Digital library card */}
      <View style={styles.libraryCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.cardLabel}>LIBRARY CARD</Text>
          <Icon name="book" size={18} color={colors.onBrandPrimary} />
        </View>
        <Text style={styles.cardName}>{user?.name}</Text>
        <Text style={styles.cardId}>{user?.student_id || `ID-${user?.id.slice(0, 8).toUpperCase()}`}</Text>
        <View style={styles.barcode}>
          {Array.from({ length: 40 }).map((_, i) => (
            <View key={i} style={{ width: i % 3 === 0 ? 3 : 1, height: 36, backgroundColor: colors.onBrandPrimary }} />
          ))}
        </View>
      </View>

      {user?.role === "librarian" && (
        <Pressable
          testID="go-librarian"
          onPress={() => router.push("/librarian")}
          style={[styles.row, { backgroundColor: colors.brandSecondary }]}
        >
          <Icon name="briefcase" size={18} color={colors.onBrandSecondary} />
          <Text style={[styles.rowText, { color: colors.onBrandSecondary, fontFamily: "DMSans-Bold" }]}>
            Switch to Librarian Dashboard
          </Text>
          <Icon name="chevron-right" size={18} color={colors.onBrandSecondary} />
        </Pressable>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Pressable style={styles.row} onPress={() => router.push("/notifications")}>
          <Icon name="bell" size={18} color={colors.onSurface} />
          <Text style={styles.rowText}>Notifications</Text>
          <Icon name="chevron-right" size={18} color={colors.muted} />
        </Pressable>
        <Pressable style={styles.row} onPress={() => Alert.alert("Settings", "Coming soon")}>
          <Icon name="settings" size={18} color={colors.onSurface} />
          <Text style={styles.rowText}>Settings</Text>
          <Icon name="chevron-right" size={18} color={colors.muted} />
        </Pressable>
        <Pressable
          style={styles.row}
          onPress={() => Alert.alert("Help", "Contact your university library help desk.")}
        >
          <Icon name="help-circle" size={18} color={colors.onSurface} />
          <Text style={styles.rowText}>Help & Support</Text>
          <Icon name="chevron-right" size={18} color={colors.muted} />
        </Pressable>
      </View>

      <Pressable testID="logout-button" onPress={signOut} style={styles.logout}>
        <Icon name="log-out" size={18} color={colors.error} />
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  pageTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.onSurface,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  card: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.brandPrimary,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.display, fontSize: 32, color: colors.onBrandPrimary,
  },
  name: { fontFamily: fonts.display, fontSize: 22, color: colors.onSurface, marginTop: spacing.md },
  email: { fontFamily: fonts.text, color: colors.muted, marginTop: spacing.xs },
  roleTag: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
  },
  roleTagText: { fontFamily: "DMSans-Bold", color: colors.onBrandTertiary, fontSize: 12 },
  libraryCard: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  cardLabel: { fontFamily: "DMSans-Bold", color: colors.onBrandPrimary, fontSize: 11, letterSpacing: 2 },
  cardName: { fontFamily: fonts.display, color: colors.onBrandPrimary, fontSize: 22, marginTop: spacing.lg },
  cardId: { fontFamily: fonts.text, color: colors.onBrandPrimary, opacity: 0.8, letterSpacing: 2 },
  barcode: { flexDirection: "row", gap: 1, marginTop: spacing.md, alignItems: "flex-end" },
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.xl },
  sectionTitle: {
    fontFamily: "DMSans-Bold",
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    marginHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowText: { flex: 1, fontFamily: fonts.text, color: colors.onSurface, fontSize: 15 },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  logoutText: { fontFamily: "DMSans-Bold", color: colors.error },
});
