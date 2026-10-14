import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, ScrollView, Pressable, FlatList,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius, fonts } from "@/src/theme";
import { api, type Book } from "@/src/api";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [cats, setCats] = useState<string[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.categories().then((c) => setCats(["All", ...c])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listBooks({
        q: q.trim() || undefined,
        category: category === "All" ? undefined : category,
      });
      setBooks(data);
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [q, category]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <View style={styles.root} testID="search-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Discover</Text>
        <View style={styles.searchRow}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            testID="search-input"
            value={q}
            onChangeText={setQ}
            placeholder="Title, author, ISBN..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
          {q.length > 0 && (
            <Pressable testID="search-clear" onPress={() => setQ("")}>
              <Icon name="x" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {cats.map((c) => {
            const sel = c === category;
            return (
              <Pressable
                key={c}
                testID={`chip-${c}`}
                onPress={() => setCategory(c)}
                style={[styles.chip, sel && styles.chipSelected]}
              >
                <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : books.length === 0 ? (
        <View style={styles.center}>
          <Icon name="book" size={40} color={colors.muted} />
          <Text style={styles.emptyText}>No books match your search.</Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingBottom: insets.bottom + 100,
            gap: spacing.md,
          }}
          renderItem={({ item }) => (
            <Pressable
              testID={`book-row-${item.id}`}
              onPress={() => router.push(`/book/${item.id}`)}
              style={styles.row}
            >
              <Image source={item.cover_url} style={styles.rowCover} contentFit="cover" />
              <View style={styles.rowInfo}>
                <Text numberOfLines={2} style={styles.rowTitle}>{item.title}</Text>
                <Text numberOfLines={1} style={styles.rowAuthor}>{item.author}</Text>
                <View style={styles.rowMeta}>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{item.category}</Text>
                  </View>
                  <View style={styles.rating}>
                    <Icon name="star" size={12} color={colors.warning} />
                    <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.availability,
                    { color: item.available_copies > 0 ? colors.success : colors.warning },
                  ]}
                >
                  {item.available_copies > 0
                    ? `${item.available_copies} available`
                    : "Reserve only"}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, backgroundColor: colors.surface },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.onSurface, marginBottom: spacing.lg },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontFamily: fonts.text, color: colors.onSurface, fontSize: 15 },
  chipRow: { gap: spacing.sm, paddingVertical: spacing.md, paddingRight: spacing.xl },
  chip: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipSelected: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontFamily: "DMSans-Medium", color: colors.onSurface, fontSize: 13 },
  chipTextSelected: { color: colors.onBrandPrimary },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  emptyText: { fontFamily: fonts.text, color: colors.muted },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowCover: { width: 70, height: 100, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  rowInfo: { flex: 1, justifyContent: "space-between" },
  rowTitle: { fontFamily: "DMSans-Bold", fontSize: 15, color: colors.onSurface },
  rowAuthor: { fontFamily: fonts.text, fontSize: 13, color: colors.muted, marginTop: 2 },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  categoryTag: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  categoryTagText: { fontFamily: "DMSans-Medium", color: colors.onBrandTertiary, fontSize: 11 },
  rating: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontFamily: fonts.text, fontSize: 11, color: colors.muted },
  availability: { fontFamily: "DMSans-Bold", fontSize: 11, marginTop: spacing.xs },
});
