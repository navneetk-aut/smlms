import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius, fonts } from "@/src/theme";
import { api } from "@/src/api";

type Stats = {
  total_books: number;
  total_users: number;
  active_loans: number;
  pending_reservations: number;
};

export default function LibrarianDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setStats(await api.librarianStats());
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const tiles = [
    { key: "books", title: "Manage Books", icon: "book", route: "/librarian/manage-books" },
    { key: "loans", title: "Active Loans", icon: "book-open", route: "/librarian/loans" },
    { key: "reservations", title: "Reservations", icon: "bookmark", route: "/librarian/reservations" },
  ] as const;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xl,
      }}
      testID="librarian-dashboard"
    >
      <View style={styles.header}>
        <Pressable testID="librarian-back" onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Librarian</Text>
        <View style={{ width: 42 }} />
      </View>

      {loading || !stats ? (
        <View style={styles.centerCard}><ActivityIndicator color={colors.brand} /></View>
      ) : (
        <View style={styles.statsGrid}>
          <StatCard label="Books" value={stats.total_books} icon="book" />
          <StatCard label="Students" value={stats.total_users} icon="users" />
          <StatCard label="Active loans" value={stats.active_loans} icon="book-open" />
          <StatCard label="Reservations" value={stats.pending_reservations} icon="bookmark" />
        </View>
      )}

      <Text style={styles.sectionTitle}>Tools</Text>
      <View style={styles.tiles}>
        {tiles.map((t) => (
          <Pressable
            key={t.key}
            testID={`tile-${t.key}`}
            onPress={() => router.push(t.route as any)}
            style={styles.tile}
          >
            <View style={styles.tileIcon}>
              <Icon name={t.icon as any} size={20} color={colors.onBrandPrimary} />
            </View>
            <Text style={styles.tileTitle}>{t.title}</Text>
            <Icon name="chevron-right" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Icon name={icon as any} size={18} color={colors.brand} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.onSurface },
  centerCard: { padding: spacing.xxl, alignItems: "center" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  statCard: {
    width: "48%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontFamily: fonts.display, fontSize: 28, color: colors.onSurface },
  statLabel: { fontFamily: fonts.text, fontSize: 12, color: colors.muted },
  sectionTitle: {
    fontFamily: "DMSans-Bold",
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 2,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  tiles: { paddingHorizontal: spacing.xl, gap: spacing.md },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.brandPrimary,
    alignItems: "center", justifyContent: "center",
  },
  tileTitle: { flex: 1, fontFamily: "DMSans-Bold", color: colors.onSurface, fontSize: 15 },
});
