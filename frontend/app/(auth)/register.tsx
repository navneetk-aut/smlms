import { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius, fonts } from "@/src/theme";
import { useAuth } from "@/src/auth-context";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (name.trim().length < 2) return setError("Please enter your name");
    if (password.length < 6) return setError("Password must be at least 6 characters");
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
    } catch (e: any) {
      setError(e.message || "Could not create account");
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
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable testID="register-back" onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Create your{"\n"}library account</Text>
        <Text style={styles.subtitle}>Join your university's digital library.</Text>

        <Text style={styles.label}>Full name</Text>
        <TextInput
          testID="register-name-input"
          value={name}
          onChangeText={setName}
          placeholder="Jane Doe"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          testID="register-email-input"
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
          testID="register-password-input"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="At least 6 characters"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        {error && <Text testID="register-error" style={styles.error}>{error}</Text>}

        <Pressable
          testID="register-submit-button"
          onPress={onSubmit}
          disabled={loading}
          style={({ pressed }) => [styles.cta, { opacity: loading || pressed ? 0.85 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Text style={styles.ctaText}>Create Account</Text>
          )}
        </Pressable>

        <Pressable
          testID="register-go-login"
          onPress={() => router.replace("/(auth)/login")}
          style={styles.linkRow}
        >
          <Text style={styles.linkMuted}>Already have an account? </Text>
          <Text style={styles.link}>Sign in</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl },
  back: { alignSelf: "flex-start", marginBottom: spacing.lg },
  backText: { color: colors.brand, fontFamily: "DMSans-Bold" },
  title: { fontFamily: fonts.display, fontSize: 32, color: colors.onSurface, lineHeight: 38 },
  subtitle: {
    fontFamily: fonts.text,
    color: colors.muted,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
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
});
