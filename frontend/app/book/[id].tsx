import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius, fonts } from "@/src/theme";
import { api, type Book } from "@/src/api";

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = async () => {
    try {
      const b = await api.getBook(id!);
      setBook(b);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const onBorrow = async () => {
    if (!book) return;
    setActing(true);
    try {
      await api.borrow(book.id);
      Alert.alert("Borrowed!", `You've borrowed '${book.title}'. Due in 14 days.`, [
        { text: "View my shelf", onPress: () => router.replace("/(tabs)/library") },
        { text: "OK" },
      ]);
      load();
    } catch (e: any) {
      Alert.alert("Could not borrow", e.message);
    } finally {
      setActing(false);
    }
  };

  const onReserve = async () => {
    if (!book) return;
    setActing(true);
    try {
      const r = await api.reserve(book.id);
      Alert.alert(
        "Reserved",
        `You're #${r.queue_position} in the queue. We'll notify you when it's ready.`,
        [{ text: "OK" }]
      );
    } catch (e: any) {
      Alert.alert("Could not reserve", e.message);
    } finally {
      setActing(false);
    }
  };

  if (loading || !book) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  const canBorrow = book.available_copies > 0;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.hero}>
          <Image source={book.cover_url} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={30} />
          <LinearGradient
            colors={["rgba(28,27,26,0.4)", "rgba(28,27,26,0.2)", colors.surface]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroTop, { paddingTop: insets.top + spacing.md }]}>
            <Pressable testID="book-back" onPress={() => router.back()} style={styles.backBtn}>
              <Icon name="arrow-left" size={20} color={colors.onSurface} />
            </Pressable>
          </View>
          <View style={styles.heroCoverWrap}>
            <Image source={book.cover_url} style={styles.heroCover} contentFit="cover" />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>by {book.author}</Text>

          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Icon name="tag" size={11} color={colors.onBrandTertiary} />
              <Text style={styles.chipText}>{book.category}</Text>
            </View>
            <View style={styles.chip}>
              <Icon name="star" size={11} color={colors.warning} />
              <Text style={styles.chipText}>{book.rating.toFixed(1)}</Text>
            </View>
            <View
              style={[
                styles.chip,
                { backgroundColor: canBorrow ? colors.success : colors.warning },
              ]}
            >
              <Text style={[styles.chipText, { color: colors.onSuccess }]}>
                {canBorrow ? `${book.available_copies} available` : "Not available"}
              </Text>
            </View>
          </View>

          <View style={styles.meta}>
            <View style={styles.metaRow}>
              <Icon name="map-pin" size={14} color={colors.muted} />
              <Text style={styles.metaLabel}>Location</Text>
              <Text style={styles.metaValue}>{book.location}</Text>
            </View>
            {book.isbn && (
              <View style={styles.metaRow}>
                <Icon name="hash" size={14} color={colors.muted} />
                <Text style={styles.metaLabel}>ISBN</Text>
                <Text style={styles.metaValue}>{book.isbn}</Text>
              </View>
            )}
            <View style={styles.metaRow}>
              <Icon name="layers" size={14} color={colors.muted} />
              <Text style={styles.metaLabel}>Copies</Text>
              <Text style={styles.metaValue}>{book.available_copies} / {book.total_copies}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.desc}>{book.description || "No description available."}</Text>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          testID={canBorrow ? "borrow-button" : "reserve-button"}
          onPress={canBorrow ? onBorrow : onReserve}
          disabled={acting}
          style={[styles.cta, !canBorrow && { backgroundColor: colors.brandSecondary }]}
        >
          {acting ? (
            <ActivityIndicator color={colors.onBrandPrimary} />
          ) : (
            <>
              <Icon
                name={canBorrow ? "book-open" : "bookmark"}
                size={18}
                color={canBorrow ? colors.onBrandPrimary : colors.onBrandSecondary}
              />
              <Text
                style={[
                  styles.ctaText,
                  !canBorrow && { color: colors.onBrandSecondary },
                ]}
              >
                {canBorrow ? "Borrow this book" : "Reserve (join queue)"}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  hero: { height: 380, overflow: "hidden" },
  heroTop: { paddingHorizontal: spacing.xl },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  heroCoverWrap: { position: "absolute", bottom: 20, left: 0, right: 0, alignItems: "center" },
  heroCover: {
    width: 170, height: 240, borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
  },
  body: { padding: spacing.xl, marginTop: -spacing.lg },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.onSurface, lineHeight: 32 },
  author: { fontFamily: fonts.text, fontSize: 15, color: colors.muted, marginTop: spacing.xs },
  chipRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, flexWrap: "wrap" },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.pill,
  },
  chipText: { fontFamily: "DMSans-Bold", color: colors.onBrandTertiary, fontSize: 12 },
  meta: {
    marginTop: spacing.xl, padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  metaLabel: { fontFamily: fonts.text, color: colors.muted, fontSize: 13, width: 70 },
  metaValue: { fontFamily: "DMSans-Medium", color: colors.onSurface, fontSize: 13, flex: 1 },
  sectionTitle: {
    fontFamily: fonts.display, fontSize: 18, color: colors.onSurface,
    marginTop: spacing.xl, marginBottom: spacing.sm,
  },
  desc: { fontFamily: fonts.text, color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 22 },
  ctaBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, backgroundColor: colors.brandPrimary,
    paddingVertical: 16, borderRadius: radius.pill,
  },
  ctaText: { color: colors.onBrandPrimary, fontFamily: "DMSans-Bold", fontSize: 16 },
});
