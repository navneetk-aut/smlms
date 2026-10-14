import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, RefreshControl,
  ActivityIndicator, FlatList, Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius, fonts } from "@/src/theme";
import { api, type Book, type Loan } from "@/src/api";
import { useAuth } from "@/src/auth-context";

function daysLeft(due: string): number {
  const d = new Date(due).getTime() - Date.now();
  return Math.ceil(d / (1000 * 60 * 60 * 24));
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [featured, setFeatured] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [f, l] = await Promise.all([api.featured(), api.myLoans("active")]);
      setFeatured(f);
      setLoans(l);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root} testID="home-screen">
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxxl * 2 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.brand}
          />
        }
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
          <View>
            <Text style={styles.greeting}>Good day,</Text>
            <Text style={styles.name}>{user?.name?.split(" ")[0] || "Reader"}</Text>
          </View>
          <Pressable
            testID="home-notifications-button"
            onPress={() => router.push("/notifications")}
            style={styles.iconBtn}
          >
            <Icon name="bell" size={20} color={colors.onSurface} />
          </Pressable>
        </View>

        {/* Active loans */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Currently borrowed</Text>
          {loans.length === 0 ? (
            <View style={styles.emptyLoan}>
              <Icon name="book-open" size={24} color={colors.muted} />
              <Text style={styles.emptyLoanText}>No active loans. Browse to borrow a book.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.md }}
            >
              {loans.map((l) => {
                const days = daysLeft(l.due_at);
                return (
                  <Pressable
                    key={l.id}
                    testID={`active-loan-${l.id}`}
                    onPress={() => l.book && router.push(`/book/${l.book.id}`)}
                    style={styles.loanCard}
                  >
                    <Image source={l.book?.cover_url} style={styles.loanCover} contentFit="cover" />
                    <View style={styles.loanInfo}>
                      <Text numberOfLines={1} style={styles.loanTitle}>{l.book?.title}</Text>
                      <Text numberOfLines={1} style={styles.loanAuthor}>{l.book?.author}</Text>
                      <View
                        style={[
                          styles.dueChip,
                          { backgroundColor: days <= 3 ? colors.warning : colors.success },
                        ]}
                      >
                        <Text style={styles.dueChipText}>
                          {days > 0 ? `${days}d left` : "Overdue"}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Featured */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending picks</Text>
            <Pressable onPress={() => router.push("/(tabs)/search")}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          <FlatList
            data={featured}
            keyExtractor={(b) => b.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.md }}
            renderItem={({ item }) => (
              <Pressable
                testID={`featured-book-${item.id}`}
                onPress={() => router.push(`/book/${item.id}`)}
                style={styles.bookCard}
              >
                <Image source={item.cover_url} style={styles.cover} contentFit="cover" />
                <Text numberOfLines={2} style={styles.bookTitle}>{item.title}</Text>
                <Text numberOfLines={1} style={styles.bookAuthor}>{item.author}</Text>
                <View style={styles.rating}>
                  <Icon name="star" size={12} color={colors.warning} />
                  <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                </View>
              </Pressable>
            )}
          />
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.actionsGrid}>
            <Pressable
              testID="action-scan"
              onPress={() => router.push("/scan")}
              style={[styles.actionCard, { backgroundColor: colors.brandPrimary }]}
            >
              <Icon name="camera" size={20} color={colors.onBrandPrimary} />
              <Text style={[styles.actionText, { color: colors.onBrandPrimary }]}>Scan QR</Text>
            </Pressable>
            <Pressable
              testID="action-search"
              onPress={() => router.push("/(tabs)/search")}
              style={[styles.actionCard, { backgroundColor: colors.brandSecondary }]}
            >
              <Icon name="search" size={20} color={colors.onBrandSecondary} />
              <Text style={[styles.actionText, { color: colors.onBrandSecondary }]}>Browse</Text>
            </Pressable>
            <Pressable
              testID="action-library"
              onPress={() => router.push("/(tabs)/library")}
              style={[styles.actionCard, { backgroundColor: colors.brandTertiary }]}
            >
              <Icon name="book-open" size={20} color={colors.onBrandTertiary} />
              <Text style={[styles.actionText, { color: colors.onBrandTertiary }]}>My shelf</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Floating QR FAB */}
      <Pressable
        testID="qr-fab"
        onPress={() => router.push("/scan")}
        style={[styles.fab, { bottom: 24 }]}
      >
        <Icon name="maximize" size={24} color={colors.onBrandPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  greeting: { fontFamily: fonts.text, color: colors.muted, fontSize: 14 },
  name: { fontFamily: fonts.display, fontSize: 28, color: colors.onSurface },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  section: { marginTop: spacing.xl },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.onSurface,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  seeAll: { color: colors.brand, fontFamily: "DMSans-Bold", fontSize: 13 },
  emptyLoan: {
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  emptyLoanText: { fontFamily: fonts.text, color: colors.muted, flex: 1, fontSize: 13 },
  loanCard: {
    width: 260,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loanCover: { width: 60, height: 90, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  loanInfo: { flex: 1, justifyContent: "space-between" },
  loanTitle: { fontFamily: "DMSans-Bold", color: colors.onSurface, fontSize: 14 },
  loanAuthor: { fontFamily: fonts.text, color: colors.muted, fontSize: 12 },
  dueChip: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  dueChipText: { color: colors.onSuccess, fontFamily: "DMSans-Bold", fontSize: 11 },
  bookCard: { width: 130 },
  cover: { width: 130, height: 190, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary },
  bookTitle: {
    fontFamily: "DMSans-Bold",
    fontSize: 13,
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  bookAuthor: { fontFamily: fonts.text, fontSize: 12, color: colors.muted, marginTop: 2 },
  rating: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.xs },
  ratingText: { fontFamily: fonts.text, fontSize: 11, color: colors.muted },
  actionsGrid: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  actionCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  actionText: { fontFamily: "DMSans-Bold", fontSize: 13 },
  fab: {
    position: "absolute",
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    ...Platform.select({
      web: { boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
});
