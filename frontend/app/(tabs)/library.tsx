import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, FlatList,
  ActivityIndicator, Alert,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius, fonts } from "@/src/theme";
import { api, type Loan, type Reservation } from "@/src/api";

type Tab = "active" | "history" | "holds";
const TABS: { key: Tab; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "history", label: "History" },
  { key: "holds", label: "Holds" },
];

function daysLeft(due: string): number {
  const d = new Date(due).getTime() - Date.now();
  return Math.ceil(d / (1000 * 60 * 60 * 24));
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("active");
  const [loans, setLoans] = useState<Loan[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [l, r] = await Promise.all([api.myLoans(), api.myReservations()]);
      setLoans(l);
      setReservations(r);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onReturn = async (loan: Loan) => {
    setActing(loan.id);
    try {
      await api.returnLoan(loan.id);
      await load();
    } catch (e: any) {
      Alert.alert("Could not return", e.message);
    } finally {
      setActing(null);
    }
  };

  const onCancelHold = async (res: Reservation) => {
    setActing(res.id);
    try {
      await api.cancelReservation(res.id);
      await load();
    } catch (e: any) {
      Alert.alert("Could not cancel", e.message);
    } finally {
      setActing(null);
    }
  };

  const activeLoans = loans.filter((l) => l.status === "active");
  const historyLoans = loans.filter((l) => l.status !== "active");
  const activeHolds = reservations.filter((r) => r.status === "waiting" || r.status === "ready");

  const render = () => {
    if (loading) {
      return <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>;
    }
    if (tab === "active") {
      if (activeLoans.length === 0) return empty("book-open", "Your shelf is empty.", "Borrow a book to get started.");
      return (
        <FlatList
          data={activeLoans}
          keyExtractor={(l) => l.id}
          contentContainerStyle={styles.list(insets.bottom)}
          renderItem={({ item }) => {
            const days = daysLeft(item.due_at);
            return (
              <View style={styles.card}>
                <Pressable onPress={() => item.book && router.push(`/book/${item.book.id}`)} style={styles.cardMain}>
                  <Image source={item.book?.cover_url} style={styles.cover} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title} numberOfLines={2}>{item.book?.title}</Text>
                    <Text style={styles.author}>{item.book?.author}</Text>
                    <View style={[styles.dueTag, { backgroundColor: days <= 3 ? colors.warning : colors.success }]}>
                      <Icon name="clock" size={11} color={colors.onSuccess} />
                      <Text style={styles.dueTagText}>
                        {days > 0 ? `Due in ${days} days` : "Overdue"}
                      </Text>
                    </View>
                  </View>
                </Pressable>
                <Pressable
                  testID={`return-${item.id}`}
                  onPress={() => onReturn(item)}
                  disabled={acting === item.id}
                  style={styles.returnBtn}
                >
                  {acting === item.id ? (
                    <ActivityIndicator color={colors.onBrand} size="small" />
                  ) : (
                    <Text style={styles.returnText}>Return</Text>
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      );
    }
    if (tab === "history") {
      if (historyLoans.length === 0) return empty("archive", "No past loans yet.");
      return (
        <FlatList
          data={historyLoans}
          keyExtractor={(l) => l.id}
          contentContainerStyle={styles.list(insets.bottom)}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => item.book && router.push(`/book/${item.book.id}`)}
              style={styles.cardMain}
            >
              <Image source={item.book?.cover_url} style={styles.cover} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={2}>{item.book?.title}</Text>
                <Text style={styles.author}>{item.book?.author}</Text>
                <Text style={styles.returnedTag}>
                  Returned {item.returned_at ? new Date(item.returned_at).toLocaleDateString() : "—"}
                </Text>
              </View>
            </Pressable>
          )}
        />
      );
    }
    if (activeHolds.length === 0) return empty("bookmark", "No holds placed.", "Reserve unavailable books to join the queue.");
    return (
      <FlatList
        data={activeHolds}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list(insets.bottom)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable onPress={() => item.book && router.push(`/book/${item.book.id}`)} style={styles.cardMain}>
              <Image source={item.book?.cover_url} style={styles.cover} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={2}>{item.book?.title}</Text>
                <Text style={styles.author}>{item.book?.author}</Text>
                <View style={[styles.dueTag, { backgroundColor: item.status === "ready" ? colors.success : colors.info }]}>
                  <Text style={styles.dueTagText}>
                    {item.status === "ready" ? "Ready to pick up" : `Position #${item.queue_position}`}
                  </Text>
                </View>
              </View>
            </Pressable>
            <Pressable
              testID={`cancel-hold-${item.id}`}
              onPress={() => onCancelHold(item)}
              disabled={acting === item.id}
              style={[styles.returnBtn, { backgroundColor: colors.surfaceTertiary }]}
            >
              <Text style={[styles.returnText, { color: colors.onSurface }]}>Cancel</Text>
            </Pressable>
          </View>
        )}
      />
    );
  };

  return (
    <View style={styles.root} testID="library-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.pageTitle}>My Library</Text>
        <View style={styles.segment}>
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              testID={`library-tab-${t.key}`}
              onPress={() => setTab(t.key)}
              style={[styles.segmentItem, tab === t.key && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, tab === t.key && styles.segmentTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {render()}
    </View>
  );
}

function empty(icon: string, title: string, sub?: string) {
  return (
    <View style={styles.center}>
      <Icon name={icon as any} size={40} color={colors.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {sub && <Text style={styles.emptySub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  pageTitle: { fontFamily: fonts.display, fontSize: 28, color: colors.onSurface, marginBottom: spacing.lg },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentItem: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.brandPrimary },
  segmentText: { fontFamily: "DMSans-Medium", color: colors.onSurface, fontSize: 13 },
  segmentTextActive: { color: colors.onBrandPrimary },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { fontFamily: "DMSans-Bold", color: colors.onSurface, marginTop: spacing.md },
  emptySub: { fontFamily: fonts.text, color: colors.muted, textAlign: "center" },
  list: (bottom: number) => ({ paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: bottom + 100, gap: spacing.md }),
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  cardMain: { flexDirection: "row", gap: spacing.md },
  cover: { width: 70, height: 100, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  title: { fontFamily: "DMSans-Bold", fontSize: 15, color: colors.onSurface },
  author: { fontFamily: fonts.text, fontSize: 13, color: colors.muted, marginTop: 2 },
  dueTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.pill, marginTop: spacing.sm,
  },
  dueTagText: { color: colors.onSuccess, fontFamily: "DMSans-Bold", fontSize: 11 },
  returnedTag: { fontFamily: fonts.text, fontSize: 11, color: colors.muted, marginTop: spacing.sm },
  returnBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.pill,
    paddingVertical: 10,
    alignItems: "center",
  },
  returnText: { fontFamily: "DMSans-Bold", color: colors.onBrandPrimary },
});
