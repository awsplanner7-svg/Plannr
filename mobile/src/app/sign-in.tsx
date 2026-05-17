import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { authClient } from "@/lib/auth/auth-client";
import { useInvalidateSession } from "@/lib/auth/use-session";

export default function SignInScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const invalidateSession = useInvalidateSession();

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim(),
        });
        if (result.error) {
          setError(result.error.message || "Failed to create account");
        } else {
          await invalidateSession();
        }
      } else {
        const result = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (result.error) {
          setError(result.error.message || "Invalid email or password");
        } else {
          await invalidateSession();
        }
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="sign-in-screen">
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appTitle}>Plannr</Text>
          <Text style={styles.subtitle}>
            {mode === "signin" ? "Welcome back! Sign in to continue." : "Create an account to get started."}
          </Text>
        </View>

        <View style={styles.form}>
          {mode === "signup" && (
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor="#AAAAAA"
                autoCapitalize="words"
                autoCorrect={false}
                testID="name-input"
              />
            </View>
          )}

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#AAAAAA"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="email-input"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#AAAAAA"
              secureTextEntry
              testID="password-input"
            />
          </View>

          {error ? <Text style={styles.errorText} testID="auth-error">{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.8 }, loading && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            testID="submit-button"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {mode === "signin" ? "Sign in" : "Create account"}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.switchButton}
            onPress={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
            testID="switch-mode-button"
          >
            <Text style={styles.switchText}>
              {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF9F6" },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 },
  header: { marginBottom: 40 },
  appTitle: { fontFamily: "Fraunces_700Bold_Italic", fontSize: 38, color: "#1a1a1a", marginBottom: 8 },
  subtitle: { fontFamily: "DMSans_400Regular", fontSize: 16, color: "#666666", lineHeight: 24 },
  form: { gap: 16 },
  inputWrapper: { gap: 6 },
  label: { fontFamily: "DMSans_500Medium", fontSize: 14, color: "#1a1a1a" },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E0DDD8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    color: "#1a1a1a",
  },
  errorText: { fontFamily: "DMSans_400Regular", fontSize: 14, color: "#E53E3E" },
  primaryButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { fontFamily: "DMSans_600SemiBold", fontSize: 16, color: "#FFFFFF" },
  switchButton: { alignItems: "center", paddingVertical: 8 },
  switchText: { fontFamily: "DMSans_400Regular", fontSize: 14, color: "#666666" },
});
