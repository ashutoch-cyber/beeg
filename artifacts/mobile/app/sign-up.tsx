import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import palette from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function SignUpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await signUp(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <View style={[styles.root, styles.successContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.logoWrap, { backgroundColor: colors.darkGreen }]}>
          <Text style={styles.logoEmoji}>🐝</Text>
        </View>
        <Feather name="check-circle" size={56} color={colors.highlightGreen} style={{ marginBottom: 16 }} />
        <Text style={[styles.successTitle, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
          Account created!
        </Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Check your email to verify your account, then sign in.
        </Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.darkGreen, marginTop: 24 }]}
          onPress={() => router.replace("/sign-in")}
        >
          <Text style={[styles.btnText, { fontFamily: "Inter_600SemiBold" }]}>Go to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.logoWrap, { backgroundColor: colors.darkGreen }]}>
          <Text style={styles.logoEmoji}>🐝</Text>
        </View>
        <Text style={[styles.brand, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>Bee</Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Your AI food tracker
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
            Create account
          </Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Free forever — no credit card needed
          </Text>

          {error && (
            <View style={[styles.errorBox, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Feather name="alert-circle" size={14} color={colors.fatRed} />
              <Text style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}>{error}</Text>
            </View>
          )}

          <View style={styles.fields}>
            <View>
              <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View>
              <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Password</Text>
              <View style={[styles.passwordWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Confirm Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.darkGreen, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.whiteTextOnGreen} />
            ) : (
              <Text style={[styles.btnText, { fontFamily: "Inter_600SemiBold" }]}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.replace("/sign-in")}>
            <Text style={[styles.footerLink, { color: colors.ctaDarkGreen, fontFamily: "Inter_600SemiBold" }]}>
              Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  successTitle: { fontSize: 26, marginBottom: 10 },
  successSub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  container: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 40 },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoEmoji: { fontSize: 36 },
  brand: { fontSize: 32, marginBottom: 4 },
  tagline: { fontSize: 14, marginBottom: 32 },
  card: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 20,
  },
  cardTitle: { fontSize: 22 },
  cardSub: { fontSize: 14, marginTop: -12 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, color: palette.light.macroFatColor, flex: 1 },
  fields: { gap: 16 },
  label: { fontSize: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  eyeBtn: { padding: 4 },
  btn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnText: { color: palette.light.whiteTextOnGreen, fontSize: 16 },
  footer: { flexDirection: "row", marginTop: 24, alignItems: "center" },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14 },
});
