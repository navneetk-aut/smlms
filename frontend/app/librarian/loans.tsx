import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius, fonts } from "@/src/theme";
import { api, type Loan } from "@/src/api";

export default function LibrarianLoansScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoans(await api.activeLoans());
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onReturn = async (l: Loan) => {
    setActing(l.id);
    try {
      await api.returnLoan(l.id);
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setActing(null);
    }
  };

  return (
    <View style={styles.root} testID="librarian-loans">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Active Loans</Text>
        <View style={{ width: 42 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : loans.length === 0 ? (
        <View style={styles.center}>
          <Icon name="inbox" size={40} color={colors.muted} />
          <Text style={styles.emptyText}>No active loans</Text>
        </View>
      ) : (
        <FlatList
          data={loans}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + 40, gap: spacing.md }}
          renderItem={({ item }) => {
            const days = Math.ceil((new Date(item.due_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <View style={styles.card}>
                <Image source={item.book?.cover_url} style={styles.cover} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookTitle} numberOfLines={2}>{item.book?.title}</Text>
                  <Text style={styles.bookAuthor}>{item.book?.author}</Text>
                  <Text style={[styles.due, { color: days <= 0 ? colors.error : days <= 3 ? colors.warning : colors.muted }]}>
                    {days > 0 ? `Due in ${days} days` : "Overdue"}
                  </Text>
                </View>
                <Pressable
                  testID={`approve-return-${item.id}`}
                  onPress={() => onReturn(item)}
                  disabled={acting === item.id}
                  style={styles.approveBtn}
                >
                  {acting === item.id ? (
                    <ActivityIndicator color={colors.onSuccess} size="small" />
                  ) : (
                    <Text style={styles.approveText}>Return</Text>
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.onSurface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  emptyText: { fontFamily: fonts.text, color: colors.muted },
  card: {
    flexDirection: "row", gap: spacing.md, alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  cover: { width: 60, height: 90, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  bookTitle: { fontFamily: "DMSans-Bold", color: colors.onSurface, fontSize: 14 },
  bookAuthor: { fontFamily: fonts.text, color: colors.muted, fontSize: 12, marginTop: 2 },
  due: { fontFamily: "DMSans-Bold", fontSize: 11, marginTop: spacing.xs },
  approveBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.pill,
  },
  approveText: { color: colors.onSuccess, fontFamily: "DMSans-Bold", fontSize: 12 },
});
