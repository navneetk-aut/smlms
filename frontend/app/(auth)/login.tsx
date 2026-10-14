import { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius, fonts } from "@/src/theme";
import { useAuth } from "@/src/auth-context";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("student@smlms.edu");
  const [password, setPassword] = useState("Student123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Image
            source="https://images.unsplash.com/photo-1597920940566-a77511f9327d?w=1200"
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(28,27,26,0.3)", colors.surface]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroInner, { paddingTop: insets.top + spacing.xl }]}>
            <Text style={styles.brand}>SMLMS</Text>
            <Text style={styles.heroTitle}>Your university library,{"\n"}in your pocket.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue borrowing.</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            testID="login-email-input"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@university.edu"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            testID="login-password-input"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />

          {error && <Text testID="login-error" style={styles.error}>{error}</Text>}

          <Pressable
            testID="login-submit-button"
            onPress={onSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.cta,
              { opacity: loading || pressed ? 0.85 : 1 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <Text style={styles.ctaText}>Sign In</Text>
            )}
          </Pressable>

          <Pressable
            testID="login-go-register"
            onPress={() => router.push("/(auth)/register")}
            style={styles.linkRow}
          >
            <Text style={styles.linkMuted}>New here? </Text>
            <Text style={styles.link}>Create an account</Text>
          </Pressable>

          <View style={styles.hintBox}>
            <Text style={styles.hintTitle}>Demo credentials</Text>
            <Text style={styles.hintLine}>Student: student@smlms.edu / Student123!</Text>
            <Text style={styles.hintLine}>Librarian: librarian@smlms.edu / Librarian123!</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1 },
  hero: { height: 300, overflow: "hidden" },
  heroInner: { padding: spacing.xl, flex: 1, justifyContent: "space-between" },
  brand: {
    color: colors.onSurfaceInverse,
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 4,
  },
  heroTitle: {
    color: colors.onSurfaceInverse,
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 38,
  },
  card: {
    marginTop: -spacing.xl,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.onSurface },
  subtitle: {
    fontFamily: fonts.text,
    color: colors.muted,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    fontSize: 14,
  },
  label: {
    fontFamily: fonts.text,
    fontSize: 12,
    color: colors.muted,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.onSurface,
    fontFamily: fonts.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: { color: colors.error, marginTop: spacing.md, fontFamily: fonts.text },
  cta: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  ctaText: {
    color: colors.onBrandPrimary,
    fontFamily: "DMSans-Bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
  linkMuted: { color: colors.muted, fontFamily: fonts.text },
  link: { color: colors.brand, fontFamily: "DMSans-Bold" },
  hintBox: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
  },
  hintTitle: { fontFamily: "DMSans-Bold", color: colors.onBrandTertiary, marginBottom: spacing.xs },
  hintLine: { fontFamily: fonts.text, color: colors.onBrandTertiary, fontSize: 12 },
});
