import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useSession } from "@/lib/auth/use-session";
import { useInviteInfo, useJoinBoard } from "@/lib/api/use-invite";
import { authClient } from "@/lib/auth/auth-client";
import { useInvalidateSession } from "@/lib/auth/use-session";
import { BOARD_TYPE_CONFIG, BoardType } from "@/lib/theme";

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data: boardInfo, isLoading: infoLoading, error } = useInviteInfo(code ?? "");
  const joinBoard = useJoinBoard();
  const invalidateSession = useInvalidateSession();

  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Sign-up form state (for unauthenticated users)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const config = boardInfo
    ? BOARD_TYPE_CONFIG[boardInfo.type as BoardType] ?? BOARD_TYPE_CONFIG.BIRTHDAY
    : null;

  const doJoin = async (inviteCode: string) => {
    return new Promise<string>((resolve, reject) => {
      joinBoard.mutate(inviteCode, {
        onSuccess: (result) => resolve(result.boardId),
        onError: reject,
      });
    });
  };

  const handleJoinAsLoggedIn = async () => {
    if (!code) return;
    setJoining(true);
    setJoinError(null);
    try {
      const boardId = await doJoin(code);
      router.replace(`/(app)/board/${boardId}` as any);
    } catch {
      setJoinError("Failed to join board. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  const handleSignUpAndJoin = async () => {
    if (!code || !email.trim() || password.length < 6) return;
    setAuthError(null);
    setAuthLoading(true);
    try {
      // Use email prefix as display name
      const name = email.trim().split("@")[0].replace(/[._]/g, " ");
      const result = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: name || email.trim(),
      });
      if (result.error) {
        // If email exists, try sign in instead
        if (result.error.message?.toLowerCase().includes("exist") || result.error.message?.toLowerCase().includes("already")) {
          const signInResult = await authClient.signIn.email({ email: email.trim(), password });
          if (signInResult.error) {
            setAuthError(signInResult.error.message || "Invalid email or password");
            setAuthLoading(false);
            return;
          }
        } else {
          setAuthError(result.error.message || "Failed to create account");
          setAuthLoading(false);
          return;
        }
      }
      // Refresh session
      await invalidateSession();
      // Join the board
      const boardId = await doJoin(code);
      router.replace(`/(app)/board/${boardId}` as any);
    } catch {
      setAuthError("Something went wrong. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  if (sessionLoading || infoLoading) {
    return (
      <SafeAreaView style={styles.container} testID="invite-loading">
        <ActivityIndicator size="large" color="#1a1a1a" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (error || !boardInfo) {
    return (
      <SafeAreaView style={styles.container} testID="invite-error">
        <View style={styles.errorBox}>
          <Text style={styles.errorEmoji}>🔗</Text>
          <Text style={styles.errorTitle}>Invalid invite link</Text>
          <Text style={styles.errorSubtitle}>This link may have expired or is no longer valid.</Text>
          <Pressable style={styles.backBtn} onPress={() => router.replace("/" as any)} testID="invite-back-home">
            <Text style={styles.backBtnText}>Go home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const memberText = boardInfo.memberCount === 1 ? "1 member" : `${boardInfo.memberCount} members`;
  const isLoggedIn = !!session?.user;

  return (
    <SafeAreaView style={styles.container} testID="invite-screen">
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Hero area */}
        <View style={[styles.hero, { backgroundColor: config?.bg ?? "#EEEDFE" }]}>
          <Text style={styles.heroEmoji}>{config?.emoji ?? "🎁"}</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.youreInvited}>You're invited</Text>
          <Text style={styles.boardName} numberOfLines={2}>{boardInfo.name}</Text>

          <View style={[styles.typePill, { backgroundColor: config?.bg ?? "#EEEDFE" }]}>
            <Text style={[styles.typePillText, { color: config?.text ?? "#534AB7" }]}>
              {config?.label ?? boardInfo.type}
            </Text>
          </View>

          <Text style={styles.memberCount}>
            By {boardInfo.creatorName} · {memberText}
          </Text>

          {isLoggedIn ? (
            <>
              {joinError ? (
                <Text style={styles.joinError} testID="invite-join-error">{joinError}</Text>
              ) : null}
              <Pressable
                style={[
                  styles.joinBtn,
                  { backgroundColor: config?.text ?? "#1a1a1a" },
                  joining && styles.joinBtnDisabled,
                ]}
                onPress={handleJoinAsLoggedIn}
                disabled={joining}
                testID="invite-join-button"
              >
                {joining ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.joinBtnText}>Join board</Text>
                )}
              </Pressable>
              <Text style={styles.signedInAs}>Signed in as {session?.user?.email}</Text>
            </>
          ) : (
            <>
              <View style={styles.authDivider} />
              <Text style={styles.authTitle}>Create your account to join</Text>
              <Text style={styles.authSub}>Just email and password — no profile setup needed</Text>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#AAAAAA"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="invite-email-input"
                />
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password (min 6 characters)"
                  placeholderTextColor="#AAAAAA"
                  secureTextEntry
                  testID="invite-password-input"
                />
              </View>

              {authError ? (
                <Text style={styles.joinError} testID="invite-auth-error">{authError}</Text>
              ) : null}

              <Pressable
                style={[
                  styles.joinBtn,
                  { backgroundColor: config?.text ?? "#1a1a1a" },
                  (authLoading || !email.includes("@") || password.length < 6) && styles.joinBtnDisabled,
                ]}
                onPress={handleSignUpAndJoin}
                disabled={authLoading || !email.includes("@") || password.length < 6}
                testID="invite-signup-join-button"
              >
                {authLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.joinBtnText}>Join board</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => router.push("/sign-in" as any)}
                style={styles.signInLink}
                testID="invite-signin-link"
              >
                <Text style={styles.signInLinkText}>Already have an account? Sign in</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF9F6",
  },
  scroll: {
    flexGrow: 1,
  },
  hero: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  heroEmoji: {
    fontSize: 64,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    alignItems: "center",
    gap: 10,
  },
  youreInvited: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#888888",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  boardName: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 30,
    color: "#1a1a1a",
    textAlign: "center",
    lineHeight: 36,
  },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  typePillText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
  },
  memberCount: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#888888",
    marginBottom: 4,
    textAlign: "center",
  },
  joinBtn: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  joinBtnDisabled: {
    opacity: 0.5,
  },
  joinBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  joinError: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#E02020",
    textAlign: "center",
  },
  signedInAs: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#AAAAAA",
    textAlign: "center",
  },
  authDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "#EBEBEB",
    marginVertical: 8,
  },
  authTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: "#1a1a1a",
    textAlign: "center",
  },
  authSub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#888888",
    textAlign: "center",
    marginBottom: 4,
  },
  inputWrapper: {
    width: "100%",
  },
  input: {
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    color: "#1a1a1a",
    width: "100%",
  },
  signInLink: {
    paddingVertical: 8,
  },
  signInLinkText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#666666",
    textAlign: "center",
  },
  errorBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  errorEmoji: {
    fontSize: 48,
  },
  errorTitle: {
    fontFamily: "Fraunces_700Bold_Italic",
    fontSize: 22,
    color: "#1a1a1a",
    textAlign: "center",
  },
  errorSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
  },
  backBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
  },
  backBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
});
