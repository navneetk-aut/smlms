import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius, fonts } from "@/src/theme";
import { api, type Reservation } from "@/src/api";

export default function LibrarianReservationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setItems(await api.allReservations());
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  return (
    <View style={styles.root} testID="librarian-reservations">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Reservations</Text>
        <View style={{ width: 42 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Icon name="bookmark" size={40} color={colors.muted} />
          <Text style={styles.emptyText}>No pending reservations</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + 40, gap: spacing.md }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={item.book?.cover_url} style={styles.cover} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.bookTitle} numberOfLines={2}>{item.book?.title}</Text>
                <Text style={styles.bookAuthor}>{item.book?.author}</Text>
                <View style={[styles.statusTag, { backgroundColor: item.status === "ready" ? colors.success : colors.info }]}>
                  <Text style={styles.statusText}>
                    {item.status === "ready" ? "Ready for pickup" : `Position #${item.queue_position}`}
                  </Text>
                </View>
              </View>
            </View>
          )}
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
  statusTag: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.pill, marginTop: spacing.sm,
  },
  statusText: { color: colors.onInfo, fontFamily: "DMSans-Bold", fontSize: 11 },
});
