import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession, useInvalidateSession } from "@/lib/auth/use-session";
import { authClient } from "@/lib/auth/auth-client";
import { LogOut } from "lucide-react-native";

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function ProfileScreen() {
  const { data: session } = useSession();
  const invalidateSession = useInvalidateSession();
  const user = session?.user;

  const handleSignOut = async () => {
    await authClient.signOut();
    await invalidateSession();
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} testID="profile-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.signOutButton, pressed && { opacity: 0.8 }]}
          onPress={handleSignOut}
          testID="sign-out-button"
        >
          <LogOut size={18} color="#E53E3E" />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF9F6" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontFamily: "DMSans_600SemiBold", fontSize: 28, color: "#1a1a1a" },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 32, gap: 32 },
  avatarSection: { alignItems: "center", gap: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#EEEDFE", alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "DMSans_600SemiBold", fontSize: 28, color: "#534AB7" },
  userName: { fontFamily: "DMSans_600SemiBold", fontSize: 22, color: "#1a1a1a" },
  userEmail: { fontFamily: "DMSans_400Regular", fontSize: 15, color: "#888888" },
  signOutButton: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EBEBEB", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 16 },
  signOutText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: "#E53E3E" },
});
