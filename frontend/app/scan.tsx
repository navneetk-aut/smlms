import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius, fonts } from "@/src/theme";
import { api } from "@/src/api";

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulate = async () => {
    setError(null);
    setScanning(true);
    try {
      // Simulate scan latency
      await new Promise((r) => setTimeout(r, 1200));
      const books = await api.listBooks({});
      if (books.length === 0) {
        setError("No books in catalog");
        return;
      }
      const pick = books[Math.floor(Math.random() * books.length)];
      router.replace(`/book/${pick.id}`);
    } catch (e: any) {
      setError(e.message || "Could not identify QR");
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={styles.root} testID="scan-screen">
      {/* Simulated camera backdrop */}
      <View style={styles.backdrop} />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable testID="scan-close" onPress={() => router.back()} style={styles.closeBtn}>
          <Icon name="x" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Scan book QR</Text>
        <View style={{ width: 42 }} />
      </View>

      <View style={styles.center}>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          {scanning && <View style={styles.scanLine} />}
        </View>
        <Text style={styles.hint}>
          Point your camera at the QR code on the book spine
        </Text>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Pressable
          testID="scan-simulate"
          onPress={simulate}
          disabled={scanning}
          style={styles.cta}
        >
          {scanning ? (
            <ActivityIndicator color={colors.onBrandPrimary} />
          ) : (
            <>
              <Icon name="camera" size={18} color={colors.onBrandPrimary} />
              <Text style={styles.ctaText}>Simulate scan</Text>
            </>
          )}
        </Pressable>
        <Text style={styles.footerHint}>
          Demo mode: tap to simulate scanning a book QR code.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0E0C0A" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#1C1B1A", opacity: 0.95 },
  header: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontFamily: "DMSans-Bold", color: colors.onSurfaceInverse, fontSize: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  frame: {
    width: 260, height: 260, position: "relative",
    borderWidth: 1, borderColor: "rgba(253,251,247,0.1)",
    borderRadius: radius.md, overflow: "hidden",
  },
  corner: { position: "absolute", width: 36, height: 36, borderColor: colors.brandSecondary },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 8 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 8 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 8 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 8 },
  scanLine: {
    position: "absolute", top: "50%", left: 0, right: 0, height: 2,
    backgroundColor: colors.brandSecondary, opacity: 0.9,
  },
  hint: {
    fontFamily: fonts.text, color: colors.onSurfaceInverse,
    opacity: 0.7, marginTop: spacing.xl, textAlign: "center",
  },
  error: { color: colors.error, fontFamily: "DMSans-Bold", marginTop: spacing.md },
  footer: { paddingHorizontal: spacing.xl, gap: spacing.md },
  cta: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 16, borderRadius: radius.pill,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm,
  },
  ctaText: { color: colors.onBrandPrimary, fontFamily: "DMSans-Bold", fontSize: 16 },
  footerHint: {
    textAlign: "center", color: colors.onSurfaceInverse,
    opacity: 0.6, fontFamily: fonts.text, fontSize: 12,
  },
});
