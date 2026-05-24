import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession, useInvalidateSession } from "@/lib/auth/use-session";
import { authClient } from "@/lib/auth/auth-client";
import { LogOut, Trash2 } from "lucide-react-native";

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function ProfileScreen() {
  const { data: session } = useSession();
  const invalidateSession = useInvalidateSession();
  const user = session?.user;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSignOut = async () => {
    await authClient.signOut();
    await invalidateSession();
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await authClient.deleteUser();
      if (result.error) {
        setDeleteError(result.error.message ?? "Couldn't delete account. Please try again.");
        setIsDeleting(false);
        return;
      }
      await invalidateSession();
      setShowDeleteModal(false);
    } catch (e) {
      setDeleteError("Couldn't delete account. Please try again.");
      setIsDeleting(false);
    }
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
        <Pressable
          style={({ pressed }) => [styles.deleteAccountButton, pressed && { opacity: 0.8 }]}
          onPress={() => {
            setDeleteError(null);
            setShowDeleteModal(true);
          }}
          testID="delete-account-button"
        >
          <Trash2 size={18} color="#FFFFFF" />
          <Text style={styles.deleteAccountText}>Delete account</Text>
        </Pressable>
      </View>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setShowDeleteModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !isDeleting && setShowDeleteModal(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Delete account?</Text>
            <Text style={styles.modalBody}>
              This permanently deletes your account, the boards you created, and your contributions to other boards. This cannot be undone.
            </Text>
            {deleteError ? <Text style={styles.modalError}>{deleteError}</Text> : null}
            <View style={styles.modalButtonRow}>
              <Pressable
                style={({ pressed }) => [styles.modalCancelButton, pressed && { opacity: 0.7 }]}
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                testID="delete-account-cancel"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalConfirmButton,
                  pressed && { opacity: 0.8 },
                  isDeleting && { opacity: 0.6 },
                ]}
                onPress={handleDeleteAccount}
                disabled={isDeleting}
                testID="delete-account-confirm"
              >
                {isDeleting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Delete account</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  deleteAccountButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#DC2626", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 16 },
  deleteAccountText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: "#FFFFFF" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  modalCard: { width: "100%", maxWidth: 380, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, gap: 12 },
  modalTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 19, color: "#1a1a1a" },
  modalBody: { fontFamily: "DMSans_400Regular", fontSize: 15, lineHeight: 21, color: "#555555" },
  modalError: { fontFamily: "DMSans_400Regular", fontSize: 14, color: "#DC2626", marginTop: 4 },
  modalButtonRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  modalCancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: "#EBEBEB", alignItems: "center" },
  modalCancelText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: "#1a1a1a" },
  modalConfirmButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#DC2626", alignItems: "center" },
  modalConfirmText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: "#FFFFFF" },
});
