import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { authClient } from "@/lib/auth/auth-client";
import { useInvalidateSession } from "@/lib/auth/use-session";
import { BOARD_TYPE_CONFIG } from "@/lib/theme";

// ─── Fan of Cards (Step 0) ───────────────────────────────────────────────────

const FAN_CARDS: Array<{
  type: keyof typeof BOARD_TYPE_CONFIG;
  rotate: string;
  zIndex: number;
  translateX: number;
  translateY: number;
}> = [
  { type: "BACHELOR", rotate: "-8deg", zIndex: 1, translateX: -30, translateY: 10 },
  { type: "BIRTHDAY", rotate: "0deg", zIndex: 2, translateX: 0, translateY: -8 },
  { type: "MOVING", rotate: "8deg", zIndex: 1, translateX: 30, translateY: 10 },
];

function FanCard({
  type,
  rotate,
  zIndex,
  translateX,
  translateY,
}: (typeof FAN_CARDS)[number]) {
  const config = BOARD_TYPE_CONFIG[type];
  const label =
    type === "BACHELOR"
      ? "Bachelor"
      : type === "MOVING"
      ? "Moving"
      : "Birthday";

  return (
    <View
      style={[
        styles.fanCard,
        {
          transform: [{ rotate }, { translateX }, { translateY }],
          zIndex,
        },
      ]}
    >
      <View style={[styles.fanCardStrip, { backgroundColor: config.bg }]} />
      <View style={styles.fanCardBody}>
        <Text style={styles.fanCardLabel}>
          {config.emoji} {label}
        </Text>
        <View style={styles.fanCardLine1} />
        <View style={styles.fanCardLine2} />
      </View>
    </View>
  );
}

// ─── Progress Dots ───────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
  return (
    <View style={styles.progressDotsRow}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.progressDot,
            step === i ? styles.progressDotActive : styles.progressDotInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Step 0 — Welcome ────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} testID="onboarding-welcome-screen">
      <View style={styles.welcomeContent}>
        {/* Fan of cards illustration */}
        <View style={styles.fanContainer}>
          {FAN_CARDS.map((card) => (
            <FanCard key={card.type} {...card} />
          ))}
        </View>

        {/* App name */}
        <View style={styles.appNameRow}>
          <Text style={styles.appNameItalic}>Plannr</Text>
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>Plan together. Decide together.</Text>
      </View>

      {/* Bottom CTA */}
      <View style={styles.welcomeBottom}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && { opacity: 0.8 },
          ]}
          onPress={onNext}
          testID="get-started-button"
        >
          <Text style={styles.primaryButtonText}>Get started</Text>
        </Pressable>

        <Pressable
          style={styles.alreadyAccountLink}
          onPress={() => router.push("/sign-in")}
          testID="already-have-account-link"
        >
          <Text style={styles.alreadyAccountText}>
            I already have an account
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 1 — How it works ───────────────────────────────────────────────────

const HOW_IT_WORKS_STEPS: Array<{
  number: number;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    number: 1,
    title: "Create a board",
    description: "For any occasion — bachelor trips, birthdays, moving day",
    icon: "📋",
  },
  {
    number: 2,
    title: "Invite your group",
    description: "Collect suggestions from everyone in one place",
    icon: "👥",
  },
  {
    number: 3,
    title: "Vote and decide",
    description: "Approve the best suggestions and book together",
    icon: "✅",
  },
];

function HowItWorksStep({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <SafeAreaView style={styles.container} testID="onboarding-how-it-works-screen">
      {/* Back arrow */}
      <Pressable style={styles.backButton} onPress={onBack} testID="back-button-step1">
        <Text style={styles.backArrow}>←</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.howItWorksContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepTitle}>How it works</Text>

        <View style={styles.stepCardsList}>
          {HOW_IT_WORKS_STEPS.map((item) => (
            <View key={item.number} style={styles.stepCard}>
              <View style={styles.stepNumberCircle}>
                <Text style={styles.stepNumberText}>{item.number}</Text>
              </View>
              <View style={styles.stepCardTextArea}>
                <Text style={styles.stepCardTitle}>{item.title}</Text>
                <Text style={styles.stepCardDescription}>
                  {item.description}
                </Text>
              </View>
              <Text style={styles.stepCardIcon}>{item.icon}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom nav */}
      <View style={styles.howItWorksBottom}>
        <ProgressDots step={1} />
        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            pressed && { opacity: 0.8 },
          ]}
          onPress={onNext}
          testID="next-button-step1"
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 2 — Sign up / Sign in ──────────────────────────────────────────────

function AuthStep({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
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
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "signup" ? "signin" : "signup");
    setError(null);
  };

  return (
    <SafeAreaView style={styles.container} testID="onboarding-auth-screen">
      <Pressable style={styles.backButton} onPress={onBack} testID="back-button-step2">
        <Text style={styles.backArrow}>←</Text>
      </Pressable>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.authContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Text style={styles.authTitle}>Join Plannr</Text>
          <Text style={styles.authSubtitle}>
            {mode === "signup" ? "Create a free account" : "Welcome back"}
          </Text>

          {/* Social buttons */}
          <View style={styles.socialButtonsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.socialButtonApple,
                pressed && { opacity: 0.8 },
              ]}
              testID="apple-button"
            >
              <Text style={styles.socialButtonAppleText}> Continue with Apple</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.socialButtonGoogle,
                pressed && { opacity: 0.8 },
              ]}
              testID="google-button"
            >
              <Text style={styles.socialButtonGoogleText}>G  Continue with Google</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form */}
          <View style={styles.authForm}>
            {mode === "signup" && (
              <TextInput
                style={styles.authInput}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#AAAAAA"
                autoCapitalize="words"
                autoCorrect={false}
                testID="name-input"
              />
            )}

            <TextInput
              style={styles.authInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor="#AAAAAA"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="email-input"
            />

            <TextInput
              style={styles.authInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#AAAAAA"
              secureTextEntry
              testID="password-input"
            />

            {/* Toggle mode */}
            <Pressable onPress={toggleMode} testID="toggle-mode-button">
              <Text style={styles.toggleModeText}>
                {mode === "signup"
                  ? "Already have an account? Sign in"
                  : "New here? Create account"}
              </Text>
            </Pressable>

            {error ? (
              <Text style={styles.authError} testID="auth-error">
                {error}
              </Text>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && { opacity: 0.8 },
                loading && styles.primaryButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
              testID="submit-button"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Continue</Text>
              )}
            </Pressable>
          </View>

          {/* Terms */}
          <Text style={styles.termsText}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Root Onboarding Component ───────────────────────────────────────────────

export default function OnboardingScreen() {
  const [step, setStep] = useState<number>(0);

  const goNext = () => setStep((s) => Math.min(s + 1, 2));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  if (step === 0) {
    return <WelcomeStep onNext={goNext} />;
  }
  if (step === 1) {
    return <HowItWorksStep onBack={goBack} onNext={goNext} />;
  }
  return <AuthStep onBack={goBack} />;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF9F6",
  },

  // Welcome step
  welcomeContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  fanContainer: {
    width: 220,
    height: 140,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  fanCard: {
    position: "absolute",
    width: 160,
    height: 100,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  fanCardStrip: {
    width: "100%",
    height: 20,
  },
  fanCardBody: {
    paddingHorizontal: 10,
    paddingTop: 6,
  },
  fanCardLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    color: "#1a1a1a",
    marginBottom: 6,
  },
  fanCardLine1: {
    height: 8,
    width: "60%",
    backgroundColor: "#EBEBEB",
    borderRadius: 4,
    marginBottom: 4,
  },
  fanCardLine2: {
    height: 8,
    width: "40%",
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
  },
  appNameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 8,
  },
  appNameRegular: {
    fontFamily: "Fraunces_700Bold",
    fontSize: 36,
    color: "#1a1a1a",
  },
  appNameItalic: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 36,
    color: "#1a1a1a",
  },
  tagline: {
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    color: "#888888",
    textAlign: "center",
    marginTop: 8,
  },
  welcomeBottom: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  alreadyAccountLink: {
    alignItems: "center",
    paddingVertical: 16,
  },
  alreadyAccountText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#888888",
  },

  // How it works step
  backButton: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backArrow: {
    fontSize: 24,
    color: "#1a1a1a",
  },
  howItWorksContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  stepTitle: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 28,
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 32,
  },
  stepCardsList: {
    gap: 14,
  },
  stepCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  stepNumberCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  stepCardTextArea: {
    flex: 1,
    marginLeft: 14,
  },
  stepCardTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: "#1a1a1a",
  },
  stepCardDescription: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#888888",
    marginTop: 4,
  },
  stepCardIcon: {
    fontSize: 32,
    marginLeft: 8,
  },
  howItWorksBottom: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    gap: 16,
    alignItems: "center",
  },
  progressDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressDot: {
    height: 6,
    borderRadius: 3,
  },
  progressDotActive: {
    width: 20,
    backgroundColor: "#1a1a1a",
  },
  progressDotInactive: {
    width: 6,
    backgroundColor: "#EBEBEB",
  },
  nextButton: {
    width: "100%",
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
    color: "#FFFFFF",
  },

  // Auth step
  keyboardAvoid: {
    flex: 1,
  },
  authContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  authTitle: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 28,
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 8,
  },
  authSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    marginBottom: 28,
  },
  socialButtonsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  socialButtonApple: {
    height: 52,
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  socialButtonAppleText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: "#FFFFFF",
  },
  socialButtonGoogle: {
    height: 52,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E0DDD8",
    alignItems: "center",
    justifyContent: "center",
  },
  socialButtonGoogleText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: "#1a1a1a",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#EBEBEB",
  },
  dividerText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#AAAAAA",
  },
  authForm: {
    gap: 12,
  },
  authInput: {
    height: 52,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E0DDD8",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: "#1a1a1a",
  },
  toggleModeText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#888888",
    textAlign: "center",
    paddingVertical: 4,
  },
  authError: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#E53E3E",
    textAlign: "center",
  },
  termsText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    color: "#BBBBBB",
    textAlign: "center",
    marginTop: 24,
    paddingBottom: 24,
  },

  // Shared
  primaryButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
    color: "#FFFFFF",
  },
});
